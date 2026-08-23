/** Faixas de tamanho da gota, da meta curta para a longa. A gota cresce quando
 *  são poucas porções (porção grande) e encolhe quando são muitas, para a fileira
 *  caber na coluna de ~342px sem virar três linhas. */
const DROP_SIZES = [
  { upTo: 4, size: 44 },
  { upTo: 6, size: 40 },
  { upTo: 8, size: 34 },
] as const;

/** Menor gota: acima de 8 porções o tamanho para de cair (abaixo disso a gota
 *  deixa de ser legível). */
const SMALLEST_DROP = 30;

/** Lado da gota (px) para uma meta de `target` porções. */
export function dropSize(target: number): number {
  return DROP_SIZES.find((s) => target <= s.upTo)?.size ?? SMALLEST_DROP;
}

/** Quantidades oferecidas como atalho no modal de água. */
const WATER_PRESETS = [200, 250, 500, 750];

/** Atalhos do modal: os presets mais a porção configurada na meta, quando ela não
 *  é um deles. Quem bebe de 1200 em 1200 ml precisa do próprio tamanho a um toque;
 *  quem configurou 750 (já preset) não deve ver dois chips iguais. */
export function waterShortcuts(portionMl: number): number[] {
  const all = new Set(WATER_PRESETS);
  if (portionMl > 0) all.add(portionMl);
  return [...all].sort((a, b) => a - b);
}
