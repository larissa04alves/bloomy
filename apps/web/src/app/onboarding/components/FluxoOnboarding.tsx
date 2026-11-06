"use client";

import { useOnboarding } from "../hooks/useOnboarding";
import { PassoAgua } from "./PassoAgua";
import { PassoCiclo } from "./PassoCiclo";
import { PassoLembretes } from "./PassoLembretes";
import { PassoRefeicoes } from "./PassoRefeicoes";
import { PassoSobreVoce } from "./PassoSobreVoce";
import { PassoTreino } from "./PassoTreino";

export function FluxoOnboarding() {
  const {
    state,
    pending,
    bodyErrors,
    canContinue,
    touchField,
    totalSteps,
    setHeight,
    setWeight,
    setBirthDate,
    setWaterMl,
    setPortionMl,
    setMeals,
    toggleDay,
    advance,
    activateCycle,
    skipCycle,
    activatePush,
    back,
    skip,
  } = useOnboarding();

  if (state.step === 1) {
    return (
      <PassoSobreVoce
        total={totalSteps}
        heightRaw={state.heightRaw}
        weightRaw={state.weightRaw}
        birthRaw={state.birthRaw}
        errors={bodyErrors}
        canContinue={canContinue}
        pending={pending}
        onHeight={setHeight}
        onWeight={setWeight}
        onBirthDate={setBirthDate}
        onBlurField={touchField}
        onNext={advance}
        onSkip={skip}
      />
    );
  }

  if (state.step === 2) {
    return (
      <PassoAgua
        total={totalSteps}
        waterMl={state.waterMl}
        portionMl={state.portionMl}
        recommendedMl={state.recommendedMl}
        pending={pending}
        onWaterMl={setWaterMl}
        onPortionMl={setPortionMl}
        onNext={advance}
        onBack={back}
        onSkip={skip}
      />
    );
  }

  if (state.step === 3) {
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

  if (state.step === 4) {
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

  if (state.step === 5) {
    return (
      <PassoCiclo
        total={totalSteps}
        pending={pending}
        onActivate={activateCycle}
        onBack={back}
        onSkip={skipCycle}
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
