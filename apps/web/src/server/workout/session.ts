import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  sessionExercise,
  setLog,
  workout,
  workoutSession,
  type SessionExerciseRow,
  type SetLog,
  type WorkoutSession,
} from "@bloomy/db/schema/workout";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, max } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

import { workoutSummary, type WorkoutWithExercises } from "./service";

export type SessionExercise = {
  id: string; // linha de session_exercise (é por aqui que a UI age)
  exerciseId: string | null; // origem no template; null = só desta sessão
  name: string;
  targetSets: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  origin: "template" | "added" | "replaced";
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: SessionExercise[];
};

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
  preRows?: SessionExerciseRow[],
): Promise<SessionDetail> {
  // reusa as linhas já inseridas (startSession) ou busca — evita um round-trip
  const rows =
    preRows ??
    (await db
      .select()
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id))
      .orderBy(asc(sessionExercise.position)));

  const sets = await db
    .select()
    .from(setLog)
    .where(eq(setLog.sessionId, session.id))
    .orderBy(asc(setLog.setIndex));

  const detail = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      exerciseId: row.exerciseId,
      name: row.name,
      targetSets: row.targetSets,
      restSeconds: row.restSeconds,
      position: row.position,
      catalogId: row.catalogId,
      origin: row.origin,
      sets: sets.filter((s) => s.sessionExerciseId === row.id),
      lastPerformance: perfByName?.has(row.name)
        ? (perfByName.get(row.name) ?? null)
        : await lastPerformance(db, userId, row.name),
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

  // pré-computa o último treino de cada exercício (por nome) em paralelo antes da
  // transação — 1 lote concorrente em vez de N round-trips sequenciais
  const uniqueNames = [...new Set(exercises.map((e) => e.name))];
  const perfByName: PerfCache = new Map(
    await Promise.all(
      uniqueNames.map(async (name) => [name, await lastPerformance(db, userId, name)] as const),
    ),
  );

  const { session, rows } = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(workoutSession)
      .values({ userId, workoutId, day: dayFor() })
      .returning();

    // snapshot do template: a lista do dia passa a pertencer à sessão
    const rows = exercises.length
      ? await tx
          .insert(sessionExercise)
          .values(
            exercises.map((ex) => ({
              sessionId: s.id,
              userId,
              exerciseId: ex.id,
              name: ex.name,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
              position: ex.position,
              catalogId: ex.catalogId,
              muscleGroup: ex.muscleGroup,
              origin: "template" as const,
            })),
          )
          .returning()
      : [];

    // um único insert com todas as séries de todos os exercícios
    const setRows = rows.flatMap((row) => {
      const last = perfByName.get(row.name) ?? null;
      return Array.from({ length: row.targetSets }, (_, i) => ({
        sessionId: s.id,
        sessionExerciseId: row.id,
        exerciseId: row.exerciseId,
        userId,
        exerciseName: row.name,
        setIndex: i + 1,
        reps: last?.reps ?? row.targetReps, // sem histórico → reps-alvo do template
        load: last?.load ?? null,
        done: false,
      }));
    });
    if (setRows.length) await tx.insert(setLog).values(setRows);
    return { session: s, rows };
  });

  return buildSessionDetail(db, session, userId, perfByName, rows);
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

export type SessionAdjustments = {
  added: number;
  replaced: number;
  removed: number;
  /** true quando os exercícios herdados do template estão em ordem diferente da dele. */
  reordered: boolean;
};

