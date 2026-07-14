export type RestPrefs = { seconds: number; auto: boolean };

export const REST_MIN = 15;
export const REST_MAX = 120;
export const REST_DEFAULT = 45;

const KEY_SECONDS = "bloomy.rest.seconds";
const KEY_AUTO = "bloomy.rest.auto";

export function clampRest(seconds: number): number {
  return Math.min(REST_MAX, Math.max(REST_MIN, Math.round(seconds)));
}

/** Um tick do descanso: null quando chega a 0 (ou já inativo). */
export function tickRest(left: number | null): number | null {
  if (left === null || left <= 1) return null;
  return left - 1;
}

export function loadRestPrefs(): RestPrefs {
  if (typeof window === "undefined") return { seconds: REST_DEFAULT, auto: true };
  const rawSec = window.localStorage.getItem(KEY_SECONDS);
  const rawAuto = window.localStorage.getItem(KEY_AUTO);
  const parsed = rawSec === null ? REST_DEFAULT : clampRest(Number(rawSec));
  return {
    seconds: Number.isFinite(parsed) ? parsed : REST_DEFAULT,
    auto: rawAuto === null ? true : rawAuto === "true",
  };
}

export function saveRestPrefs(prefs: RestPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_SECONDS, String(prefs.seconds));
  window.localStorage.setItem(KEY_AUTO, String(prefs.auto));
}
