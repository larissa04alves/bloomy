import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { and, eq } from "drizzle-orm";

export const DEFAULT_GOALS = [
  { domain: "water", target: 2000, unit: "ml", period: "day" },
  { domain: "meals", target: 3, unit: "count", period: "day" },
  { domain: "workout", target: 4, unit: "days", period: "week" },
  { domain: "mind", target: 1, unit: "count", period: "day" },
] as const;

/** Garante as metas default do usuário e retorna todas as ativas. */
export async function ensureGoals(db: Db, userId: string): Promise<Goal[]> {
  const existing = await db.select().from(goal).where(eq(goal.userId, userId));
  const missing = DEFAULT_GOALS.filter(
    (d) => !existing.some((g) => g.domain === d.domain),
  );

  if (missing.length > 0) {
    // onConflictDoNothing: dois GETs concorrentes no 1º acesso não podem estourar o UNIQUE(user_id, domain)
    await db
      .insert(goal)
      .values(missing.map((d) => ({ ...d, userId })))
      .onConflictDoNothing();
    return db.select().from(goal).where(eq(goal.userId, userId));
  }

  return existing;
}

export async function updateGoal(
  db: Db,
  userId: string,
  goalId: string,
  target: number,
): Promise<Goal | null> {
  const [updated] = await db
    .update(goal)
    .set({ target, updatedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)))
    .returning();

  return updated ?? null;
}
