"use client";

import { ForkKnifeIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";

import { PassoLayout } from "./PassoLayout";

export function PassoRefeicoes({
  total,
  meals,
  pending,
  onMeals,
  onNext,
  onBack,
  onSkip,
}: {
  total: number;
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
      total={total}
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