/** Diferença entre a lista da sessão e o template. `removed`: itens do template ausentes. */
export async function sessionAdjustments(
  db: Db,
  session: WorkoutSession,
): Promise<SessionAdjustments> {
  const [rows, templateRows] = await Promise.all([
    db
      .select({ exerciseId: sessionExercise.exerciseId, origin: sessionExercise.origin })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id))
      .orderBy(asc(sessionExercise.position)),
    db
      .select({ id: exercise.id })
      .from(exercise)
      .where(eq(exercise.workoutId, session.workoutId))
      .orderBy(asc(exercise.position)),
  ]);

  const kept = new Set(rows.flatMap((r) => (r.exerciseId ? [r.exerciseId] : [])));
  // Compara só os itens herdados do template, dos dois lados: exercício adicionado no dia
  // (sem par no template) ou removido deslocaria a comparação sem ninguém ter reordenado.
  const sessionOrder = rows.flatMap((r) => (r.exerciseId ? [r.exerciseId] : []));
  const templateOrder = templateRows.flatMap((t) => (kept.has(t.id) ? [t.id] : []));

  return {
    added: rows.filter((r) => r.origin === "added").length,
    replaced: rows.filter((r) => r.origin === "replaced").length,
    removed: templateRows.filter((t) => !kept.has(t.id)).length,
    reordered: sessionOrder.some((id, i) => id !== templateOrder[i]),
  };
}

export async function completeSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<{
  completedAt: Date;
  durationSec: number;
  exerciseCount: number;
  adjustments: SessionAdjustments;
  summary: Awaited<ReturnType<typeof workoutSummary>>;
} | null> {
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

  // count, resumo da semana e ajustes em paralelo; o summary já enxerga esta sessão (completedAt gravado acima)
  const [exCount, summary, adjustments] = await Promise.all([
    db
      .select({ n: count() })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id)),
    workoutSummary(db, userId, completedAt),
    sessionAdjustments(db, session),
  ]);

  const durationSec = Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000);
  return { completedAt, durationSec, exerciseCount: exCount[0].n, adjustments, summary };
}

export type SessionExerciseInput = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  catalogId?: string | null;
  muscleGroup?: SessionExerciseRow["muscleGroup"];
};

/** Sessão em andamento do usuário, por id. Null = 404 (inexistente, alheia ou concluída). */
async function activeSessionById(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<WorkoutSession | null> {
  const [s] = await db
    .select()
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.id, sessionId),
        eq(workoutSession.userId, userId),
        isNull(workoutSession.completedAt),
      ),
    );
  return s ?? null;
}

/** Mesmo exercício: por `catalogId` quando ambos têm, senão por nome normalizado. */
function isSameExercise(
  a: { catalogId: string | null; name: string },
  b: { catalogId?: string | null; name: string },
): boolean {
  if (a.catalogId && b.catalogId) return a.catalogId === b.catalogId;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

/** Séries de um exercício da sessão, pré-preenchidas com o último desempenho do nome. */
function buildSetRows(
  sessionId: string,
  userId: string,
  row: { id: string; name: string; targetSets: number; targetReps: number },
  last: { reps: number | null; load: number | null } | null,
) {
  return Array.from({ length: row.targetSets }, (_, i) => ({
    sessionId,
    sessionExerciseId: row.id,
    exerciseId: null,
    userId,
    exerciseName: row.name,
    setIndex: i + 1,
    reps: last?.reps ?? row.targetReps,
    load: last?.load ?? null,
    done: false,
  }));
}

export async function addSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  input: SessionExerciseInput,
): Promise<SessionDetail | "duplicate" | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const [last, [{ maxPosition }]] = await Promise.all([
    lastPerformance(db, userId, input.name),
    db
      .select({ maxPosition: max(sessionExercise.position) })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, sessionId)),
  ]);

  const result = await db.transaction(async (tx) => {
    // re-checagem atômica: completeSession pode ter concluído a sessão desde o guard externo
    const [live] = await tx
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.id, sessionId),
          eq(workoutSession.userId, userId),
          isNull(workoutSession.completedAt),
        ),
      );
    if (!live) return null;

    const existing = await tx
      .select({ catalogId: sessionExercise.catalogId, name: sessionExercise.name })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, sessionId));
    if (existing.some((row) => isSameExercise(row, input))) return "duplicate";

    const [row] = await tx
      .insert(sessionExercise)
      .values({
        sessionId,
        userId,
        exerciseId: null, // não existe no template
        name: input.name,
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        restSeconds: input.restSeconds,
        position: (maxPosition ?? -1) + 1,
        catalogId: input.catalogId ?? null,
        muscleGroup: input.catalogId ? null : (input.muscleGroup ?? null),
        origin: "added",
      })
      .returning();
    await tx.insert(setLog).values(buildSetRows(sessionId, userId, row, last));
    return true;
  });
  if (result === null) return null;
  if (result === "duplicate") return "duplicate";

  return buildSessionDetail(db, session, userId);
}

