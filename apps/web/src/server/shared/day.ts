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

export const DAY_SCHEMA = z.iso.date();

/** Resolve o `day` da query (default hoje); inválido → `{ ok: false }`. */
export function resolveDay(request: Request): { ok: true; day: string } | { ok: false } {
  const raw = new URL(request.url).searchParams.get("day");
  if (!raw) return { ok: true, day: dayFor() };
  const parsed = DAY_SCHEMA.safeParse(raw);
  return parsed.success ? { ok: true, day: parsed.data } : { ok: false };
}
