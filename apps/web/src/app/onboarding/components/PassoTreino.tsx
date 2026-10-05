"use client";

import { BarbellIcon } from "@phosphor-icons/react";

import { workoutDaysHint } from "../hooks/format";
import { PassoLayout } from "./PassoLayout";
import { SeletorDias } from "./SeletorDias";

export function PassoTreino({
  total,
  selected,
  pending,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: {
  total: number;
  selected: Set<number>;
  pending: boolean;
  onToggle: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={3}
      total={total}
      tone="pink"
      icon={<BarbellIcon size={50} weight="fill" />}
      title="Quantos dias de treino?"
      subtitle="Escolha os dias que você costuma treinar."
      ctaLabel={total === 3 ? "Começar a usar" : "Continuar"}
      pending={pending}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col items-center gap-4">
        <SeletorDias selected={selected} onToggle={onToggle} />
        <p className="max-w-64 text-sm font-bold text-pink-deep">{workoutDaysHint(selected.size)}</p>
      </div>
    </PassoLayout>
  );
}
