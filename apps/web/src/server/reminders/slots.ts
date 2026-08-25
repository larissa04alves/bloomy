/** Decide quais lembretes estão devidos num instante.
 *
 *  Módulo puro: sem banco, sem rede, sem `Date.now()` interno — recebe `now` e o
 *  estado já lido, devolve a lista de slots. É onde mora toda a sutileza de fuso,
 *  janela e tolerância, e por isso é o único ponto que precisa de teste de verdade.
 *  Client-safe, como `day.ts` — não leva `server-only`. */

import { dayFor, previousDay } from "@/server/shared/day";

export type ReminderType = "water" | "meds" | "workout" | "mind" | "appointments";

/** Água não tem horário escolhido: o intervalo e a janela são constantes de produto.
 *  Tornar isso editável exigiria coluna própria — decisão registrada no spec. */
export const WATER_INTERVAL_HOURS = 3;
export const WATER_WINDOW = { start: "06:00", end: "21:00" } as const;

export const DEFAULT_TIME = { workout: "18:00", mind: "21:00" } as const;

/** Slot pendente há menos que isso ainda é enviado. Acima, vira `missed`.
 *  Depois de uma queda longa, disparar tudo o que acumulou é pior que não
 *  disparar: "hora do remédio" às 23h por um slot das 08h destrói a confiança. */
export const TOLERANCE_MINUTES = 30;

/** Até onde olhar para trás para registrar `missed`. Sem esse teto, cada varredura
 *  reprocessaria o dia inteiro só para gravar linhas de diagnóstico. */
export const MISS_WINDOW_MINUTES = 120;

export type ReminderRow = {
  id: string;
  type: ReminderType;
  time: string | null;
  enabled: boolean;
};

export type HealthEvent = {
  kind: "appt" | "exam";
  id: string;
  scheduledAt: Date;
  /** Só consulta tem a flag; exame sempre recebe o aviso de véspera. */
  remindDayBefore: boolean;
  label: string;
};

export type UserState = {
  reminders: ReminderRow[];
  water: { totalMl: number; goalMl: number };
  /** Horários distintos de remédios ativos e quantas tomas seguem pendentes hoje. */
  meds: { time: string; pending: number }[];
  workout: { hasActive: boolean; doneToday: boolean };
  mind: { checkedInToday: boolean };
  events: HealthEvent[];
  /** Chaves já registradas em `reminder_delivery` — ver `deliveryKey`. */
  delivered: Set<string>;
};

export type DueSlot = {
  reminderId: string;
  type: ReminderType;
  day: string;
  slot: string;
  refId: string;
  action: "send" | "miss";
  /** Quantas tomas naquele horário — só para o texto de remédios. */
  count?: number;
  /** Nome do profissional ou do exame — só para o texto de consultas. */
  label?: string;
};

export function deliveryKey(reminderId: string, day: string, slot: string, refId: string): string {
  return `${reminderId}|${day}|${slot}|${refId}`;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Horário local (America/Sao_Paulo) de um instante, em HH:MM — ADR-0002. */
export function timeFor(date: Date): string {
  return TIME_FORMATTER.format(date);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Os horários de água do dia: da abertura da janela até o fechamento, de N em N horas. */
export function waterSlots(): string[] {
  const step = WATER_INTERVAL_HOURS * 60;
  const end = toMinutes(WATER_WINDOW.end);
  const slots: string[] = [];
  for (let m = toMinutes(WATER_WINDOW.start); m <= end; m += step) slots.push(toTime(m));
  return slots;
}

/** `send` se o slot passou há pouco, `miss` se passou há muito, `null` se ainda não
 *  chegou a hora (ou se já é história velha demais para valer registro). */
function actionFor(slotMinutes: number, nowMinutes: number): DueSlot["action"] | null {
  const late = nowMinutes - slotMinutes;
  if (late < 0) return null;
  if (late <= TOLERANCE_MINUTES) return "send";
  if (late <= MISS_WINDOW_MINUTES) return "miss";
  return null;
}

/** Lembretes devidos em `now`, já descontando o que foi entregue e o que não faz
 *  mais sentido lembrar (meta batida, treino feito, check-in respondido). */
export function dueSlotsAt(now: Date, state: UserState): DueSlot[] {
  const day = dayFor(now);
  const nowMinutes = toMinutes(timeFor(now));
  const enabled = new Map(
    state.reminders.filter((r) => r.enabled).map((r) => [r.type, r]),
  );
  const found: DueSlot[] = [];

  const push = (
    reminder: ReminderRow,
    slot: string,
    refId: string,
    extra: Pick<DueSlot, "count" | "label"> = {},
    slotDay = day,
  ) => {
    // O atraso é medido dentro do dia corrente. Um slot de ontem só chegaria aqui
    // via evento de saúde, e nesse caso o horário já foi normalizado para hoje.
    const action = actionFor(toMinutes(slot), nowMinutes);
    if (!action) return;
    if (state.delivered.has(deliveryKey(reminder.id, slotDay, slot, refId))) return;
    found.push({
      reminderId: reminder.id,
      type: reminder.type,
      day: slotDay,
      slot,
      refId,
      action,
      ...extra,
    });
  };

  const water = enabled.get("water");
  // Meta do dia batida: parar de lembrar é o comportamento pedido — o app evita cobrança.
  if (water && state.water.totalMl < state.water.goalMl) {
    for (const slot of waterSlots()) push(water, slot, "");
  }

  const meds = enabled.get("meds");
  if (meds) {
    // Um push por horário, não por remédio: três medicações às 08:00 geram uma
    // notificação só, e a chave de idempotência é o horário.
    for (const { time, pending } of state.meds) {
      if (pending > 0) push(meds, time, "", { count: pending });
    }
  }

  const workout = enabled.get("workout");
  if (workout && state.workout.hasActive && !state.workout.doneToday) {
    push(workout, workout.time ?? DEFAULT_TIME.workout, "");
  }

  const mind = enabled.get("mind");
  if (mind && !state.mind.checkedInToday) {
    push(mind, mind.time ?? DEFAULT_TIME.mind, "");
  }

  const appointments = enabled.get("appointments");
  if (appointments) {
    for (const event of state.events) {
      const eventDay = dayFor(event.scheduledAt);
      const eventTime = timeFor(event.scheduledAt);

      // Véspera: mesmo horário do compromisso, um dia antes. Consulta só avisa com a
      // flag marcada no modal de Saúde; exame sempre avisa, porque não tem flag.
      const wantsDayBefore = event.kind === "exam" || event.remindDayBefore;
      if (wantsDayBefore && previousDay(eventDay) === day) {
        push(appointments, eventTime, `${event.kind}:${event.id}:1d`, { label: event.label });
      }

      // Uma hora antes. Se o compromisso é antes das 01:00, a hora anterior cai no dia
      // anterior — aí o aviso perderia a referência de dia e é melhor não existir.
      if (eventDay === day && toMinutes(eventTime) >= 60) {
        const slot = toTime(toMinutes(eventTime) - 60);
        push(appointments, slot, `${event.kind}:${event.id}:1h`, { label: event.label });
      }
    }
  }

  return found;
}
