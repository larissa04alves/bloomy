import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { goal } from "@bloomy/db/schema/goals";

import { DEFAULT_GOAL_TARGETS, type GoalDomain } from "@/lib/api-types";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { ensureGoals, updateGoal } from "./service";

afterAll(cleanupTestDbs);

describe("ensureGoals", () => {
  test("cria as 3 metas com alvo editável e nenhuma de mente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const goals = await ensureGoals(db, userId);

    expect(goals.map((g) => g.domain).sort()).toEqual(["meals", "water", "workout"]);
  });

  test("os alvos iniciais saem de DEFAULT_GOAL_TARGETS", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const goals = await ensureGoals(db, userId);
    const target = (domain: GoalDomain) => goals.find((g) => g.domain === domain)!.target;

    expect(target("water")).toBe(DEFAULT_GOAL_TARGETS.water);
    expect(target("meals")).toBe(DEFAULT_GOAL_TARGETS.meals);
    expect(target("workout")).toBe(DEFAULT_GOAL_TARGETS.workout);
  });
});

describe("updateGoal", () => {
  test("salva target dentro da faixa do domínio", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const water = (await ensureGoals(db, userId)).find((g) => g.domain === "water")!;

    const result = await updateGoal(db, userId, water.id, 3000);

    expect(result.ok).toBe(true);
    expect(result.ok && result.goal.target).toBe(3000);
  });

  test("recusa target fora da faixa e não grava", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const meals = (await ensureGoals(db, userId)).find((g) => g.domain === "meals")!;

    expect(await updateGoal(db, userId, meals.id, 90)).toEqual({
      ok: false,
      reason: "out_of_range",
    });

    const [row] = await db.select().from(goal).where(eq(goal.id, meals.id));
    expect(row.target).toBe(3);
  });

  test("meta de outro usuário responde not_found, sem revelar que existe", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    const water = (await ensureGoals(db, owner)).find((g) => g.domain === "water")!;

    expect(await updateGoal(db, other, water.id, 2500)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  test("id inexistente responde not_found", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await updateGoal(db, userId, "nao-existe", 2500)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
