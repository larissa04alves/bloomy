import type { Route } from "next";

export const CICLO_HREF: Route = "/ciclo";
export const ATIVAR_HREF: Route = "/ciclo/ativar";
export const CALENDARIO_HREF: Route = "/ciclo/calendario";

export const CYCLE_FLOWS = ["none", "spotting", "light", "medium", "heavy"] as const;
export type CycleFlow = (typeof CYCLE_FLOWS)[number];

export const FLOW_LABELS: Record<CycleFlow, string> = {
  none: "Nada",
  spotting: "Escape",
  light: "Leve",
  medium: "Médio",
  heavy: "Intenso",
};

export const CYCLE_SYMPTOMS = {
  cramps: "Cólica",
  bloating: "Inchaço",
  headache: "Dor de cabeça",
  breast_tenderness: "Seios sensíveis",
  acne: "Acne",
  fatigue: "Cansaço",
  sweet_cravings: "Desejo de doce",
  nausea: "Náusea",
  back_pain: "Dor nas costas",
  high_libido: "Libido alta",
  low_libido: "Libido baixa",
  discharge: "Corrimento",
} as const;
export type CycleSymptom = keyof typeof CYCLE_SYMPTOMS;
// z.enum com o objeto valida os rótulos (zod 4); a tupla de ids é o que o zod deve receber.
export const CYCLE_SYMPTOM_IDS = Object.keys(CYCLE_SYMPTOMS) as [CycleSymptom, ...CycleSymptom[]];

export const CYCLE_METHODS = [
  "none",
  "pill",
  "hormonal_iud",
  "copper_iud",
  "implant",
  "injection",
  "ring",
  "patch",
  "other",
] as const;
export type CycleMethodKind = (typeof CYCLE_METHODS)[number];

export const METHOD_LABELS: Record<CycleMethodKind, string> = {
  none: "Nenhum",
  pill: "Pílula",
  hormonal_iud: "DIU hormonal",
  copper_iud: "DIU de cobre",
  implant: "Implante",
  injection: "Injeção",
  ring: "Anel",
  patch: "Adesivo",
  other: "Outro",
};

export const PILL_ACTIVE_DAYS_LIMITS = { min: 10, max: 60 };

export type CycleMode = "natural" | "scheduled" | "continuous";

/** `hasPause` só decide a pílula: sem pausa ela é contínua. */
export function methodMode(kind: CycleMethodKind, hasPause: boolean): CycleMode {
  switch (kind) {
    case "none":
    case "copper_iud":
    case "other":
      return "natural";
    case "ring":
    case "patch":
      return "scheduled";
    case "pill":
      return hasPause ? "scheduled" : "continuous";
    case "hormonal_iud":
    case "implant":
    case "injection":
      return "continuous";
  }
}

/** Dias de uso por unidade; na pílula é o número informado no cadastro. */
export function activeDaysFor(kind: CycleMethodKind, pillActiveDays: number | null): number | null {
  if (kind === "ring" || kind === "patch") return 21;
  return kind === "pill" ? pillActiveDays : null;
}

export function defaultPauseDays(kind: CycleMethodKind): number | null {
  return kind === "pill" || kind === "ring" || kind === "patch" ? 7 : null;
}
