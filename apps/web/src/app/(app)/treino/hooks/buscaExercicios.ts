import Fuse from "fuse.js";

import type { CatalogExercise, Focus } from "@/lib/api-types";

export function buildFuse(list: CatalogExercise[]): Fuse<CatalogExercise> {
  return new Fuse(list, {
    keys: [
      { name: "namePt", weight: 2 },
      { name: "name", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    ignoreDiacritics: true,
    minMatchCharLength: 2,
  });
}

/** Filtra por grupo (exato) e busca (fuzzy). Query vazia → lista filtrada por grupo. */
export function searchExercises(
  fuse: Fuse<CatalogExercise>,
  list: CatalogExercise[],
  { q, group }: { q: string; group: Focus | null },
): CatalogExercise[] {
  const base = q.trim().length >= 2 ? fuse.search(q.trim()).map((r) => r.item) : list;
  return group ? base.filter((e) => e.group === group) : base;
}
