import { FOCUS_LABELS, type Focus } from "@/lib/api-types";

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

/** Rascunho sem zero à esquerda ("030" → "30"); `decimal` aceita uma vírgula.
 *  Sem `decimal`, tudo depois da vírgula é descartado ("7,5" → "7", não "75"). */
export function numberDraft(raw: string, decimal = false): string {
  let out = "";
  let hasSeparator = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "," || ch === ".") {
      if (!decimal) break;
      if (!hasSeparator) {
        out += ch;
        hasSeparator = true;
      }
    }
  }
  return out.replace(/^0+(?=\d)/, "");
}

/** Rascunho → número; vazio ou inválido → null. Aceita vírgula decimal. */
export function parseDraft(draft: string): number | null {
  if (draft.trim() === "") return null;
  const n = Number(draft.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Rascunho → inteiro dentro de [min, max]; vazio ou inválido → `min`. */
export function commitDraft(draft: string, min: number, max: number): number {
  const n = parseDraft(draft) ?? min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Rascunho ao sair do campo de reps/carga: vazio ou inválido → 0; decimal sem arredondar. */
export function settleDraft(draft: string): number {
  return parseDraft(draft) ?? 0;
}

/** Focos → rótulos PT juntos. Ex.: ["chest", "arms"] → "Peito · Braços". */
export function formatFocuses(focuses: Focus[]): string {
  return focuses.map((f) => FOCUS_LABELS[f]).join(" · ");
}
