import type { CycleState, MethodInput, MethodUpdateInput } from "./api-types";
import { type CycleMethodKind, defaultPauseDays, methodMode, PILL_ACTIVE_DAYS_LIMITS } from "./cycle";

export type MethodForm = {
  kind: CycleMethodKind;
  lastPeriodStart: string;
  usualLength: number;
  /** Comprimidos ativos por cartela. */
  activeDays: number;
  /** "Faz pausa?" da pílula; anel e adesivo sempre pausam. */
  pauses: boolean;
  pauseEvery: number;
  pauseDays: number;
  pillTime: string;
  currentUnitStart: string;
  currentUnit: number;
  /** "Corrigir cartela atual"/"Corrigir última menstruação": pede a posição no mesmo tipo. */
  fixPosition: boolean;
};

export const EMPTY_METHOD_FORM: MethodForm = {
  kind: "none",
  lastPeriodStart: "",
  usualLength: 28,
  activeDays: 21,
  pauses: true,
  pauseEvery: 1,
  pauseDays: defaultPauseDays("pill")!,
  pillTime: "",
  currentUnitStart: "",
  currentUnit: 1,
  fixPosition: false,
};

export const USUAL_LENGTH_LIMITS = { min: 21, max: 45 };
export const PAUSE_EVERY_LIMITS = { min: 1, max: 24 };
export const PAUSE_DAYS_LIMITS = { min: 1, max: 14 };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function pastDay(day: string, today: string): boolean {
  return DAY_RE.test(day) && day <= today;
}

function intIn(n: number, { min, max }: { min: number; max: number }): boolean {
  return Number.isInteger(n) && n >= min && n <= max;
}

export function hasUnits(form: Pick<MethodForm, "kind" | "pauses">): boolean {
  return methodMode(form.kind, form.pauses) === "scheduled";
}

/** Editar sem trocar o tipo (na pílula, os comprimidos ativos e o "Faz pausa?") nem a pausa mantém
 *  a posição salva: o sheet não a pede. Mudar a pausa muda o regime a partir de hoje, e a posição
 *  atual precisa vir junto. */
export function keepsPosition(form: MethodForm, current?: MethodForm): boolean {
  if (!current || form.fixPosition || form.kind !== current.kind) return false;
  if (form.kind === "pill" && (form.activeDays !== current.activeDays || form.pauses !== current.pauses)) return false;
  return !hasUnits(form) || (form.pauseEvery === current.pauseEvery && form.pauseDays === current.pauseDays);
}

export function canFixPosition(form: MethodForm, current?: MethodForm): boolean {
  return keepsPosition(form, current) && methodMode(form.kind, form.pauses) !== "continuous";
}

export function methodFormValid(form: MethodForm, today: string, current?: MethodForm): boolean {
  const position = !keepsPosition(form, current);
  if (form.kind === "pill" && !(TIME_RE.test(form.pillTime) && intIn(form.activeDays, PILL_ACTIVE_DAYS_LIMITS))) {
    return false;
  }
  if (hasUnits(form)) {
    return (
      intIn(form.pauseEvery, PAUSE_EVERY_LIMITS) &&
      intIn(form.pauseDays, PAUSE_DAYS_LIMITS) &&
      (!position ||
        (intIn(form.currentUnit, { min: 1, max: form.pauseEvery }) && pastDay(form.currentUnitStart, today)))
    );
  }
  if (form.kind === "pill") return true;
  if (methodMode(form.kind, form.pauses) === "natural") {
    return (!position || pastDay(form.lastPeriodStart, today)) && intIn(form.usualLength, USUAL_LENGTH_LIMITS);
  }
  return true;
}

export function toMethodInput(form: MethodForm): MethodInput;
export function toMethodInput(form: MethodForm, current?: MethodForm): MethodUpdateInput;
export function toMethodInput(form: MethodForm, current?: MethodForm): MethodUpdateInput {
  const position = !keepsPosition(form, current);
  const units = {
    pauseEvery: form.pauseEvery,
    pauseDays: form.pauseDays,
    ...(position && { currentUnitStart: form.currentUnitStart, currentUnit: form.currentUnit }),
  };
  switch (form.kind) {
    case "none":
    case "copper_iud":
    case "other":
      return {
        kind: form.kind,
        ...(position && { lastPeriodStart: form.lastPeriodStart }),
        usualLength: form.usualLength,
      };
    case "pill":
      return form.pauses
        ? { kind: "pill", activeDays: form.activeDays, pillTime: form.pillTime, ...units }
        : { kind: "pill", activeDays: form.activeDays, pillTime: form.pillTime };
    case "ring":
    case "patch":
      return { kind: form.kind, ...units };
    case "hormonal_iud":
    case "implant":
    case "injection":
      return { kind: form.kind };
  }
}

// A posição fica vazia: editar o mesmo tipo não a usa, e trocar de tipo pede de novo.
export function methodFormFromState(cycle: CycleState): MethodForm {
  const { method } = cycle;
  return {
    ...EMPTY_METHOD_FORM,
    kind: method.kind,
    activeDays: method.activeDays ?? EMPTY_METHOD_FORM.activeDays,
    pauses: method.kind !== "pill" || method.pauseEvery !== null,
    pauseEvery: method.pauseEvery ?? EMPTY_METHOD_FORM.pauseEvery,
    pauseDays: method.pauseDays ?? EMPTY_METHOD_FORM.pauseDays,
    pillTime: method.pillTime ?? "",
    usualLength: method.usualLength ?? EMPTY_METHOD_FORM.usualLength,
  };
}
