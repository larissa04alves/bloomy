import { afterAll, describe, expect, test } from "bun:test";

import { goal } from "@bloomy/db/schema/goals";

import { DEFAULT_GOAL_TARGETS } from "@/lib/api-types";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";

import { summarizeWorkouts, workoutSummary } from "./service";

afterAll(cleanupTestDbs);

describe("summarizeWorkouts (streak de dias, pura)", () => {
  const now = new Date("2026-07-08T12:00:00Z"); // quarta; semana começa 2026-07-06 (seg)

  test("dias consecutivos terminando hoje", () => {
    const days = ["2026-07-06", "2026-07-07", "2026-07-08"];
    const r = summarizeWorkouts(days, now);
    expect(r.weekCount).toBe(3);
    expect(r.streak).toBe(3);
    expect(r.weekDays.filter(Boolean)).toHaveLength(3);
  });

  test("não treinou hoje, mas ontem sim: streak conta até ontem (dia em curso não quebra)", () => {
    const days = ["2026-07-06", "2026-07-07"]; // hoje (08) sem treino
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(2);
  });

  test("buraco na sequência quebra o streak", () => {
    const days = ["2026-07-04", "2026-07-06", "2026-07-07", "2026-07-08"]; // 05 faltou
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(3); // 06, 07, 08
  });

  test("sem treino recente: streak zero", () => {
    const days = ["2026-07-01"];
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(0);
  });
});

/** `weekTargetFor` não é exportada, então o alvo é exercido pelo `workoutSummary`.
 *  Sem isso, o fallback do alvo default ficava sem nenhum teste — foi assim que o
 *  literal `4` sobreviveu à varredura de constantes e só apareceu na review final. */
describe("workoutSummary (alvo da semana, com banco)", () => {
  const now = new Date("2026-07-08T12:00:00Z");

  const insertWorkoutGoal = (db: Awaited<ReturnType<typeof createTestDb>>, userId: string, target: number) =>
    db.insert(goal).values({ userId, domain: "workout", target, unit: "days", period: "week" });

  test("sem meta de treino cadastrada, cai no default", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const { weekTarget } = await workoutSummary(db, userId, now);

    expect(weekTarget).toBe(DEFAULT_GOAL_TARGETS.workout);
  });

  test("com meta cadastrada, usa o alvo do usuário e não o default", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await insertWorkoutGoal(db, userId, 6);

    const { weekTarget } = await workoutSummary(db, userId, now);

    expect(weekTarget).toBe(6);
  });

  test("meta de treino de outro usuário não vaza para o resumo", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    await insertWorkoutGoal(db, other, 6);

    const { weekTarget } = await workoutSummary(db, owner, now);

    expect(weekTarget).toBe(DEFAULT_GOAL_TARGETS.workout);
  });
});
