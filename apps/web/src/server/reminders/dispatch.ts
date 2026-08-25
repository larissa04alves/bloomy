import "server-only";

import type { Db } from "@bloomy/db";
import { medication, medicationIntake, waterLog } from "@bloomy/db/schema/body";
import { goal } from "@bloomy/db/schema/goals";
import { appointment, exam } from "@bloomy/db/schema/health";
import { moodCheckin } from "@bloomy/db/schema/mind";
import {
  pushSubscription,
  reminder,
  reminderDelivery,
} from "@bloomy/db/schema/reminder";
import { workout, workoutSession } from "@bloomy/db/schema/workout";
import { and, eq, gte, isNotNull, lt, lte } from "drizzle-orm";
import webpush from "web-push";

import { env } from "@bloomy/env/server";
import { DEFAULT_GOAL_TARGETS } from "@/lib/api-types";
import { dayFor, previousDay } from "@/server/shared/day";
import { notificationFor } from "./messages";
import { dropDeadSubscription } from "@/server/push/service";
import {
  deliveryKey,
  dueSlotsAt,
  type DueSlot,
  type HealthEvent,
  type ReminderRow,
  type UserState,
} from "./slots";

/** Por quantos dias guardar o histórico de entregas. Curto de propósito: serve
 *  para investigar "por que não recebi ontem", não para virar arquivo. */
export const DELIVERY_RETENTION_DAYS = 3;

/** Quanto olhar para frente ao buscar consultas e exames — cobre o aviso de
 *  véspera (24h) com folga para o fuso e o atraso da varredura. */
const EVENT_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

export type DispatchResult = {
  scanned: number;
  sent: number;
  missed: number;
  failed: number;
  cleaned: number;
};

function vapidReady(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

/** Varre todos os usuários notificáveis e entrega o que estiver devido em `now`.
 *  `now` entra por parâmetro (e não por `new Date()` interno) para o dispatch ser
 *  exercitável em teste e para a varredura inteira usar um único instante. */
export async function dispatchReminders(db: Db, now: Date = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = { scanned: 0, sent: 0, missed: 0, failed: 0, cleaned: 0 };

  if (!vapidReady()) {
    console.warn("[reminders] VAPID não configurado — varredura ignorada");
    return result;
  }
  webpush.setVapidDetails(
    env.VAPID_SUBJECT!,
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );

  // Só quem tem aparelho registrado: sem subscription não há para onde enviar, e
  // montar o estado de quem nunca deu permissão seria trabalho jogado fora.
  const targets = await db
    .selectDistinct({ userId: pushSubscription.userId })
    .from(pushSubscription);

  for (const { userId } of targets) {
    result.scanned += 1;
    const state = await loadUserState(db, userId, now);
    if (!state) continue;

    for (const slot of dueSlotsAt(now, state)) {
      const claimed = await claimSlot(db, userId, slot);
      if (!claimed) continue; // outra varredura pegou este slot primeiro

      if (slot.action === "miss") {
        result.missed += 1;
        continue;
      }

      const delivered = await sendToDevices(db, userId, slot);
      if (delivered) result.sent += 1;
      else result.failed += 1;
    }
  }

  result.cleaned = await purgeOldDeliveries(db, now);
  return result;
}

/** Marca o slot como tratado antes de enviar. O unique de `reminder_delivery` é o
 *  que impede a mesma notificação de sair duas vezes quando duas varreduras se
 *  cruzam. Falhar depois do insert custa uma notificação perdida — troca melhor
 *  que duas notificações iguais. */
async function claimSlot(db: Db, userId: string, slot: DueSlot): Promise<boolean> {
  const inserted = await db
    .insert(reminderDelivery)
    .values({
      userId,
      reminderId: slot.reminderId,
      day: slot.day,
      slot: slot.slot,
      refId: slot.refId,
      status: slot.action === "miss" ? "missed" : "sent",
    })
    .onConflictDoNothing()
    .returning({ id: reminderDelivery.id });
  return inserted.length > 0;
}

/** Envia para todos os aparelhos do usuário. Uma subscription morta (404/410) é
 *  apagada na hora — é o único sinal que o protocolo dá de app desinstalado ou
 *  permissão revogada. */
async function sendToDevices(db: Db, userId: string, slot: DueSlot): Promise<boolean> {
  const devices = await db
    .select()
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));

  const payload = JSON.stringify(notificationFor(slot));
  let anyDelivered = false;

  for (const device of devices) {
    try {
      await webpush.sendNotification(
        {
          endpoint: device.endpoint,
          keys: { p256dh: device.p256dh, auth: device.auth },
        },
        payload,
      );
      anyDelivered = true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await dropDeadSubscription(db, device.endpoint);
        continue;
      }
      // Sem endpoint no log: é URL única por aparelho, tratada como dado pessoal.
      console.error(`[reminders] falha ao enviar (${status ?? "sem status"})`);
    }
  }

  return anyDelivered;
}

/** Apaga entregas antigas na própria varredura — sem job extra nem infra nova. */
async function purgeOldDeliveries(db: Db, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const removed = await db
    .delete(reminderDelivery)
    .where(lt(reminderDelivery.day, dayFor(cutoff)))
    .returning({ id: reminderDelivery.id });
  return removed.length;
}

/** Monta tudo o que `dueSlotsAt` precisa saber sobre o usuário neste instante.
 *  Devolve `null` quando não há lembrete ligado — nada a decidir. */
