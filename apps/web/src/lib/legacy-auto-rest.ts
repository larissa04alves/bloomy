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
  return override ?? parseLegacyAuto(legacyRaw) ?? account ?? true;
}

// Storage bloqueado lança SecurityError no acesso: vira "sem valor legado".
export function readLegacyAutoRest(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY_AUTO);
  } catch {
    return null;
  }
}

/** Só depois que a conta guardou o valor: se o PATCH falhar, a chave fica para a próxima vez. */
export function clearLegacyAutoRest(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_AUTO);
  } catch {}
}
