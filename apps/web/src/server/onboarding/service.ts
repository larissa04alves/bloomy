import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { weightLog } from "@bloomy/db/schema/health";
import { profile, type Profile } from "@bloomy/db/schema/profile";
import { eq } from "drizzle-orm";

import type { OnboardingBody } from "@/lib/api-types";
import { GOAL_LIMITS } from "@/server/goals/service";
import { BIRTH_DATE_MIN, HEIGHT_CM_LIMITS, WEIGHT_GRAMS_LIMITS } from "@/lib/body";
import { PORTION_LIMITS } from "@/server/profile/service";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";

export type CompleteOnboardingResult =
  | { ok: true; goals: Goal[]; profile: Profile }
  | { ok: false; reason: "out_of_range" };

/** Faixa de cada campo. Mora no serviço, não só no zod da rota: o serviço é o dono
 *  da regra (ADR-0001), e qualquer chamada server-side futura passa por aqui antes
 *  de persistir. Checa inteiro também — sem depender do zod ter passado antes. */
function withinLimits(input: OnboardingBody): boolean {
  const within = (value: number, min: number, max: number) =>
    Number.isInteger(value) && value >= min && value <= max;

  // Dados do corpo são opcionais: ausente passa, presente tem que caber na faixa.
  const optional = (value: number | undefined, min: number, max: number) =>
    value === undefined || within(value, min, max);
  const birthOk =
    input.birthDate === undefined ||
    (DAY_SCHEMA.safeParse(input.birthDate).success &&
      input.birthDate >= BIRTH_DATE_MIN &&
      input.birthDate <= dayFor());

  return (
    within(input.waterMl, GOAL_LIMITS.water.min, GOAL_LIMITS.water.max) &&
    within(input.portionMl, PORTION_LIMITS.min, PORTION_LIMITS.max) &&
    within(input.meals, GOAL_LIMITS.meals.min, GOAL_LIMITS.meals.max) &&
    within(input.workoutDays, GOAL_LIMITS.workout.min, GOAL_LIMITS.workout.max) &&
    optional(input.heightCm, HEIGHT_CM_LIMITS.min, HEIGHT_CM_LIMITS.max) &&
    optional(input.weightGrams, WEIGHT_GRAMS_LIMITS.min, WEIGHT_GRAMS_LIMITS.max) &&
    birthOk
  );
}

export async function isOnboarded(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ completedAt: profile.onboardingCompletedAt })
    .from(profile)
    .where(eq(profile.userId, userId));

  return row?.completedAt != null;
}

export async function completeOnboarding(
  db: Db,
  userId: string,
  input: OnboardingBody,
): Promise<CompleteOnboardingResult> {
  // Antes da transação: fora da faixa não abre escrita nenhuma.
  if (!withinLimits(input)) return { ok: false, reason: "out_of_range" };

  const now = new Date();
  const rows = [
    { domain: "water", target: input.waterMl, unit: "ml", period: "day" },
    { domain: "meals", target: input.meals, unit: "count", period: "day" },
    {
      domain: "workout",
      target: input.workoutDays,
      unit: "days",
      period: "week",
    },
  ] as const;

  return db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(goal)
        .values({ ...row, userId })
        .onConflictDoUpdate({
          target: [goal.userId, goal.domain],
          set: { target: row.target, updatedAt: now },
        });
    }

    await tx.insert(profile).values({ userId }).onConflictDoNothing();
    const [updated] = await tx
      .update(profile)
      .set({
        waterPortionMl: input.portionMl,
        ...(input.heightCm !== undefined && { heightCm: input.heightCm }),
        ...(input.birthDate !== undefined && { birthDate: input.birthDate }),
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profile.userId, userId))
      .returning();

    // Mesmo upsert de `upsertWeight`, mas dentro da transação: o onboarding grava
    // tudo ou nada.
    if (input.weightGrams !== undefined) {
      await tx
        .insert(weightLog)
        .values({ userId, day: dayFor(now), grams: input.weightGrams })
        .onConflictDoUpdate({
          target: [weightLog.userId, weightLog.day],
          set: { grams: input.weightGrams, updatedAt: now },
        });
    }

    const goals = await tx.select().from(goal).where(eq(goal.userId, userId));
    return { ok: true as const, goals, profile: updated };
  });
}
