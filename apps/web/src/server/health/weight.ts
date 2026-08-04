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
 * `weight_log_user_day_idx` violado: outro registro já ocupa esse (usuário, dia).
 * O drizzle embrulha o erro do libsql num `DrizzleQueryError` cuja mensagem é só
 * o SQL — a do SQLite fica no `cause`, daí percorrer a cadeia.
 *
 * Exportado só para o teste: reconhecer essa forma de erro é o que separa 409 de 500,
 * e chegar nela por corrida real não é determinístico.
 */
export function isDayTakenError(error: unknown): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if (/UNIQUE constraint failed: weight_log\./i.test(e.message)) return true;
  }
  return false;
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

  // A consulta acima e o UPDATE não são um passo só: duas edições simultâneas
  // para o mesmo dia podem passar as duas pela checagem. Quem perde bate no
  // índice único (a integridade é dele, não da checagem) — traduzir aqui é o
  // que mantém a resposta em 409 em vez de virar erro genérico na rota.
  try {
    const [row] = await db
      .update(weightLog)
      .set({ day, grams: input.grams ?? current.grams, updatedAt: new Date() })
      .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
      .returning();
    return row;
  } catch (error) {
    if (isDayTakenError(error)) return "day_taken";
    throw error;
  }
}

export async function deleteWeight(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(weightLog)
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
    .returning();
  return rows.length > 0;
}
