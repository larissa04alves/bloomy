import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { dayFor } from "@/server/shared/day";
import { addMeal, getMealsDay, pendingMealTypes, updateMeal } from "./service";

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
  test("atualiza type e items; parcial mantém items; outro usuário → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await addMeal(db, userId, {
      type: "lunch",
      items: [{ name: "arroz", grams: 150 }],
    });

    const updated = await updateMeal(db, userId, created.id, {
      type: "dinner",
      items: [{ name: "sopa", grams: null }],
    });
    expect(updated?.type).toBe("dinner");
    expect(updated?.items).toEqual([{ name: "sopa", grams: null }]);

    const partial = await updateMeal(db, userId, created.id, { type: "snack" });
    expect(partial?.type).toBe("snack");
    expect(partial?.items).toEqual([{ name: "sopa", grams: null }]);

    const otherUser = await createTestUser(db, "outro-user");
    expect(await updateMeal(db, otherUser, created.id, { type: "lunch" })).toBeNull();
  });
});

describe("addMeal (db em memória)", () => {
  test("addMeal guarda itens com e sem gramas", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const items = [
      { name: "Arroz", grams: 150 },
      { name: "Feijão", grams: null },
    ];
    await addMeal(db, userId, { type: "lunch", items });

    const { meals } = await getMealsDay(db, userId, dayFor());
    expect(meals).toHaveLength(1);
    expect(meals[0]?.items).toEqual(items);
  });
});
