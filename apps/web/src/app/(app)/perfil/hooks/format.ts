import { BIRTH_DATE_MIN, parseBrDate } from "@/lib/body";
import { dayFor } from "@/server/shared/day";

/** Comparação de texto: `AAAA-MM-DD` ordena como data. */
export function ageFrom(birthDate: string, today: string = dayFor()): number {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

export function heightPill(cm: number | null): string {
  return cm === null ? "Adicionar" : `${cm} cm`;
}

export function birthPill(iso: string | null): string {
  if (iso === null) return "Adicionar";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

export function parseCm(text: string): number | null {
  const t = text.trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

export function birthIso(raw: string, today: string = dayFor()): string | null {
  const iso = parseBrDate(raw);
  return iso !== null && iso >= BIRTH_DATE_MIN && iso <= today ? iso : null;
}

export function revertPatch<T extends object>(latest: T, patch: Partial<T>, before: T): T {
  const restored: Partial<T> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (latest[key] === patch[key]) restored[key] = before[key];
  }
  return { ...latest, ...restored };
}

export const DELETE_PHRASE = "aceito excluir minha conta";

export function isDeletePhrase(raw: string): boolean {
  return raw.trim().toLowerCase() === DELETE_PHRASE;
}
