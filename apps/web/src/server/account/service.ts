import "server-only";

import type { Db } from "@bloomy/db";
import { user } from "@bloomy/db/schema/auth";
import { exam } from "@bloomy/db/schema/health";
import { and, eq, isNotNull } from "drizzle-orm";

import type { ExamStorage } from "@/server/health/r2";

/** R2 antes do banco: o cascade não chega lá (ADR-0003), e se o R2 falhar o banco ainda
 *  guarda as chaves para repetir (`DeleteObject` é idempotente). */
export async function deleteAccount(db: Db, storage: ExamStorage, userId: string): Promise<void> {
  const rows = await db
    .select({ key: exam.attachmentKey })
    .from(exam)
    .where(and(eq(exam.userId, userId), isNotNull(exam.attachmentKey)));

  await Promise.all(rows.map((r) => storage.delete(r.key!)));

  await db.delete(user).where(eq(user.id, userId));
}
