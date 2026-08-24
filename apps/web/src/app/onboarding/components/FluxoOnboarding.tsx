"use client";

import { useOnboarding } from "../hooks/useOnboarding";
import { PassoAgua } from "./PassoAgua";
import { PassoRefeicoes } from "./PassoRefeicoes";
import { PassoTreino } from "./PassoTreino";

export function FluxoOnboarding() {
  const {
    state,
    pending,
    setWaterMl,
    setPortionMl,
    setMeals,
    toggleDay,
    advance,
    back,
    skip,
  } = useOnboarding();

  if (state.step === 1) {
    return (
      <PassoAgua
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
        meals={state.meals}
        pending={pending}
        onMeals={setMeals}
        onNext={advance}
        onBack={back}
        onSkip={skip}
      />
    );
  }

  return (
    <PassoTreino
      selected={state.workoutDays}
      pending={pending}
      onToggle={toggleDay}
      onNext={advance}
      onBack={back}
      onSkip={skip}
    />
  );
}
