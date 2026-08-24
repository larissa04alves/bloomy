import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { goal } from "@bloomy/db/schema/goals";

import { DEFAULT_GOAL_TARGETS, type OnboardingBody } from "@/lib/api-types";
import { ensureGoals } from "@/server/goals/service";
import { ensureProfile } from "@/server/profile/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";

import { completeOnboarding, isOnboarded } from "./service";

afterAll(cleanupTestDbs);

const INPUT: OnboardingBody = { waterMl: 2500, portionMl: 250, meals: 4, workoutDays: 5 };

const targetOf = (goals: { domain: string; target: number }[], domain: string) =>
  goals.find((g) => g.domain === domain)!.target;

/** Desembrulha o resultado nos testes do caminho feliz — falha alto se vier recusa. */
async function complete(
  db: Awaited<ReturnType<typeof createTestDb>>,
  userId: string,
  input: OnboardingBody = INPUT,
) {
  const result = await completeOnboarding(db, userId, input);
  if (!result.ok) throw new Error(`esperava sucesso, veio ${result.reason}`);
  return result;
}

describe("isOnboarded", () => {
  test("sem linha de profile conta como pendente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await isOnboarded(db, userId)).toBe(false);
  });

  test("profile criado mas nunca concluído segue pendente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureProfile(db, userId);

    expect(await isOnboarded(db, userId)).toBe(false);
  });

  test("depois de completeOnboarding fica concluído", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await completeOnboarding(db, userId, INPUT);

    expect(await isOnboarded(db, userId)).toBe(true);
  });
});

describe("completeOnboarding", () => {
  test("cria as 3 metas, grava a porção e marca a conclusão", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const { goals, profile } = await complete(db, userId);

    expect(goals.map((g) => g.domain).sort()).toEqual(["meals", "water", "workout"]);
    expect(targetOf(goals, "water")).toBe(2500);
    expect(targetOf(goals, "meals")).toBe(4);
    expect(targetOf(goals, "workout")).toBe(5);
    expect(profile.waterPortionMl).toBe(250);
    expect(profile.onboardingCompletedAt).not.toBeNull();
  });

  test("sobrescreve metas já criadas pelo ensureGoals sem violar o UNIQUE", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureGoals(db, userId); // já existem 2000/3/4

    const { goals } = await complete(db, userId);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
    expect(targetOf(goals, "workout")).toBe(5);
  });

  test("segunda chamada é idempotente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await completeOnboarding(db, userId, INPUT);

    const { goals } = await complete(db, userId);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
  });

  test("não toca nas metas de outro usuário", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    await ensureGoals(db, other);

    await complete(db, owner);

    const rows = await db.select().from(goal).where(eq(goal.userId, other));
    expect(targetOf(rows, "water")).toBe(DEFAULT_GOAL_TARGETS.water);
    expect(await isOnboarded(db, other)).toBe(false);
  });

  test("recusa alvo fora da faixa sem persistir nada", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const result = await completeOnboarding(db, userId, { ...INPUT, waterMl: 90000 });

    expect(result).toEqual({ ok: false, reason: "out_of_range" });
    const rows = await db.select().from(goal).where(eq(goal.userId, userId));
    expect(rows).toHaveLength(0);
    expect(await isOnboarded(db, userId)).toBe(false);
  });

  test("recusa porção fora da faixa", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const result = await completeOnboarding(db, userId, { ...INPUT, portionMl: 1 });

    expect(result).toEqual({ ok: false, reason: "out_of_range" });
  });

  test("recusa valor quebrado (o serviço não depende do zod da rota)", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const result = await completeOnboarding(db, userId, { ...INPUT, meals: 3.5 });

    expect(result).toEqual({ ok: false, reason: "out_of_range" });
  });
});
