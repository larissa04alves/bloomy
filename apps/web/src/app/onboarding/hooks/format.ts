import type { Route } from "next";

import { DEFAULT_GOAL_TARGETS, type OnboardingBody } from "@/lib/api-types";
import {
  BIRTH_DATE_MIN,
  HEIGHT_CM_LIMITS,
  parseBrDate,
  WEIGHT_GRAMS_LIMITS,
} from "@/lib/body";
import { ATIVAR_HREF } from "@/lib/cycle";
import { parseKg, recommendedWaterMl } from "@/lib/water";
import { dayFor } from "@/server/shared/day";

/** 1 = "Sobre você"; 2–4 são as metas (água, refeições, treino); 5 pergunta do
 *  ciclo; 6 pede a permissão de notificação. */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export type OnboardingState = {
  step: OnboardingStep;
  /** Texto cru dos inputs ("" = não informado): o peso aceita vírgula e precisa
   *  sobreviver a estados intermediários como "62,". */
  heightRaw: string;
  weightRaw: string;
  /** Nascimento como a pessoa digita, `dd/mm/aaaa`. */
  birthRaw: string;
  /** Meta sugerida pelo peso; `null` quando o peso não foi informado. */
  recommendedMl: number | null;
  waterMl: number;
  portionMl: number;
  meals: number;
  workoutDays: Set<number>;
  /** "Ativar" no passo do ciclo só marca a intenção: a ativação acontece em /ciclo/ativar. */
  cycleIntent: boolean;
};

export type BodyField = "height" | "weight" | "birthDate";
export type BodyErrors = Partial<Record<BodyField, string>>;

/** Erros que a tela mostra: só de campos que já perderam o foco. Enquanto a pessoa
 *  digita "165", o "1" seria "fora da faixa" — o CTA bloqueia, mas sem gritar. */
export function visibleErrors(errors: BodyErrors, touched: ReadonlySet<BodyField>): BodyErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => touched.has(field as BodyField)),
  );
}

/** O passo de lembretes só existe quando a permissão ainda não foi pedida
 *  (`askPush`): concedida, negada ou sem suporte, não há o que perguntar. */
export function nextStep(step: OnboardingStep, askPush: boolean): OnboardingStep | "finish" {
  if (step < 5) return (step + 1) as OnboardingStep;
  if (step === 5 && askPush) return 6;
  return "finish";
}

/** "Pular" dispensa as metas, não as perguntas do ciclo e da permissão: sem a
 *  permissão os lembretes, que nascem ligados, nunca chegam a este aparelho. No
 *  "Sobre você" é diferente — pula só os dados do corpo e segue para a água. */
export function skipTarget(step: OnboardingStep, askPush: boolean): OnboardingStep | "finish" {
  if (step === 1) return 2;
  if (step < 5) return 5;
  return step === 5 && askPush ? 6 : "finish";
}

export function finishHref(state: OnboardingState): Route {
  return state.cycleIntent ? ATIVAR_HREF : "/home";
}

function parseCm(raw: string): number | null {
  const text = raw.trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

const weightGrams = (raw: string): number | null => {
  const kg = parseKg(raw);
  return kg === null ? null : Math.round(kg * 1000);
};

/** Campo preenchido fora da faixa vira erro; vazio é "não informado" e passa. */
export function bodyErrors(state: OnboardingState, today: string = dayFor()): BodyErrors {
  const errors: BodyErrors = {};

  if (state.heightRaw.trim()) {
    const cm = parseCm(state.heightRaw);
    if (cm === null || cm < HEIGHT_CM_LIMITS.min || cm > HEIGHT_CM_LIMITS.max) {
      errors.height = `Altura entre ${HEIGHT_CM_LIMITS.min} e ${HEIGHT_CM_LIMITS.max} cm`;
    }
  }
  if (state.weightRaw.trim()) {
    const g = weightGrams(state.weightRaw);
    if (g === null || g < WEIGHT_GRAMS_LIMITS.min || g > WEIGHT_GRAMS_LIMITS.max) {
      errors.weight = `Peso entre ${WEIGHT_GRAMS_LIMITS.min / 1000} e ${WEIGHT_GRAMS_LIMITS.max / 1000} kg`;
    }
  }
  if (state.birthRaw.trim()) {
    const iso = parseBrDate(state.birthRaw);
    if (iso === null || iso < BIRTH_DATE_MIN || iso > today) {
      errors.birthDate = "Data de nascimento inválida";
    }
  }
  return errors;
}

/** Saída do passo 1. A meta só é (re)calculada quando a recomendação muda — voltar
 *  e avançar sem trocar o peso preserva o ajuste que a pessoa fez à mão. */
export function applyBodyStep(state: OnboardingState): OnboardingState {
  const kg = parseKg(state.weightRaw);
  if (kg === null) {
    // Sem peso, a meta que só existia por causa dele volta ao default; ajuste à mão fica.
    const derived = state.recommendedMl !== null && state.waterMl === state.recommendedMl;
    return {
      ...state,
      recommendedMl: null,
      waterMl: derived ? DEFAULT_GOAL_TARGETS.water : state.waterMl,
    };
  }

  const recommendedMl = recommendedWaterMl(kg);
  if (recommendedMl === state.recommendedMl) return state;
  return { ...state, recommendedMl, waterMl: recommendedMl };
}

/** "Pular" no "Sobre você" é não informar: descarta o digitado e o que derivou dele. */
export function skipBodyStep(state: OnboardingState): OnboardingState {
  return applyBodyStep({ ...state, heightRaw: "", weightRaw: "", birthRaw: "" });
}

/** Hint do passo de treino. Zero anuncia o default em vez de aplicá-lo em silêncio. */
export function workoutDaysHint(count: number): string {
  if (count === 0) {
    return `Sem dias escolhidos — vamos usar ${DEFAULT_GOAL_TARGETS.workout} dias por semana`;
  }
  return count === 1 ? "1 dia por semana" : `${count} dias por semana`;
}

/** State → body do POST. Zero dias vira o default: `GOAL_LIMITS.workout.min` é 1.
 *  Dados do corpo só viajam quando informados. */
export function onboardingPayload(state: OnboardingState): OnboardingBody {
  const heightCm = parseCm(state.heightRaw);
  const grams = weightGrams(state.weightRaw);
  const birthDate = parseBrDate(state.birthRaw);

  return {
    waterMl: state.waterMl,
    portionMl: state.portionMl,
    meals: state.meals,
    workoutDays:
      state.workoutDays.size === 0
        ? DEFAULT_GOAL_TARGETS.workout
        : state.workoutDays.size,
    ...(heightCm !== null && { heightCm }),
    ...(grams !== null && { weightGrams: grams }),
    ...(birthDate !== null && { birthDate }),
  };
}
