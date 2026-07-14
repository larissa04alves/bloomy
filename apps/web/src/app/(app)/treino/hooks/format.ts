/** Segundos → "M:SS" (timer da sessão e do descanso). Ex.: 372 → "6:12". */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Segundos → duração amigável. Ex.: 1920 → "32 min"; 3900 → "1h 05". */
export function formatDuration(totalSeconds: number): string {
  const min = Math.max(0, Math.round(totalSeconds / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}`;
}
