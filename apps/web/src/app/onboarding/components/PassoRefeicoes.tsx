"use client";

import { ForkKnifeIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";

import { PassoLayout } from "./PassoLayout";

export function PassoRefeicoes({
  meals,
  pending,
  onMeals,
  onNext,
  onBack,
  onSkip,
}: {
  meals: number;
  pending: boolean;
  onMeals: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={2}
      tone="green"
      icon={<ForkKnifeIcon size={50} weight="fill" />}
      title="Quantas refeições por dia?"
      subtitle="Sem contar calorias — só pra você não esquecer."
      ctaLabel="Continuar"
      pending={pending}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col gap-6">
        <Stepper value={meals} min={1} max={8} step={1} onChange={onMeals} />
      </div>
    </PassoLayout>
  );
}
