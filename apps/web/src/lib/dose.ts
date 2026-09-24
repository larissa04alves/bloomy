import type { DoseUnit } from "@/lib/api-types";

/** Rótulo singular/plural de cada unidade; abreviações e medidas não flexionam. */
export const DOSE_UNIT_LABELS: Record<DoseUnit, { one: string; many: string }> = {
  comp: { one: "comp.", many: "comp." },
  capsula: { one: "cápsula", many: "cápsulas" },
  gotas: { one: "gota", many: "gotas" },
  ml: { one: "ml", many: "ml" },
  g: { one: "g", many: "g" },
  mg: { one: "mg", many: "mg" },
  scoop: { one: "scoop", many: "scoops" },
};

export const DOSE_UNIT_OPTIONS = Object.keys(DOSE_UNIT_LABELS) as DoseUnit[];

/** Casas decimais aceitas no input e mostradas na tela; iguais para editar não arredondar
 *  (125 mcg = 0,125 mg). */
const DECIMALS = 3;

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: DECIMALS });

export function formatQuantity(amount: number): string {
  return NUMBER.format(amount);
}

/** Rótulo da unidade para uma quantidade (plural a partir de 2, como no PT). */
export function unitLabel(amount: number, unit: DoseUnit): string {
  const label = DOSE_UNIT_LABELS[unit];
  return amount >= 2 ? label.many : label.one;
}

/** "2 comp.", "1 scoop", "0,5 comp.", "20 gotas". */
export function formatDose(amount: number, unit: DoseUnit): string {
  return `${formatQuantity(amount)} ${unitLabel(amount, unit)}`;
}

/** Texto do input ("2,5", "10") → número; vazio ou inválido → null. */
export function parseQuantity(text: string): number | null {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** Mantém só dígitos e uma vírgula decimal enquanto a pessoa digita. */
export function sanitizeQuantity(text: string): string {
  const [int, ...rest] = text.replace(".", ",").replace(/[^\d,]/g, "").split(",");
  return rest.length ? `${int},${rest.join("").slice(0, DECIMALS)}` : int;
}
