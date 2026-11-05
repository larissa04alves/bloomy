const KEY_AUTO = "bloomy.rest.auto";

export function parseLegacyAuto(raw: string | null): boolean | null {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export type LegacyAutoRestStep =
  | { kind: "none" }
  | { kind: "clear" }
  | { kind: "save"; value: boolean };

export function legacyAutoRestStep(raw: string | null, account: boolean): LegacyAutoRestStep {
  if (raw === null) return { kind: "none" };
  const value = parseLegacyAuto(raw);
  if (value === null || value === account) return { kind: "clear" };
  return { kind: "save", value };
}

export function effectiveAutoRest(
  override: boolean | null,
  account: boolean | null,
  legacyRaw: string | null,
): boolean {
  return override ?? account ?? parseLegacyAuto(legacyRaw) ?? true;
}

export function readLegacyAutoRest(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_AUTO);
}

/** Só depois que a conta guardou o valor: se o PATCH falhar, a chave fica para a próxima vez. */
export function clearLegacyAutoRest(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_AUTO);
}
