import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { addMeal, pendingMealTypes, updateMeal } from "./service";

afterAll(cleanupTestDbs);

describe("pendingMealTypes", () => {
  test("dia vazio: café, almoço e jantar pendentes", () => {
    expect(pendingMealTypes([])).toEqual(["breakfast", "lunch", "dinner"]);
  });

  test("café e almoço feitos: falta o jantar", () => {
    expect(pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }])).toEqual(["dinner"]);
  });

  test("lanche nunca conta como pendência nem quita as principais", () => {
    expect(pendingMealTypes([{ type: "snack" }, { type: "snack" }])).toEqual([
      "breakfast",
      "lunch",
      "dinner",
    ]);
  });

  test("tudo registrado: sem pendências", () => {
    expect(
      pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }, { type: "dinner" }]),
    ).toEqual([]);
  });
});

describe("updateMeal (db em memória)", () => {
  test("atualiza type e description; parcial; outro usuário → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await addMeal(db, userId, { type: "lunch", description: "arroz" });

    const updated = await updateMeal(db, userId, created.id, {
      type: "dinner",
      description: "sopa",
    });
    expect(updated?.type).toBe("dinner");
    expect(updated?.description).toBe("sopa");

    const partial = await updateMeal(db, userId, created.id, { description: "sopa e pão" });
    expect(partial?.type).toBe("dinner");
    expect(partial?.description).toBe("sopa e pão");

    const otherUser = await createTestUser(db, "outro-user");
    expect(await updateMeal(db, otherUser, created.id, { description: "x" })).toBeNull();
  });
});
