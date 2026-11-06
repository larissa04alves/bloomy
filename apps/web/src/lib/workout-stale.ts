/** Treino em andamento sem série concluída por esse tempo: provavelmente esqueceram de concluir. */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

/** Última vez que a pessoa mexeu no treino: o início ou a série concluída mais recente. */
export function lastActivityAt(startedAt: Date, doneAts: (Date | null)[]): Date {
  return doneAts.reduce<Date>((last, d) => (d && d > last ? d : last), startedAt);
}

export function isStale(lastActivity: Date, now: Date): boolean {
  return now.getTime() - lastActivity.getTime() >= STALE_AFTER_MS;
}