async function loadUserState(db: Db, userId: string, now: Date): Promise<UserState | null> {
  const day = dayFor(now);

  const reminders = (await db
    .select({
      id: reminder.id,
      type: reminder.type,
      time: reminder.time,
      enabled: reminder.enabled,
    })
    .from(reminder)
    .where(eq(reminder.userId, userId))) as ReminderRow[];

  if (!reminders.some((r) => r.enabled)) return null;

  const [water, meds, workoutState, mind, events, delivered] = await Promise.all([
    loadWater(db, userId, day),
    loadMeds(db, userId, day),
    loadWorkout(db, userId, day),
    loadMind(db, userId, day),
    loadEvents(db, userId, now),
    loadDelivered(db, userId, day),
  ]);

  return { reminders, water, meds, workout: workoutState, mind, events, delivered };
}

async function loadWater(db: Db, userId: string, day: string) {
  const [logs, [waterGoal]] = await Promise.all([
    db
      .select({ ml: waterLog.ml })
      .from(waterLog)
      .where(and(eq(waterLog.userId, userId), eq(waterLog.day, day))),
    db
      .select({ target: goal.target })
      .from(goal)
      .where(and(eq(goal.userId, userId), eq(goal.domain, "water"))),
  ]);

  return {
    totalMl: logs.reduce((sum, l) => sum + l.ml, 0),
    goalMl: waterGoal?.target ?? DEFAULT_GOAL_TARGETS.water,
  };
}

/** Horários de remédio do dia com quantas tomas seguem sem confirmação.
 *  Agrupa por horário, não por medicação: três remédios às 08:00 são um lembrete. */
async function loadMeds(db: Db, userId: string, day: string) {
  const actives = await db
    .select({ id: medication.id, times: medication.times })
    .from(medication)
    .where(and(eq(medication.userId, userId), eq(medication.active, true)));

  if (actives.length === 0) return [];

  const taken = await db
    .select({ medicationId: medicationIntake.medicationId, time: medicationIntake.time })
    .from(medicationIntake)
    .where(and(eq(medicationIntake.userId, userId), eq(medicationIntake.day, day)));

  const confirmed = new Set(taken.map((t) => `${t.medicationId}|${t.time}`));
  const pendingByTime = new Map<string, number>();

  for (const med of actives) {
    for (const time of med.times) {
      if (confirmed.has(`${med.id}|${time}`)) continue;
      pendingByTime.set(time, (pendingByTime.get(time) ?? 0) + 1);
    }
  }

  return [...pendingByTime.entries()]
    .map(([time, pending]) => ({ time, pending }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** O app não guarda quais dias da semana a pessoa treina (o onboarding grava só o
 *  número). Por isso a checagem é "existe treino cadastrado" + "já treinou hoje" —
 *  limitação registrada no spec. */
async function loadWorkout(db: Db, userId: string, day: string) {
  const [actives, done] = await Promise.all([
    db
      .select({ id: workout.id })
      .from(workout)
      .where(and(eq(workout.userId, userId), eq(workout.active, true)))
      .limit(1),
    db
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.userId, userId),
          eq(workoutSession.day, day),
          isNotNull(workoutSession.completedAt),
        ),
      )
      .limit(1),
  ]);

  return { hasActive: actives.length > 0, doneToday: done.length > 0 };
}

async function loadMind(db: Db, userId: string, day: string) {
  const rows = await db
    .select({ id: moodCheckin.id })
    .from(moodCheckin)
    .where(and(eq(moodCheckin.userId, userId), eq(moodCheckin.day, day)))
    .limit(1);
  return { checkedInToday: rows.length > 0 };
}

/** Consultas e exames agendados na janela de interesse. Só status `scheduled`:
 *  compromisso a marcar, aguardando resultado ou concluído nunca lembra. */
async function loadEvents(db: Db, userId: string, now: Date): Promise<HealthEvent[]> {
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const until = new Date(now.getTime() + EVENT_LOOKAHEAD_MS);

  const [appointments, exams] = await Promise.all([
    db
      .select({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        remindDayBefore: appointment.remindDayBefore,
        professional: appointment.professional,
      })
      .from(appointment)
      .where(
        and(
          eq(appointment.userId, userId),
          eq(appointment.status, "scheduled"),
          gte(appointment.scheduledAt, from),
          lte(appointment.scheduledAt, until),
        ),
      ),
    db
      .select({ id: exam.id, scheduledAt: exam.scheduledAt, name: exam.name })
      .from(exam)
      .where(
        and(
          eq(exam.userId, userId),
          eq(exam.status, "scheduled"),
          gte(exam.scheduledAt, from),
          lte(exam.scheduledAt, until),
        ),
      ),
  ]);

  return [
    ...appointments.map((a) => ({
      kind: "appt" as const,
      id: a.id,
      scheduledAt: a.scheduledAt!,
      remindDayBefore: a.remindDayBefore,
      label: a.professional,
    })),
    ...exams.map((e) => ({
      kind: "exam" as const,
      id: e.id,
      scheduledAt: e.scheduledAt!,
      // Exame não tem flag própria: o aviso de véspera vale sempre.
      remindDayBefore: true,
      label: e.name,
    })),
  ];
}

/** Entregas já registradas hoje e ontem — ontem porque o aviso de véspera de um
 *  compromisso pode ter sido gravado antes da virada do dia. */
async function loadDelivered(db: Db, userId: string, day: string): Promise<Set<string>> {
  const rows = await db
    .select({
      reminderId: reminderDelivery.reminderId,
      day: reminderDelivery.day,
      slot: reminderDelivery.slot,
      refId: reminderDelivery.refId,
    })
    .from(reminderDelivery)
    .where(and(eq(reminderDelivery.userId, userId), gte(reminderDelivery.day, previousDay(day))));

  return new Set(rows.map((r) => deliveryKey(r.reminderId, r.day, r.slot, r.refId)));
}
