import type { WeightLog } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

export type Period = "30d" | "3m" | "1y";

/** `label` é o texto do chip (o card é estreito); `full` vai no aria-label. */
export const PERIODS: { value: Period; label: string; full: string }[] = [
  { value: "30d", label: "30d", full: "30 dias" },
  { value: "3m", label: "3m", full: "3 meses" },
  { value: "1y", label: "1a", full: "1 ano" },
];

const PERIOD_DAYS: Record<Period, number> = { "30d": 30, "3m": 90, "1y": 365 };

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Direção da variação. A cor nunca é semântica: quem exibe usa tinta neutra. */
export type Delta = { direction: "up" | "down" | "flat"; label: string };

export type MonthGroup = {
  key: string; // "2026-08"
  label: string; // "Agosto 2026"
  balance: Delta | null;
  items: WeightLog[]; // desc
};

export type ChartPoint = { day: string; kg: number };

/** 64200 → "64,2". Sempre uma casa, vírgula decimal. */
export function formatKg(grams: number): string {
  return (grams / 1000).toFixed(1).replace(".", ",");
}

export function deltaBetween(current: number, previous?: number): Delta | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return { direction: "flat", label: "0,0" };
  return { direction: diff > 0 ? "up" : "down", label: formatKg(Math.abs(diff)) };
}

/** Soma dias a um "YYYY-MM-DD" sem tocar no fuso do browser. */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Recorte do período. `day` é YYYY-MM-DD, então comparação de string basta.
 * O "hoje" padrão vem de `dayFor()` (fuso BR, ADR-0002) — `day.ts` é client-safe
 * de propósito, justamente para o cliente não recalcular fuso por conta própria.
 */
export function filterPeriod(
  weights: WeightLog[],
  period: Period,
  today: string = dayFor(),
): WeightLog[] {
  const from = shiftDay(today, -PERIOD_DAYS[period]);
  return weights.filter((w) => w.day >= from);
}

/**
 * Agrupa em meses (desc). O saldo do mês é a última pesagem do mês contra a última
 * do mês anterior — o mês mais antigo não tem com o que comparar e fica `null`.
 * Ordena a entrada por conta própria (desc por dia) antes de agrupar, então a
 * ordem de quem chama não importa — nunca muta o array recebido.
 */
export function groupByMonth(weights: WeightLog[]): MonthGroup[] {
  const sorted = [...weights].sort((a, b) => b.day.localeCompare(a.day));
  const groups: MonthGroup[] = [];

  for (const w of sorted) {
    const key = w.day.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(w);
      continue;
    }
    const [year, month] = key.split("-");
    const name = MONTHS_PT[Number(month) - 1];
    groups.push({
      key,
      label: `${name[0].toUpperCase()}${name.slice(1)} ${year}`,
      balance: null,
      items: [w],
    });
  }

  return groups.map((g, i) => {
    const previousMonth = groups[i + 1]; // groups está desc: o próximo é o mês anterior
    const previousLast = previousMonth?.items[0]?.grams;
    return { ...g, balance: deltaBetween(g.items[0].grams, previousLast) };
  });
}

/** Pontos para o gráfico, em ordem cronológica. kg só existe aqui e na formatação. */
export function chartSeries(weights: WeightLog[]): ChartPoint[] {
  return [...weights].reverse().map((w) => ({ day: w.day, kg: w.grams / 1000 }));
}

/** "2026-08-03" → "3 de agosto". Sem `new Date(iso)` para o dia não escorregar de fuso. */
export function dayLabel(day: string): string {
  const [, month, dayOfMonth] = day.split("-");
  return `${Number(dayOfMonth)} de ${MONTHS_PT[Number(month) - 1]}`;
}

/**
 * "64,2" ou "64.2" → 64200 g. Texto inválido devolve null (mantém o valor atual).
 * No máximo uma casa decimal — a granularidade do app é 0,1 kg (mesmo passo de
 * `formatKg`/`STEP_GRAMS`), então "64,25" também é inválido.
 */
export function parseKgToGrams(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d)?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
}

/** Date → "YYYY-MM-DD" pelos campos locais (evita o escorregão de fuso do toISOString). */
export function toDayString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "YYYY-MM-DD" → Date local ao meio-dia (imune a horário de verão). */
export function fromDayString(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
