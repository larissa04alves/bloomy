import type { SessionExercise, SetLog } from "@/lib/api-types";

/** Nº de séries concluídas de um exercício. */
export function doneCount(ex: SessionExercise): number {
  return ex.sets.filter((s) => s.done).length;
}

/** Aplica um patch a uma série (imutável) — base do update otimista. */
export function applySetPatch(
  exercises: SessionExercise[],
  setId: string,
  patch: Partial<Pick<SetLog, "reps" | "load" | "done">>,
): SessionExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }));
}

/** Nº de exercícios com todas as séries feitas. */
export function completedExercises(exercises: SessionExercise[]): number {
  return exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length;
}
