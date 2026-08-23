import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { and, eq } from "drizzle-orm";

export const DEFAULT_GOALS = [
  { domain: "water", target: 2000, unit: "ml", period: "day" },
  { domain: "meals", target: 3, unit: "count", period: "day" },
  { domain: "workout", target: 4, unit: "days", period: "week" },
] as const;

export const GOAL_LIMITS = {
  water: { min: 500, max: 5000, step: 100 },
  meals: { min: 1, max: 8, step: 1 },
  workout: { min: 1, max: 7, step: 1 },
} as const;

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

export type UpdateGoalResult =
  | { ok: true; goal: Goal }
  | { ok: false; reason: "not_found" | "out_of_range" };

/**
 * Atualiza o alvo validando contra a faixa do domínio. A validação mora aqui, e
 * não no zod da rota, porque a faixa depende do domínio — e o handler só recebe
 * um `id`, sem saber de qual meta se trata antes de ler a linha.
 */
export async function updateGoal(
  db: Db,
  userId: string,
  goalId: string,
  target: number,
): Promise<UpdateGoalResult> {
  const [current] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)));

  // Meta de outro usuário também cai aqui: 404 em vez de 403 não revela que existe.
  if (!current) return { ok: false, reason: "not_found" };

  const limits = GOAL_LIMITS[current.domain];
  if (target < limits.min || target > limits.max) {
    return { ok: false, reason: "out_of_range" };
  }

  const [updated] = await db
    .update(goal)
    .set({ target, updatedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)))
    .returning();

  return { ok: true, goal: updated };
}
