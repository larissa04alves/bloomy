import type { DayPeriod, WorkoutCard } from "@/lib/api-types";

const GREETING: Record<DayPeriod, string> = {
  morning: "Bom dia",
  afternoon: "Boa tarde",
  evening: "Boa noite",
};

/** "Boa noite, Larissa" — sem nome, só a saudação. */
export function greetingLabel(period: DayPeriod, name: string | null): string {
  return name ? `${GREETING[period]}, ${name}` : GREETING[period];
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const DAY_MONTH_FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });

/** Parse "YYYY-MM-DD" como data local (evita o shift de UTC). */
function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** "YYYY-MM-DD" → "Segunda, 6 de julho". */
export function dateLabel(day: string): string {
  const date = parseDay(day);
  const weekday = WEEKDAY_FMT.format(date).replace("-feira", "");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${DAY_MONTH_FMT.format(date)}`;
}

const BR = "America/Sao_Paulo";
const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: BR });
const DAY_FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: BR });
const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: BR,
});

/** Instante ISO → { date: "qui, 9", time: "14h" | "14h30" }, no fuso BR. */
export function consultaLabel(at: string): { date: string; time: string } {
  const d = new Date(at);
  const weekday = SHORT_WEEKDAY_FMT.format(d).replace(".", "");
  const [hh, mm] = TIME_FMT.format(d).split(":");
  return {
    date: `${weekday}, ${DAY_FMT.format(d)}`,
    time: mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`,
  };
}

const MONTH_SHORT_FMT = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: BR });

/** Instante ISO → "ago" (mês abreviado, minúsculo, sem ponto), no fuso BR. */
export function monthShort(at: string): string {
  return MONTH_SHORT_FMT.format(new Date(at)).replace(".", "");
}

export type RitualAction = { label: string; kind: "play" | "check" | "plus" };

/** Subtítulo e ação do card de Treino conforme o estado do dia. */
export function workoutLabel(card: WorkoutCard): {
  subtitle: string;
  action: RitualAction | null;
} {
  switch (card.state) {
    case "none":
      return { subtitle: "Crie seu primeiro treino", action: { label: "Cadastrar", kind: "plus" } };
    case "active":
      return {
        subtitle: `${card.name} · em andamento`,
        action: { label: "Continuar", kind: "play" },
      };
    case "done":
      return { subtitle: card.name, action: { label: "Treino concluído", kind: "check" } };
    case "suggested":
      return { subtitle: card.name, action: { label: "Iniciar", kind: "play" } };
  }
}
