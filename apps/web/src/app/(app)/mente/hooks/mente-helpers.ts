import type { Mood, WeekMood } from "@/lib/api-types";

/** Humor do pior ao melhor — casa com a posição dos tiles na tela. */
export const MOOD_ORDER: readonly Mood[] = ["sad", "meh", "neutral", "good", "great"];

/** Cor do ícone de humor na lista de registros (valência; do protótipo). */
export const MOOD_RECORD_COLOR: Record<Mood, string> = {
  sad: "#c76e9e",
  meh: "#d6a96b",
  neutral: "#d6a96b",
  good: "#7fc4a0",
  great: "#4e9c74",
};

const WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const SHORT_FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

/** Parse "YYYY-MM-DD" como data local (evita shift de UTC). */
function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffInDays(day: string, today: string): number {
  const ms = parseDay(today).getTime() - parseDay(day).getTime();
  return Math.round(ms / 86_400_000);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Hoje" / "Ontem" / dia-da-semana (2–6 dias) / "12 jul" (≥7 dias). */
export function relativeDay(day: string, today: string): string {
  const diff = diffInDays(day, today);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return capitalize(WEEKDAY_FMT.format(parseDay(day)));
  return SHORT_FMT.format(parseDay(day)).replace(" de ", " ").replace(".", "");
}

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Hora local (America/Sao_Paulo) de um instante ISO — "HH:mm". */
export function timeOf(createdAt: string): string {
  return TIME_FMT.format(new Date(createdAt));
}

/** Frase gentil da semana: celebra o leve, acolhe o difícil, nunca cobra. */
export function weekSentence(days: WeekMood[]): string {
  const moods = days.map((d) => d.mood).filter((m): m is Mood => m !== null);
  if (moods.length === 0) return "Sua semana vai aparecer aqui 🌱";
  if (moods.length === 1) return "Começando a semana no seu ritmo 🌱";
  const positive = moods.filter((m) => m === "good" || m === "great").length;
  const heavy = moods.filter((m) => m === "sad" || m === "meh").length;
  if (positive > heavy) return "Mais dias leves que pesados essa semana 🌿";
  if (heavy > positive) return "Semana mais puxada — tá tudo bem sentir isso 💜";
  return "Uma semana de altos e baixos — e você apareceu do mesmo jeito 💛";
}
