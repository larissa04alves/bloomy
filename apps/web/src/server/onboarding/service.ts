import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { profile, type Profile } from "@bloomy/db/schema/profile";
import { eq } from "drizzle-orm";

import type { OnboardingBody } from "@/lib/api-types";

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
): Promise<{ goals: Goal[]; profile: Profile }> {
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
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profile.userId, userId))
      .returning();

    const goals = await tx.select().from(goal).where(eq(goal.userId, userId));
    return { goals, profile: updated };
  });
}
