import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  setLog,
  workout,
  workoutSession,
  type Exercise,
  type SetLog,
  type Workout,
  type WorkoutSession,
} from "@bloomy/db/schema/workout";
import { goal } from "@bloomy/db/schema/goals";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

export type Focus = Workout["focus"];

export type ExerciseInput = { name: string; targetSets: number; position: number };
export type WorkoutInput = { name: string; focus: Focus; exercises: ExerciseInput[] };
export type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export async function listWorkouts(
  db: Db,
  userId: string,
): Promise<WorkoutWithExercises[]> {
  const workouts = await db
    .select()
    .from(workout)
    .where(and(eq(workout.userId, userId), eq(workout.active, true)))
    .orderBy(asc(workout.createdAt));
  if (workouts.length === 0) return [];

  const exercises = await db
    .select()
    .from(exercise)
    .where(inArray(exercise.workoutId, workouts.map((w) => w.id)))
    .orderBy(asc(exercise.position));

  return workouts.map((w) => ({
    ...w,
    exercises: exercises.filter((e) => e.workoutId === w.id),
  }));
}

export async function createWorkout(
  db: Db,
  userId: string,
  input: WorkoutInput,
): Promise<WorkoutWithExercises> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workout)
      .values({ userId, name: input.name, focus: input.focus })
      .returning();

    const rows = input.exercises.map((e) => ({
      workoutId: created.id,
      userId,
      name: e.name,
      targetSets: e.targetSets,
      position: e.position,
    }));
    const exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];

    return { ...created, exercises };
  });
}

/** Edita o template. Se `exercises` vier, faz replace-all (add/remove/reorder). */
export async function updateWorkout(
  db: Db,
  userId: string,
  id: string,
  input: Partial<WorkoutInput>,
): Promise<WorkoutWithExercises | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(workout)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.focus !== undefined && { focus: input.focus }),
        updatedAt: new Date(),
      })
      .where(and(eq(workout.id, id), eq(workout.userId, userId)))
      .returning();
    if (!updated) return null;

    let exercises: Exercise[];
    if (input.exercises !== undefined) {
      await tx.delete(exercise).where(eq(exercise.workoutId, id));
      const rows = input.exercises.map((e) => ({
        workoutId: id,
        userId,
        name: e.name,
        targetSets: e.targetSets,
        position: e.position,
      }));
      exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];
    } else {
      exercises = await tx
        .select()
        .from(exercise)
        .where(eq(exercise.workoutId, id))
        .orderBy(asc(exercise.position));
    }

    return { ...updated, exercises };
  });
}

export async function deactivateWorkout(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const updated = await db
    .update(workout)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning();
  return updated.length > 0;
}

export type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  position: number;
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: SessionExercise[];
};

/** Segunda-feira (YYYY-MM-DD) da semana de um dia — semana ISO seg–dom. */
function mondayOf(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0=dom..6=sáb
  date.setUTCDate(date.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return date.toISOString().slice(0, 10);
}

function addDaysStr(dayStr: string, n: number): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** Último treino do exercício (por nome): sobrevive a edições de template. */
export async function lastPerformance(
  db: Db,
  userId: string,
  exerciseName: string,
): Promise<{ reps: number | null; load: number | null } | null> {
  const [row] = await db
    .select({ reps: setLog.reps, load: setLog.load })
    .from(setLog)
    .innerJoin(workoutSession, eq(setLog.sessionId, workoutSession.id))
    .where(
      and(
        eq(setLog.userId, userId),
        eq(setLog.exerciseName, exerciseName),
        eq(setLog.done, true),
        isNotNull(setLog.load),
        isNotNull(workoutSession.completedAt),
      ),
    )
    .orderBy(desc(workoutSession.completedAt), asc(setLog.setIndex))
    .limit(1);
  return row ?? null;
}

type PerfCache = Map<string, { reps: number | null; load: number | null } | null>;

async function buildSessionDetail(
  db: Db,
  session: WorkoutSession,
  userId: string,
  perfByName?: PerfCache,
): Promise<SessionDetail> {
  const exercises = await db
    .select()
    .from(exercise)
    .where(eq(exercise.workoutId, session.workoutId))
    .orderBy(asc(exercise.position));

  const sets = await db
    .select()
    .from(setLog)
    .where(eq(setLog.sessionId, session.id))
    .orderBy(asc(setLog.setIndex));

  // reusa o cache pré-computado (startSession) ou busca em paralelo (evita N+1 sequencial)
  const detail = await Promise.all(
    exercises.map(async (ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      targetSets: ex.targetSets,
      position: ex.position,
      sets: sets.filter((s) => s.exerciseId === ex.id),
      lastPerformance: perfByName?.has(ex.name)
        ? (perfByName.get(ex.name) ?? null)
        : await lastPerformance(db, userId, ex.name),
    })),
  );
  return { session, exercises: detail };
}

