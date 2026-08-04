import "server-only";

import type { Db } from "@bloomy/db";
import { weightLog, type WeightLog } from "@bloomy/db/schema/health";
import { and, desc, eq } from "drizzle-orm";

/** Erro de domínio: mover uma pesagem para um dia que já tem registro. */
export type WeightConflict = "day_taken";

export async function listWeights(db: Db, userId: string): Promise<WeightLog[]> {
  return db
    .select()
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(desc(weightLog.day));
}

/** Uma pesagem por (usuário, dia): registrar de novo no mesmo dia substitui o valor. */
export async function upsertWeight(
  db: Db,
  userId: string,
  input: { day: string; grams: number },
): Promise<WeightLog> {
  const [row] = await db
    .insert(weightLog)
    .values({ userId, day: input.day, grams: input.grams })
    .onConflictDoUpdate({
      target: [weightLog.userId, weightLog.day],
      set: { grams: input.grams, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/**
 * Edita valor e/ou dia. Mover para um dia já ocupado sobrescreveria outro registro
 * silenciosamente — por isso recusa com `"day_taken"` em vez de fazer upsert.
 */
export async function updateWeight(
  db: Db,
  userId: string,
  id: string,
  input: { day?: string; grams?: number },
): Promise<WeightLog | null | WeightConflict> {
  const [current] = await db
    .select()
    .from(weightLog)
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)));
  if (!current) return null;

  const day = input.day ?? current.day;
  if (day !== current.day) {
    const [taken] = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), eq(weightLog.day, day)));
    if (taken) return "day_taken";
  }

  const [row] = await db
    .update(weightLog)
    .set({ day, grams: input.grams ?? current.grams, updatedAt: new Date() })
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
    .returning();
  return row;
}

export async function deleteWeight(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(weightLog)
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
    .returning();
  return rows.length > 0;
}
