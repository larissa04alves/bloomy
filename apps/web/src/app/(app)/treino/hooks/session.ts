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

/** Exercício concluído: tem ao menos uma série e todas estão feitas. */
export function isExerciseDone(ex: SessionExercise): boolean {
  return ex.sets.length > 0 && ex.sets.every((s) => s.done);
}

/** Nº de exercícios com todas as séries feitas. */
export function completedExercises(exercises: SessionExercise[]): number {
  return exercises.filter(isExerciseDone).length;
}