/** Inicia uma sessão: 1 ativa por vez; pré-preenche séries com o último treino. */
export async function startSession(
  db: Db,
  userId: string,
  workoutId: string,
): Promise<SessionDetail | "already_active" | "not_found"> {
  const [active] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNull(workoutSession.completedAt)));
  if (active) return "already_active";

  const [w] = await db
    .select()
    .from(workout)
    .where(
      and(eq(workout.id, workoutId), eq(workout.userId, userId), eq(workout.active, true)),
    );
  if (!w) return "not_found";

  const exercises = await db
    .select()
    .from(exercise)
    .where(eq(exercise.workoutId, workoutId))
    .orderBy(asc(exercise.position));

  // pré-computa o último treino de cada exercício antes da transação (evita atrito tx/db)
  const perfByName: PerfCache = new Map();
  for (const ex of exercises) {
    if (!perfByName.has(ex.name)) {
      perfByName.set(ex.name, await lastPerformance(db, userId, ex.name));
    }
  }

  const session = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(workoutSession)
      .values({ userId, workoutId, day: dayFor() })
      .returning();

    for (const ex of exercises) {
      const last = perfByName.get(ex.name) ?? null;
      const rows = Array.from({ length: ex.targetSets }, (_, i) => ({
        sessionId: s.id,
        exerciseId: ex.id,
        userId,
        exerciseName: ex.name,
        setIndex: i + 1,
        reps: last?.reps ?? null,
        load: last?.load ?? null,
        done: false,
      }));
      if (rows.length) await tx.insert(setLog).values(rows);
    }
    return s;
  });

  return buildSessionDetail(db, session, userId, perfByName);
}

export async function getActiveSession(
  db: Db,
  userId: string,
): Promise<SessionDetail | null> {
  const [active] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNull(workoutSession.completedAt)));
  if (!active) return null;
  return buildSessionDetail(db, active, userId);
}

export async function updateSet(
  db: Db,
  userId: string,
  sessionId: string,
  setId: string,
  input: { reps?: number; load?: number; done?: boolean },
): Promise<SetLog | null> {
  const [updated] = await db
    .update(setLog)
    .set({
      ...(input.reps !== undefined && { reps: input.reps }),
      ...(input.load !== undefined && { load: input.load }),
      ...(input.done !== undefined && {
        done: input.done,
        doneAt: input.done ? new Date() : null,
      }),
    })
    .where(
      and(
        eq(setLog.id, setId),
        eq(setLog.sessionId, sessionId),
        eq(setLog.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function completeSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<{ completedAt: Date; durationSec: number; exerciseCount: number } | null> {
  const completedAt = new Date();
  // update atômico: só conclui se ainda estava em andamento — double-tap perde a corrida e recebe null
  const [session] = await db
    .update(workoutSession)
    .set({ completedAt })
    .where(
      and(
        eq(workoutSession.id, sessionId),
        eq(workoutSession.userId, userId),
        isNull(workoutSession.completedAt),
      ),
    )
    .returning();
  if (!session) return null;

  const exercises = await db
    .select({ id: exercise.id })
    .from(exercise)
    .where(eq(exercise.workoutId, session.workoutId));

  const durationSec = Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000);
  return { completedAt, durationSec, exerciseCount: exercises.length };
}

/**
 * Resumo da semana + streak. Pura para testar isolada.
 * `weekDays`: 7 bools (seg..dom) da semana corrente.
 * `streak`: semanas fechadas consecutivas com nº de dias ativos >= meta;
 *   a semana corrente soma ao streak quando já bateu a meta (celebra), e nunca o quebra.
 */
export function summarizeWorkouts(
  days: string[],
  target: number,
  now: Date,
): { weekCount: number; streak: number; weekDays: boolean[] } {
  const weekStart = mondayOf(dayFor(now));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
  const daySet = new Set(days);
  const weekDays = weekDates.map((d) => daySet.has(d));
  const weekCount = weekDays.filter(Boolean).length;

  const perWeek = new Map<string, Set<string>>();
  for (const d of days) {
    const wk = mondayOf(d);
    if (!perWeek.has(wk)) perWeek.set(wk, new Set());
    perWeek.get(wk)!.add(d);
  }

  let streak = 0;
  let cursor = addDaysStr(weekStart, -7);
  while ((perWeek.get(cursor)?.size ?? 0) >= target) {
    streak += 1;
    cursor = addDaysStr(cursor, -7);
  }
  if (weekCount >= target) streak += 1;

  return { weekCount, streak, weekDays };
}

async function weekTargetFor(db: Db, userId: string): Promise<number> {
  const [g] = await db
    .select({ target: goal.target })
    .from(goal)
    .where(and(eq(goal.userId, userId), eq(goal.domain, "workout")));
  return g?.target ?? 4;
}

export async function workoutSummary(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<{ weekCount: number; weekTarget: number; streak: number; weekDays: boolean[] }> {
  const weekTarget = await weekTargetFor(db, userId);
  const sessions = await db
    .select({ day: workoutSession.day })
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNotNull(workoutSession.completedAt)));

  return { weekTarget, ...summarizeWorkouts(sessions.map((s) => s.day), weekTarget, now) };
}