export async function swapSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  input: SessionExerciseInput,
): Promise<{ session: SessionDetail; discardedDoneSets: number } | "duplicate" | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const [current] = await db
    .select()
    .from(sessionExercise)
    .where(
      and(
        eq(sessionExercise.id, sessionExerciseId),
        eq(sessionExercise.sessionId, sessionId),
        eq(sessionExercise.userId, userId),
      ),
    );
  if (!current) return null;

  const [last, [{ n: discardedDoneSets }]] = await Promise.all([
    lastPerformance(db, userId, input.name),
    db
      .select({ n: count() })
      .from(setLog)
      .where(and(eq(setLog.sessionExerciseId, sessionExerciseId), eq(setLog.done, true))),
  ]);

  const result = await db.transaction(async (tx) => {
    // re-checagem atômica: completeSession pode ter concluído a sessão desde o guard externo
    const [live] = await tx
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.id, sessionId),
          eq(workoutSession.userId, userId),
          isNull(workoutSession.completedAt),
        ),
      );
    if (!live) return null;

    const existing = await tx
      .select({
        id: sessionExercise.id,
        catalogId: sessionExercise.catalogId,
        name: sessionExercise.name,
      })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, sessionId));
    if (existing.some((row) => row.id !== sessionExerciseId && isSameExercise(row, input))) {
      return "duplicate";
    }

    // delete explícito: o enforcement de FK não é garantido no libsql
    await tx.delete(setLog).where(eq(setLog.sessionExerciseId, sessionExerciseId));
    // exerciseId permanece: é o slot do template, e é ele que o "salvar no treino" atualiza
    await tx
      .update(sessionExercise)
      .set({
        name: input.name,
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        restSeconds: input.restSeconds,
        catalogId: input.catalogId ?? null,
        muscleGroup: input.catalogId ? null : (input.muscleGroup ?? null),
        origin: "replaced",
      })
      .where(eq(sessionExercise.id, sessionExerciseId));
    await tx.insert(setLog).values(
      buildSetRows(
        sessionId,
        userId,
        { ...input, id: sessionExerciseId },
        last,
      ),
    );
    return true;
  });
  if (result === null) return null;
  if (result === "duplicate") return "duplicate";

  return { session: await buildSessionDetail(db, session, userId), discardedDoneSets };
}

export async function removeSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<SessionDetail | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const removed = await db.transaction(async (tx) => {
    // re-checagem atômica: completeSession pode ter concluído a sessão desde o guard externo
    const [live] = await tx
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.id, sessionId),
          eq(workoutSession.userId, userId),
          isNull(workoutSession.completedAt),
        ),
      );
    if (!live) return false;

    // delete explícito e ANTES do pai: sem cascade real, e o FK entre set_log e
    // session_exercise é enforçado neste driver — apagar o pai primeiro quebraria a constraint
    await tx.delete(setLog).where(eq(setLog.sessionExerciseId, sessionExerciseId));
    const deleted = await tx
      .delete(sessionExercise)
      .where(
        and(
          eq(sessionExercise.id, sessionExerciseId),
          eq(sessionExercise.sessionId, sessionId),
          eq(sessionExercise.userId, userId),
        ),
      )
      .returning();
    return deleted.length > 0;
  });
  if (!removed) return null;

  return buildSessionDetail(db, session, userId);
}

