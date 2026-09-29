import { DEFAULT_PORTION_ML, type MealItem } from "@/lib/api-types";

/** Quanto da gota `index` está cheia (0–1): cada gota é uma porção, e o total
 *  enche as gotas em ordem, com a última parcial (200 ml numa porção de 1 L = 1/5). */
export function dropFill(totalMl: number, portionMl: number, index: number): number {
  const size = portionMl > 0 ? portionMl : DEFAULT_PORTION_ML;
  return Math.min(1, Math.max(0, totalMl / size - index));
}

/** Quantidades oferecidas como atalho no modal de água. */
const WATER_PRESETS = [200, 250, 500, 750, 1000];

/** Atalhos do modal: os presets mais a porção configurada na meta, quando ela não
 *  é um deles. Quem bebe de 1200 em 1200 ml precisa do próprio tamanho a um toque;
 *  quem configurou 750 (já preset) não deve ver dois chips iguais. */
export function waterShortcuts(portionMl: number): number[] {
  const all = new Set(WATER_PRESETS);
  if (portionMl > 0) all.add(portionMl);
  return [...all].sort((a, b) => a - b);
}

/** Teto de gramas por item; o mesmo limite do zod das rotas de refeição. */
export const MEAL_GRAMS_MAX = 5000;

/** Subtítulo do card: "Arroz 150 g · Feijão". */
export function formatMealItems(items: MealItem[]): string {
  return items.map((i) => (i.grams === null ? i.name : `${i.name} ${i.grams} g`)).join(" · ");
}

/** Linhas do modal → itens: sem nome some; gramas vazia ou zero vira "sem gramas". */
export function toMealItems(rows: { name: string; grams: string }[]): MealItem[] {
  return rows.flatMap((row) => {
    const name = row.name.trim();
    if (!name) return [];
    const grams = Number.parseInt(row.grams, 10);
    return [{ name, grams: grams > 0 ? grams : null }];
  });
}
