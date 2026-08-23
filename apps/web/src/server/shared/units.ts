import { DEFAULT_PORTION_ML } from "@/lib/api-types";

/** Porções feitas/alvo a partir de ml. Alvo mínimo 1; done nunca passa do alvo.
 *  Módulo puro (sem React, sem banco) — client-safe, como `day.ts`. */
export function portions(
  totalMl: number,
  goalMl: number,
  portionMl: number,
): { done: number; target: number } {
  // Porção 0 ou negativa viraria Infinity e quebraria o render das gotas. O zod
  // da rota já barra, mas a função é pura e reutilizável — a guarda mora aqui.
  const size = portionMl > 0 ? portionMl : DEFAULT_PORTION_ML;
  const target = Math.max(1, Math.round(goalMl / size));
  const done = Math.min(target, Math.round(totalMl / size));
  return { done, target };
}
