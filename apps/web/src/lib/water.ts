/** Regra prática de 35 ml por kg, a mais usada por nutricionistas no Brasil. Não há
 *  diretriz oficial por peso (a EFSA usa valor fixo por sexo) — é sugestão, não meta
 *  imposta: a pessoa sempre pode ajustar. */
const WATER_PER_KG_ML = 35;

/** Mesma faixa de `GOAL_LIMITS.water` (server/goals/service.ts), repetida aqui porque
 *  `lib/` roda no client e não importa de `server/`. */
const WATER_MIN_ML = 500;
const WATER_MAX_ML = 5000;

/** Meta sugerida para o peso, em passos de 100 ml (o passo do stepper). */
export function recommendedWaterMl(kg: number): number {
  const rounded = Math.round((kg * WATER_PER_KG_ML) / 100) * 100;
  return Math.min(WATER_MAX_ML, Math.max(WATER_MIN_ML, rounded));
}

/** Peso digitado → kg. Aceita vírgula ou ponto e no máximo uma casa decimal; vazio
 *  ou qualquer outra coisa vira `null` (não informado), nunca `NaN`. */
export function parseKg(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(text)) return null;
  return Number(text);
}

const ML = new Intl.NumberFormat("pt-BR");

/** Subtítulo do passo da água (e da sheet em Metas). Fora da recomendada, mostra o
 *  valor sugerido para a tela oferecer o "restaurar" ao lado. */
export function waterSubtitle(
  waterMl: number,
  recommendedMl: number | null,
): { text: string; restore: boolean } {
  if (recommendedMl === null) {
    return { text: "A gente conta as porções ao longo do dia.", restore: false };
  }
  if (waterMl === recommendedMl) {
    return { text: "Recomendado para o seu peso.", restore: false };
  }
  return { text: `Recomendado: ${ML.format(recommendedMl)} ml`, restore: true };
}
