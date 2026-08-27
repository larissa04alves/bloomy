import type { ReminderType } from "@/lib/api-types";
import {
  DEFAULT_TIME,
  WATER_INTERVAL_HOURS,
  WATER_WINDOW,
} from "@/server/reminders/slots";

/** Motivo de a linha de remédios nascer desabilitada. Ligar um lembrete que
 *  comprovadamente não dispara seria pior que dizer o que falta. */
export const MEDS_BLOCKED_REASON = "Cadastre um remédio primeiro";

/** "06:00" → "6h". A tela fala como gente; o schema fala HH:MM. */
function hourLabel(time: string): string {
  return `${Number(time.slice(0, 2))}h`;
}

/**
 * Linha sob o título de cada lembrete, em PT.
 *
 * Água lê o intervalo e a janela de `slots.ts` em vez de repetir "3h" e "6h às 21h":
 * são constantes de produto e a tela não pode prometer um ritmo diferente do que a
 * varredura dispara.
 */
export function reminderSubtitle(
  type: ReminderType,
  opts: { time: string | null; hasMedication: boolean },
): string {
  switch (type) {
    case "water":
      return `A cada ${WATER_INTERVAL_HOURS}h, das ${hourLabel(WATER_WINDOW.start)} às ${hourLabel(WATER_WINDOW.end)}`;
    case "meds":
      return opts.hasMedication
        ? "Nos horários dos seus remédios"
        : MEDS_BLOCKED_REASON;
    case "workout":
      return `Todo dia às ${opts.time ?? DEFAULT_TIME.workout}`;
    case "mind":
      return `Todo dia às ${opts.time ?? DEFAULT_TIME.mind}`;
    case "appointments":
      return "1 dia antes e 1 hora antes";
  }
}
