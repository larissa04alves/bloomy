import { portions } from "@/server/shared/units";

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

/** Hint vivo da sheet de hidratação. Reusa `portions` para arredondar igual ao
 *  resto do app — a Corpo e a Metas nunca podem discordar sobre quantas cabem. */
export function portionHint(goalMl: number, portionMl: number): string {
  const { target } = portions(0, goalMl, portionMl);
  return target === 1 ? "≈ 1 porção por dia" : `≈ ${target} porções por dia`;
}
