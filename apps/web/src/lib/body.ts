/** Faixas dos dados do corpo. Ficam em `lib/` porque client (validação do formulário)
 *  e servidor (dono da regra, ADR-0001) usam os mesmos números. */
export const HEIGHT_CM_LIMITS = { min: 100, max: 250 } as const;

/** Uma pesagem, em gramas (20–300 kg). */
export const WEIGHT_GRAMS_LIMITS = { min: 20_000, max: 300_000 } as const;

/** Nascimento é `YYYY-MM-DD`, entre esta data e hoje (fuso BR). */
export const BIRTH_DATE_MIN = "1900-01-01";
