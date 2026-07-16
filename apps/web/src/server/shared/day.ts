import { z } from "zod";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia local (America/Sao_Paulo) de um instante — ADR-0002. */
export function dayFor(date: Date = new Date()): string {
  return DAY_FORMATTER.format(date);
}

/** Os 7 dias (seg→dom) da semana de `reference` (default hoje), em YYYY-MM-DD, fuso BR. */
export function weekDays(reference: string = dayFor()): string[] {
  const [y, m, d] = reference.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  const dow = monday.getUTCDay(); // 0=dom..6=sáb
  monday.setUTCDate(monday.getUTCDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

export const DAY_SCHEMA = z.iso.date();

/** Resolve o `day` da query (default hoje); inválido → `{ ok: false }`. */
export function resolveDay(request: Request): { ok: true; day: string } | { ok: false } {
  const raw = new URL(request.url).searchParams.get("day");
  if (!raw) return { ok: true, day: dayFor() };
  const parsed = DAY_SCHEMA.safeParse(raw);
  return parsed.success ? { ok: true, day: parsed.data } : { ok: false };
}
