import type { WeightLog } from "@/lib/api-types";
import { WEIGHT_GRAMS_LIMITS } from "@/lib/body";
import { parseKg, recommendedWaterMl } from "@/lib/water";

export type MetaDomain = "water" | "meals" | "workout";

/** Linha "Meta: …" de cada card, na língua da tela (PT). */
export function metaLabel(domain: MetaDomain, target: number): string {
  switch (domain) {
    case "water":
      return `${target} ml por dia`;
    case "meals":
      return target === 1 ? "1 refeição por dia" : `${target} refeições por dia`;
    case "workout":
      return target === 1 ? "1 dia por semana" : `${target} dias por semana`;
  }
}

/** Peso da pesagem mais recente, em kg. Escolhe pelo `day` em vez de confiar na
 *  ordem da resposta. */
export function latestWeightKg(weights: Pick<WeightLog, "day" | "grams">[]): number | null {
  let latest: Pick<WeightLog, "day" | "grams"> | null = null;
  for (const w of weights) if (!latest || w.day > latest.day) latest = w;
  return latest ? latest.grams / 1000 : null;
}

/** Peso digitado na sheet (só existe sem pesagem) → gramas, ou `null` se vazio,
 *  inválido ou fora da faixa de `/api/weights`. */
export function typedWeightGrams(raw: string): number | null {
  const kg = parseKg(raw);
  if (kg === null) return null;
  const grams = Math.round(kg * 1000);
  return grams >= WEIGHT_GRAMS_LIMITS.min && grams <= WEIGHT_GRAMS_LIMITS.max ? grams : null;
}

/** Meta sugerida na sheet da água: pela última pesagem ou, sem ela, pelo peso digitado. */
export function waterRecommendation(latestKg: number | null, typedRaw: string): number | null {
  if (latestKg !== null) return recommendedWaterMl(latestKg);
  const grams = typedWeightGrams(typedRaw);
  return grams === null ? null : recommendedWaterMl(grams / 1000);
}

/** Erro do campo de peso da sheet — só depois de a pessoa sair do campo. */
export function weightFieldError(raw: string, touched: boolean): string | undefined {
  if (!touched || !raw.trim() || typedWeightGrams(raw) !== null) return undefined;
  return `Peso entre ${WEIGHT_GRAMS_LIMITS.min / 1000} e ${WEIGHT_GRAMS_LIMITS.max / 1000} kg`;
}

/** Peso digitado e inválido segura o "Salvar" da sheet da água: salvar a meta sem
 *  registrar o peso, sem a pessoa perceber, seria pior que pedir para corrigir. */
export function waterSaveBlocked(askWeight: boolean, raw: string): boolean {
  return askWeight && raw.trim() !== "" && typedWeightGrams(raw) === null;
}
