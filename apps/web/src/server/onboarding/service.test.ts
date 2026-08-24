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

    const { goals, profile } = await completeOnboarding(db, userId, INPUT);

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

    const { goals } = await completeOnboarding(db, userId, INPUT);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
    expect(targetOf(goals, "workout")).toBe(5);
  });

  test("segunda chamada é idempotente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await completeOnboarding(db, userId, INPUT);

    const { goals } = await completeOnboarding(db, userId, INPUT);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
  });

  test("não toca nas metas de outro usuário", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    await ensureGoals(db, other);

    await completeOnboarding(db, owner, INPUT);

    const rows = await db.select().from(goal).where(eq(goal.userId, other));
    expect(targetOf(rows, "water")).toBe(DEFAULT_GOAL_TARGETS.water);
    expect(await isOnboarded(db, other)).toBe(false);
  });
});
