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
