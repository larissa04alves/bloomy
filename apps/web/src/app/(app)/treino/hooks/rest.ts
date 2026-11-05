export type RestPrefs = { seconds: number };

export const REST_MIN = 15;
export const REST_MAX = 120;
export const REST_DEFAULT = 45;

const KEY_SECONDS = "bloomy.rest.seconds";

export function clampRest(seconds: number): number {
  return Math.min(REST_MAX, Math.max(REST_MIN, Math.round(seconds)));
}

/** Segundos que faltam, pelo relógio — e não por ticks: com a tela apagada o Android
 *  congela o JS e um contador decrementado parava junto. `null` = acabou. */
export function restLeft(endsAt: number, now: number): number | null {
  const ms = endsAt - now;
  return ms <= 0 ? null : Math.ceil(ms / 1000);
}

/** O fim foi percebido bem depois da hora (a tela voltou depois): encerra sem tocar —
 *  bipe atrasado só confunde. A folga cobre o intervalo do recálculo. */
export function isLateFinish(endsAt: number, now: number): boolean {
  return now - endsAt > 1500;
}

export type SavedRest = { sessionId: string; endsAt: number; total: number };

const KEY_ACTIVE = "bloomy.rest.active";

/** Guarda o descanso em curso para sobreviver a recarga ou descarte da aba. */
export function saveActiveRest(rest: SavedRest | null): void {
  if (typeof window === "undefined") return;
  if (rest === null) window.localStorage.removeItem(KEY_ACTIVE);
  else window.localStorage.setItem(KEY_ACTIVE, JSON.stringify(rest));
}

/** Descanso salvo desta sessão que ainda não acabou; qualquer outra coisa é `null`. */
export function loadActiveRest(sessionId: string, now: number): SavedRest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_ACTIVE);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedRest;
    if (saved.sessionId !== sessionId || !(saved.endsAt > now)) return null;
    return saved;
  } catch {
    return null; // JSON corrompido: trata como "sem descanso salvo"
  }
}

export function loadRestPrefs(): RestPrefs {
  if (typeof window === "undefined") return { seconds: REST_DEFAULT };
  const rawSec = window.localStorage.getItem(KEY_SECONDS);
  const parsed = rawSec === null ? REST_DEFAULT : clampRest(Number(rawSec));
  return { seconds: Number.isFinite(parsed) ? parsed : REST_DEFAULT };
}
