import { BIRTH_DATE_MIN, parseBrDate } from "@/lib/body";
import type { CycleState } from "@/lib/api-types";
import { addDays, dayFor, daysBetween } from "@/server/shared/day";

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

/** Rascunho do drawer "Cartela atual": início e unidade (posição) e pílulas tomadas (marcações). */
export type PackDraft = { start: string; unit: number; count: number };

export function packDraftFrom(cycle: CycleState, today: string): PackDraft {
  const s = cycle.scheduled!;
  const start =
    s.phase === "active" ? addDays(today, -(s.pill - 1)) : addDays(today, -((s.pauseDay ?? 1) - 1) - s.pill);
  // Depois de "emendar", a unidade atual passa de pauseEvery; o PUT do método só aceita até ele.
  const unit = Math.min(s.unit, cycle.method.pauseEvery ?? 1);
  if (cycle.method.kind !== "pill" || s.phase !== "active") return { start, unit, count: 0 };
  // Igual às bolinhas da tela Ciclo: antes do método começar no app, conta como tomada.
  const taken = new Set(cycle.pill?.takenDays ?? []);
  let count = 0;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    if (day < cycle.method.startedOn || taken.has(day)) count++;
  }
  return { start, unit, count };
}

export type PackCountRange = { min: number; max: number };

/**
 * Faixa do stepper "Pílulas tomadas"; null = sem contagem (não é pílula, ou hoje cai na pausa).
 * `min` = dias que as bolinhas já presumem tomados (antes de `startedOn`); com a posição alterada
 * o servidor regrava `startedOn` = hoje, e aí só a pílula de hoje fica em aberto.
 */
export function packCountRange(
  draft: PackDraft,
  initial: PackDraft,
  cycle: CycleState,
  today: string,
): PackCountRange | null {
  if (cycle.method.kind !== "pill") return null;
  // Posição salva: o servidor já considera as âncoras (pausa adiantada, emenda).
  if (draft.start === initial.start && draft.unit === initial.unit) {
    if (cycle.scheduled?.phase !== "active") return null;
    const max = cycle.scheduled.pill;
    return { min: Math.min(Math.max(daysBetween(draft.start, cycle.method.startedOn), 0), max), max };
  }
  const max = daysBetween(draft.start, today) + 1;
  return max <= (cycle.method.activeDays ?? 0) ? { min: max - 1, max } : null;
}

const clamp = (n: number, { min, max }: PackCountRange) => Math.min(Math.max(n, min), max);

/** Mudar início ou unidade desloca a contagem junto: quem já marcou hoje continua com hoje marcado. */
export function patchPackDraft(
  draft: PackDraft,
  patch: Partial<PackDraft>,
  initial: PackDraft,
  cycle: CycleState,
  today: string,
): PackDraft {
  const next = { ...draft, ...patch };
  if (patch.count !== undefined || (next.start === draft.start && next.unit === draft.unit)) return next;
  const before = packCountRange(draft, initial, cycle, today);
  const after = packCountRange(next, initial, cycle, today);
  if (!after) return next;
  return { ...next, count: before ? clamp(draft.count + after.max - before.max, after) : after.min };
}

export function packChanges(
  draft: PackDraft,
  initial: PackDraft,
  range: PackCountRange | null,
): { position: boolean; count: number | null } {
  const position = draft.start !== initial.start || draft.unit !== initial.unit;
  const count = range && (position || draft.count !== initial.count) ? clamp(draft.count, range) : null;
  return { position, count };
}
