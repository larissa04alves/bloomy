import "server-only";

import type { Db } from "@bloomy/db";
import { pushSubscription, type PushSubscription } from "@bloomy/db/schema/reminder";
import { and, eq } from "drizzle-orm";

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Registra a subscription do aparelho. O mesmo endpoint pode reaparecer depois de
 *  reinstalar o app ou trocar de conta — daí o upsert em vez de insert puro. */
export async function saveSubscription(
  db: Db,
  userId: string,
  input: SubscriptionInput,
): Promise<PushSubscription> {
  const [row] = await db
    .insert(pushSubscription)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId, p256dh: input.p256dh, auth: input.auth },
    })
    .returning();
  return row;
}

export async function listSubscriptions(
  db: Db,
  userId: string,
): Promise<PushSubscription[]> {
  return db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId));
}

/** Remove a subscription deste aparelho (a pessoa desligou tudo na tela). */
export async function removeSubscription(
  db: Db,
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const deleted = await db
    .delete(pushSubscription)
    .where(
      and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, endpoint)),
    )
    .returning();
  return deleted.length > 0;
}

/** Apaga uma subscription morta, sem checar dono: quem chama é o envio, que
 *  acabou de receber 404/410 do push service — o endpoint não existe mais em
 *  lugar nenhum e manter a linha só faria a próxima varredura falhar de novo. */
export async function dropDeadSubscription(db: Db, endpoint: string): Promise<void> {
  await db.delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
}
