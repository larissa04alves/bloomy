import { afterAll, describe, expect, test } from "bun:test";

import { createTestDb, cleanupTestDbs } from "@/server/shared/test-db";
import { exerciseCatalog } from "@bloomy/db/schema/workout";

import { listCatalog } from "./catalog";

afterAll(cleanupTestDbs);

describe("listCatalog", () => {
  test("retorna o catálogo inteiro mapeado p/ CatalogExercise", async () => {
    const db = await createTestDb();
    await db.insert(exerciseCatalog).values({
      id: "0025",
      name: "barbell bench press",
      namePt: "Supino reto com barra",
      group: "chest",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "barbell",
      secondaryMuscles: ["triceps", "shoulders"],
    });
    const list = await listCatalog(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: "0025",
      namePt: "Supino reto com barra",
      group: "chest",
      secondaryMuscles: ["triceps", "shoulders"],
    });
    expect(list[0]).not.toHaveProperty("createdAt");
  });
});
