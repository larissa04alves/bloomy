import "server-only";

import { asc } from "drizzle-orm";

import type { Db } from "@bloomy/db";
import { exerciseCatalog } from "@bloomy/db/schema/workout";

import type { CatalogExercise } from "@/lib/api-types";

export async function listCatalog(db: Db): Promise<CatalogExercise[]> {
  const rows = await db.select().from(exerciseCatalog).orderBy(asc(exerciseCatalog.namePt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    namePt: r.namePt,
    group: r.group,
    bodyPart: r.bodyPart,
    target: r.target,
    secondaryMuscles: r.secondaryMuscles,
  }));
}
