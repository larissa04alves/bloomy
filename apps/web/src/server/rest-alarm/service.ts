import "server-only";

import type { Db } from "@bloomy/db";
import { pushSubscription, type PushSubscription } from "@bloomy/db/schema/reminder";
import { restAlarm } from "@bloomy/db/schema/workout";
import { and, eq } from "drizzle-orm";

import { ensureProfile } from "@/server/profile/service";
import { dropDeadSubscription } from "@/server/push/service";

/** Quem agenda e cancela a entrega na hora do fim (o QStash, em produção). Entra por
 *  parâmetro para o serviço ser testável sem rede. */
export type RestScheduler = {
  /** Agenda o callback para `endsAt` e devolve o id da mensagem. */
  publish(input: { userId: string; endsAt: Date }): Promise<string>;
  cancel(messageId: string): Promise<void>;
};

/** Envia o push de fim do descanso para um aparelho. */
export type RestPushSender = (sub: PushSubscription) => Promise<"sent" | "gone" | "failed">;

async function currentAlarm(db: Db, userId: string) {
  const [row] = await db.select().from(restAlarm).where(eq(restAlarm.userId, userId));
  return row ?? null;
}

/** Cancelar é melhor-esforço: se a mensagem já saiu, quem barra o push velho é a
 *  checagem de `messageId` em `fireRestAlarm`. */
async function cancelQuietly(scheduler: RestScheduler, messageId: string): Promise<void> {
  try {
    await scheduler.cancel(messageId);
  } catch {
    // ver comentário acima: falha aqui não muda o resultado
  }
}

/** Começa ou reajusta o descanso: troca a mensagem agendada e guarda a vigente. */
export async function scheduleRestAlarm(
  db: Db,
  scheduler: RestScheduler,
  userId: string,
  input: { endsAt: Date; endpoint: string },
): Promise<"scheduled" | "disabled" | "no_subscription"> {
  if (!(await ensureProfile(db, userId)).restAlert) return "disabled";

  const [device] = await db
    .select({ endpoint: pushSubscription.endpoint })
    .from(pushSubscription)
    .where(
      and(eq(pushSubscription.userId, userId), eq(pushSubscription.endpoint, input.endpoint)),
    );
  if (!device) return "no_subscription";

  const previous = await currentAlarm(db, userId);
  if (previous) await cancelQuietly(scheduler, previous.messageId);

  const messageId = await scheduler.publish({ userId, endsAt: input.endsAt });
  const now = new Date();
  await db
    .insert(restAlarm)
    .values({ userId, messageId, endpoint: input.endpoint, endsAt: input.endsAt })
    .onConflictDoUpdate({
      target: restAlarm.userId,
      set: { messageId, endpoint: input.endpoint, endsAt: input.endsAt, updatedAt: now },
    });
  return "scheduled";
}

/** Descanso pulado, sessão concluída: nada deve chegar. */
export async function cancelRestAlarm(
  db: Db,
  scheduler: RestScheduler,
  userId: string,
): Promise<void> {
  const previous = await currentAlarm(db, userId);
  if (!previous) return;
  await cancelQuietly(scheduler, previous.messageId);
  await db.delete(restAlarm).where(eq(restAlarm.userId, userId));
}

/** Callback na hora do fim. Só a mensagem vigente envia; qualquer outra é de um
 *  descanso já pulado ou reajustado. */
export async function fireRestAlarm(
  db: Db,
  send: RestPushSender,
  input: { userId: string; messageId: string },
): Promise<"sent" | "stale" | "gone" | "failed"> {
  const alarm = await currentAlarm(db, input.userId);
  if (!alarm || alarm.messageId !== input.messageId) return "stale";

  await db.delete(restAlarm).where(eq(restAlarm.userId, input.userId));

  const [device] = await db
    .select()
    .from(pushSubscription)
    .where(
      and(
        eq(pushSubscription.userId, input.userId),
        eq(pushSubscription.endpoint, alarm.endpoint),
      ),
    );
  if (!device) return "gone";

  const result = await send(device);
  if (result === "gone") await dropDeadSubscription(db, device.endpoint);
  return result;
}
