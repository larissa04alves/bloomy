import "server-only";

import type { Db } from "@bloomy/db";
import { pushSubscription, type PushSubscription } from "@bloomy/db/schema/reminder";
import { and, eq } from "drizzle-orm";

import { ensureProfile } from "@/server/profile/service";
import { activeCycleMethod } from "@/server/cycle/service";
import { listReminders } from "@/server/reminders/service";
import { CYCLE_REMINDER_TYPES, cycleReminderApplies } from "@/server/reminders/slots";

export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** O servidor só guarda o push de quem tem motivo para recebê-lo: algum lembrete
 *  ligado ou o aviso de fim do descanso. Também garante os lembretes default (ver
 *  `saveSubscription`). */
export async function wantsPush(db: Db, userId: string): Promise<boolean> {
  const reminders = (await listReminders(db, userId)).filter((r) => r.enabled);
  if (reminders.some((r) => !CYCLE_REMINDER_TYPES.includes(r.type))) return true;
  // Com o ciclo desativado as linhas dele ficam escondidas e não disparam.
  if (reminders.length > 0) {
    const method = await activeCycleMethod(db, userId);
    if (method && reminders.some((r) => cycleReminderApplies(r.type, method))) return true;
  }
  return (await ensureProfile(db, userId)).restAlert;
}

/** Registra a subscription do aparelho. O mesmo endpoint pode reaparecer depois de
 *  reinstalar o app ou trocar de conta — daí o upsert em vez de insert puro.
 *
 *  Garante os lembretes default antes: o aparelho pode ser ativado no onboarding,
 *  antes de a pessoa abrir /notificacoes, e sem linha de `reminder` a varredura não
 *  tem o que enviar. Sem motivo (`wantsPush`) devolve `null` sem gravar — o app refaz
 *  o registro a cada abertura, e sem uso o servidor não guarda o endpoint. */
export async function saveSubscription(
  db: Db,
  userId: string,
  input: SubscriptionInput,
): Promise<PushSubscription | null> {
  if (!(await wantsPush(db, userId))) {
    // O aparelho pode ainda estar registrado em nome de outra conta (logout cujo
    // DELETE falhou): sem apagar, ele seguiria recebendo os lembretes dela.
    await dropDeadSubscription(db, input.endpoint);
    return null;
  }

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
