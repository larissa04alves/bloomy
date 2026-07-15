import type { Checkin, Mood } from "@/lib/api-types";

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

/** Só check-ins com nota escrita (o histórico do mini-diário). */
export function notesOnly(checkins: Checkin[]): Checkin[] {
  return checkins.filter((c) => (c.note ?? "").trim() !== "");
}

/** Upsert por `day` mantendo ordem desc (mais recente primeiro). */
export function mergeCheckin(list: Checkin[], checkin: Checkin): Checkin[] {
  const rest = list.filter((c) => c.day !== checkin.day);
  return [checkin, ...rest].sort((a, b) => (a.day < b.day ? 1 : -1));
}
