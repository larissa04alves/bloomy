import { GARRAFA_ML } from "@/lib/api-types";

/** Garrafas feitas/alvo a partir de ml. Alvo mínimo 1; done nunca passa do alvo.
 *  Módulo puro (sem React) para ser testável sob `--conditions react-server`. */
export function garrafas(totalMl: number, goalMl: number): { done: number; target: number } {
  const target = Math.max(1, Math.round(goalMl / GARRAFA_ML));
  const done = Math.min(target, Math.round(totalMl / GARRAFA_ML));
  return { done, target };
}
