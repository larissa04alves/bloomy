import type { DayPeriod } from "@/lib/api-types";

// hourCycle h23 garante 00–23 (com hour12:false, algumas versões de ICU devolvem "24").
const HOUR_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Período do dia no fuso BR (ADR-0002): 5–11 manhã, 12–17 tarde, resto noite. */
export function periodFor(now: Date = new Date()): DayPeriod {
  const hour = Number(HOUR_FMT.format(now));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

/** Primeiro nome, para a saudação. Sem nome usável → null (saudação fica seca). */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}
