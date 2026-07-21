import type { ExamStatus } from "@/lib/api-types";

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "hoje" | "amanhã" | "em N dias" | "em N semanas" (nunca no passado → "hoje"). */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const diff = Math.round(
    (startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (diff <= 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff < 14) return `em ${diff} dias`;
  return `em ${Math.round(diff / 7)} semanas`;
}

/** "jul" */
export function monthShort(iso: string): string {
  return MONTHS_PT[new Date(iso).getMonth()];
}

/** "qui, 16" */
export function weekdayDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()}`;
}

/** "14h" ou "14h30" */
export function hourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "05/07" (histórico) */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2x ao dia · 08:00, 20:00" */
export function frequencyLabel(times: string[]): string {
  return `${times.length}x ao dia · ${times.join(", ")}`;
}

/** Classe de cor do texto de status do exame (Regra do Sem-Vermelho). */
export function examStatusTone(status: ExamStatus): string {
  switch (status) {
    case "to_schedule":
      return "text-coral";
    case "scheduled":
      return "text-lilac-deep";
    case "awaiting_result":
      return "text-green-deep";
    case "completed":
      return "text-ink-read";
  }
}

type Datable = { scheduledAt: string | null; suggestedAt: string | null };

function whenMs(x: Datable): number {
  const iso = x.scheduledAt ?? x.suggestedAt;
  return iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;
}

/** Ordena ativos asc por scheduledAt ?? suggestedAt (null vai pro fim). */
export function sortByWhen<T extends Datable>(items: T[]): T[] {
  return [...items].sort((a, b) => whenMs(a) - whenMs(b));
}

/** Ordena concluídos desc por completedAt (null por último). */
export function byCompletedDesc<T extends { completedAt: string | null }>(items: T[]): T[] {
  const ms = (x: { completedAt: string | null }) =>
    x.completedAt ? new Date(x.completedAt).getTime() : 0;
  return [...items].sort((a, b) => ms(b) - ms(a));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Date → "dd/MM/yyyy" (exibição BR). */
export function formatDateBR(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Junta data + hora/minuto (strings "HH"/"MM") num instante ISO (hora local). */
export function combineDateTime(date: Date, hour: string, minute: string): string {
  const d = new Date(date);
  d.setHours(Number(hour), Number(minute), 0, 0);
  return d.toISOString();
}

/** ISO → { date, hour, minute } para prefill (null → data indefinida, hora padrão 09:00). */
export function splitDateTime(iso: string | null): {
  date: Date | undefined;
  hour: string;
  minute: string;
} {
  if (!iso) return { date: undefined, hour: "09", minute: "00" };
  const d = new Date(iso);
  return { date: d, hour: pad2(d.getHours()), minute: pad2(d.getMinutes()) };
}

/** Horas "00".."23". */
export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => pad2(i));

/** Minutos de 5 em 5 ("00".."55") + `extra` se cair fora do passo (edição preserva o valor). */
export function minuteOptions(extra?: string): string[] {
  const base = Array.from({ length: 12 }, (_, i) => pad2(i * 5));
  if (extra && !base.includes(extra)) return [...base, extra].sort();
  return base;
}
