import type { WorkoutCard } from "@/lib/api-types";

/** FNV-1a 32 bits: determinístico, estável entre execuções e processos —
 *  ao contrário de qualquer coisa baseada em Math.random(). */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Treino sorteado do dia: mesmo par (usuária, dia) sempre dá o mesmo treino,
 *  então o card não troca a cada refresh. Lista vazia → null. */
export function pickWorkoutOfDay<T>(workouts: T[], userId: string, day: string): T | null {
  if (workouts.length === 0) return null;
  return workouts[hash(`${userId}:${day}`) % workouts.length]!;
}

/** Estado do card de Treino. Precedência: sessão aberta > concluída hoje > sorteio. */
export function workoutCard({
  workouts,
  activeWorkoutId,
  completed,
  userId,
  day,
}: {
  workouts: { id: string; name: string }[];
  activeWorkoutId: string | null;
  completed: { workoutId: string; name: string } | null;
  userId: string;
  day: string;
}): WorkoutCard {
  if (activeWorkoutId) {
    // Treino desativado no meio da sessão sai de `workouts` — mesmo fallback da tela Treino.
    const name = workouts.find((w) => w.id === activeWorkoutId)?.name ?? "Treino";
    return { state: "active", id: activeWorkoutId, name };
  }
  if (completed) return { state: "done", name: completed.name };

  const picked = pickWorkoutOfDay(workouts, userId, day);
  if (!picked) return { state: "none" };
  return { state: "suggested", id: picked.id, name: picked.name };
}