/**
 * Reordena os exercícios da sessão. `ids` tem que ser permutação exata dos exercícios
 * atuais — isso impede um cliente com estado velho de sumir com ou duplicar uma linha.
 */
export async function reorderSessionExercises(
  db: Db,
  userId: string,
  sessionId: string,
  ids: string[],
): Promise<SessionDetail | "mismatch" | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const result = await db.transaction(async (tx) => {
    // re-checagem atômica: completeSession pode ter concluído a sessão desde o guard externo
    const [live] = await tx
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.id, sessionId),
          eq(workoutSession.userId, userId),
          isNull(workoutSession.completedAt),
        ),
      );
    if (!live) return null;

    // busca DENTRO da tx: evita a race em que um id some entre o guard externo e o update
    const rows = await tx
      .select({ id: sessionExercise.id })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, sessionId));

    const current = new Set(rows.map((r) => r.id));
    const received = new Set(ids);
    // Set descarta repetição: comparar os três tamanhos cobre faltando, extra e duplicado.
    if (received.size !== ids.length || received.size !== current.size) return "mismatch";
    if (ids.some((id) => !current.has(id))) return "mismatch";

    for (const [i, id] of ids.entries()) {
      await tx
        .update(sessionExercise)
        .set({ position: i })
        .where(
          and(
            eq(sessionExercise.id, id),
            eq(sessionExercise.sessionId, sessionId),
            eq(sessionExercise.userId, userId),
          ),
        );
    }
    return true;
  });
  if (result === null) return null;
  if (result === "mismatch") return "mismatch";

  return buildSessionDetail(db, session, userId);
}

/** Aplica os ajustes da sessão (concluída ou não) de volta no template. */
export async function applySessionToWorkout(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<WorkoutWithExercises | null> {
  const [session] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.id, sessionId), eq(workoutSession.userId, userId)));
  if (!session) return null;

  const rows = await db
    .select()
    .from(sessionExercise)
    .where(eq(sessionExercise.sessionId, sessionId))
    .orderBy(asc(sessionExercise.position));

  return db.transaction(async (tx) => {
    const [w] = await tx
      .select()
      .from(workout)
      .where(and(eq(workout.id, session.workoutId), eq(workout.userId, userId)));
    if (!w) return null;

    // update pontual em vez de replace-all: replace-all zeraria set_log.exercise_id
    // das sessões antigas (onDelete: "set null")
    const kept = new Set<string>();
    for (const [i, row] of rows.entries()) {
      const values = {
        name: row.name,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        restSeconds: row.restSeconds,
        position: i,
        catalogId: row.catalogId,
        muscleGroup: row.muscleGroup,
      };
      if (row.exerciseId) {
        await tx.update(exercise).set(values).where(eq(exercise.id, row.exerciseId));
        kept.add(row.exerciseId);
      } else {
        const [created] = await tx
          .insert(exercise)
          .values({ ...values, workoutId: w.id, userId })
          .returning();
        // liga a linha da sessão ao exercício criado: torna a chamada idempotente
        await tx
          .update(sessionExercise)
          .set({ exerciseId: created.id })
          .where(eq(sessionExercise.id, row.id));
        kept.add(created.id);
      }
    }

    const current = await tx
      .select({ id: exercise.id })
      .from(exercise)
      .where(eq(exercise.workoutId, w.id));
    const stale = current.filter((e) => !kept.has(e.id)).map((e) => e.id);
    if (stale.length) await tx.delete(exercise).where(inArray(exercise.id, stale));

    const [updatedWorkout] = await tx
      .update(workout)
      .set({ updatedAt: new Date() })
      .where(eq(workout.id, w.id))
      .returning();

    const exercises = await tx
      .select()
      .from(exercise)
      .where(eq(exercise.workoutId, w.id))
      .orderBy(asc(exercise.position));
    return { ...updatedWorkout, exercises };
  });
}
