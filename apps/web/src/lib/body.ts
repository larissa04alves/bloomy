/** Faixas dos dados do corpo. Ficam em `lib/` porque client (validação do formulário)
 *  e servidor (dono da regra, ADR-0001) usam os mesmos números. */
export const HEIGHT_CM_LIMITS = { min: 100, max: 250 } as const;

/** Uma pesagem, em gramas (20–300 kg). */
export const WEIGHT_GRAMS_LIMITS = { min: 20_000, max: 300_000 } as const;

/** Nascimento é `YYYY-MM-DD`, entre esta data e hoje (fuso BR). */
export const BIRTH_DATE_MIN = "1900-01-01";

/** Máscara em vez de `type="date"`: o nativo segue o idioma do navegador (mm/dd em inglês). */
export function maskBirthDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

export function parseBrDate(raw: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (date.getUTCDate() !== Number(dd) || date.getUTCMonth() !== Number(mm) - 1) return null;
  return `${yyyy}-${mm}-${dd}`;
}
