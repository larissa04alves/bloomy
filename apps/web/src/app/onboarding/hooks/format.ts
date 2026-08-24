import { DEFAULT_GOAL_TARGETS, type OnboardingBody } from "@/lib/api-types";
import { portions } from "@/server/shared/units";

export type OnboardingState = {
  step: 1 | 2 | 3;
  waterMl: number;
  portionMl: number;
  meals: number;
  workoutDays: Set<number>;
};

export function portionHint(goalMl: number, portionMl: number): string {
  const { target } = portions(0, goalMl, portionMl);
  return target === 1 ? "≈ 1 porção por dia" : `≈ ${target} porções por dia`;
}

/** Hint do passo 3. Zero anuncia o default em vez de aplicá-lo em silêncio. */
export function workoutDaysHint(count: number): string {
  if (count === 0) {
    return `Sem dias escolhidos — vamos usar ${DEFAULT_GOAL_TARGETS.workout} dias por semana`;
  }
  return count === 1 ? "1 dia por semana" : `${count} dias por semana`;
}

/** State → body do POST. Zero dias vira o default: `GOAL_LIMITS.workout.min` é 1. */
export function onboardingPayload(state: OnboardingState): OnboardingBody {
  return {
    waterMl: state.waterMl,
    portionMl: state.portionMl,
    meals: state.meals,
    workoutDays:
      state.workoutDays.size === 0
        ? DEFAULT_GOAL_TARGETS.workout
        : state.workoutDays.size,
  };
}
