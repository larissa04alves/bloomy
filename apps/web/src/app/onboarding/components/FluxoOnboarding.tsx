"use client";

import { useOnboarding } from "../hooks/useOnboarding";
import { PassoAgua } from "./PassoAgua";
import { PassoLembretes } from "./PassoLembretes";
import { PassoRefeicoes } from "./PassoRefeicoes";
import { PassoTreino } from "./PassoTreino";

export function FluxoOnboarding() {
  const {
    state,
    pending,
    totalSteps,
    setWaterMl,
    setPortionMl,
    setMeals,
    toggleDay,
    advance,
    activatePush,
    back,
    skip,
  } = useOnboarding();

  if (state.step === 1) {
    return (
      <PassoAgua
        total={totalSteps}
        waterMl={state.waterMl}
        portionMl={state.portionMl}
        pending={pending}
        onWaterMl={setWaterMl}
        onPortionMl={setPortionMl}
        onNext={advance}
        onSkip={skip}
      />
    );
  }

  if (state.step === 2) {
    return (
      <PassoRefeicoes
        total={totalSteps}
        meals={state.meals}
        pending={pending}
        onMeals={setMeals}
        onNext={advance}
        onBack={back}
        onSkip={skip}
      />
    );
  }

  if (state.step === 3) {
    return (
      <PassoTreino
        total={totalSteps}
        selected={state.workoutDays}
        pending={pending}
        onToggle={toggleDay}
        onNext={advance}
        onBack={back}
        onSkip={skip}
      />
    );
  }

  return (
    <PassoLembretes
      pending={pending}
      onActivate={() => void activatePush()}
      onBack={back}
      onSkip={skip}
    />
  );
}
