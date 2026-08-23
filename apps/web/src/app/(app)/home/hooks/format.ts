import type { DayPeriod, TodayPayload, WorkoutCard } from "@/lib/api-types";

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
const DAY_MONTH_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
});

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
const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  timeZone: BR,
});
const DAY_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  timeZone: BR,
});
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

const MONTH_SHORT_FMT = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: BR,
});

/** Instante ISO → "ago" (mês abreviado, minúsculo, sem ponto), no fuso BR. */
export function monthShort(at: string): string {
  return MONTH_SHORT_FMT.format(new Date(at)).replace(".", "");
}

/**
 * Progresso do dia somando os rituais em unidades comparáveis: cada porção de
 * água, refeição e remédio vale 1, e o treino do dia vale 1. A conversão de ml
 * para porções já veio pronta do servidor (`water.done`/`water.target`) — aqui
 * ela é só um número. O que não está cadastrado (sem remédio, sem treino) fica
 * fora do total — senão o dia nasceria devendo.
 */
export function dayProgress(today: TodayPayload): {
  done: number;
  total: number;
  ratio: number;
} {
  const hasWorkout = today.workout.state !== "none";
  const done =
    today.water.done +
    today.meals.done +
    today.meds.taken +
    (today.workout.state === "done" ? 1 : 0);
  const total =
    today.water.target +
    today.meals.target +
    today.meds.total +
    (hasWorkout ? 1 : 0);
  return { done, total, ratio: total > 0 ? Math.min(1, done / total) : 0 };
}

/** Frase do bloco de progresso — muda de tom conforme o dia anda. */
export function progressLabel(done: number, total: number): string {
  if (total === 0) return "Cadastre seus rituais pra acompanhar o dia";
  if (done === 0) return "Seu dia está começando";
  if (done >= total) return "Dia completo, parabéns";
  if (done / total >= 0.5) return "Você já passou da metade";
  return "Seu dia começou";
}

export type RitualAction = { label: string; kind: "play" | "check" | "plus" };

/** Subtítulo e ação do card de Treino conforme o estado do dia. */
export function workoutLabel(card: WorkoutCard): {
  subtitle: string;
  action: RitualAction | null;
} {
  switch (card.state) {
    case "none":
      return {
        subtitle: "Crie seu primeiro treino",
        action: { label: "Cadastrar", kind: "plus" },
      };
    case "active":
      return {
        subtitle: `${card.name} · em andamento`,
        action: { label: "Continuar", kind: "play" },
      };
    case "done":
      return {
        subtitle: card.name,
        action: { label: "Treino concluído", kind: "check" },
      };
    case "suggested":
      return {
        subtitle: card.name,
        action: { label: "Iniciar", kind: "play" },
      };
  }
}
