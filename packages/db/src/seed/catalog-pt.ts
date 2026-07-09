import type { Focus } from "./muscle-group";
import data from "./catalog-pt.json";

/**
 * Curadoria PT-BR do catálogo: `id → { namePt, group }`.
 * Gerado do dataset omercotkd/exercises-gifs (commit ebf642c); traduções PT
 * e grupo (via mapMuscleGroup) revisáveis à mão. `id 0609` (sem GIF) dropado.
 */
export const CATALOG_PT = data as Record<string, { namePt: string; group: Focus }>;
