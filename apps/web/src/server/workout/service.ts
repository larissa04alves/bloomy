import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  workout,
  workoutSession,
  type Exercise,
  type Workout,
} from "@bloomy/db/schema/workout";
import { goal } from "@bloomy/db/schema/goals";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import { DEFAULT_GOAL_TARGETS } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

export type Focus = Workout["focus"];

export type ExerciseInput = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  position: number;
  catalogId?: string | null;
  muscleGroup?: Focus | null;
};
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
      targetReps: e.targetReps,
      restSeconds: e.restSeconds,
      position: e.position,
      catalogId: e.catalogId ?? null,
      muscleGroup: e.catalogId ? null : (e.muscleGroup ?? null),
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
        targetReps: e.targetReps,
        restSeconds: e.restSeconds,
        position: e.position,
        catalogId: e.catalogId ?? null,
        muscleGroup: e.catalogId ? null : (e.muscleGroup ?? null),
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

/**
 * Resumo da semana + streak. Pura para testar isolada.
 * `weekDays`: 7 bools (seg..dom) da semana corrente.
 * `streak`: dias consecutivos com treino terminando hoje (ou ontem, se hoje
 *   ainda não treinou — o dia em curso não quebra o streak).
 */
export function summarizeWorkouts(
  days: string[],
  now: Date,
): { weekCount: number; streak: number; weekDays: boolean[] } {
  const weekStart = mondayOf(dayFor(now));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
  const daySet = new Set(days);
  const weekDays = weekDates.map((d) => daySet.has(d));
  const weekCount = weekDays.filter(Boolean).length;

  const today = dayFor(now);
  let cursor = daySet.has(today) ? today : addDaysStr(today, -1);
  let streak = 0;
  while (daySet.has(cursor)) {
    streak += 1;
    cursor = addDaysStr(cursor, -1);
  }

  return { weekCount, streak, weekDays };
}

async function weekTargetFor(db: Db, userId: string): Promise<number> {
  const [g] = await db
    .select({ target: goal.target })
    .from(goal)
    .where(and(eq(goal.userId, userId), eq(goal.domain, "workout")));
  return g?.target ?? DEFAULT_GOAL_TARGETS.workout;
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

  return { weekTarget, ...summarizeWorkouts(sessions.map((s) => s.day), now) };
}
