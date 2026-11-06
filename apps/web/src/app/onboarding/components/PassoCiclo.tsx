"use client";

import { FlowerLotusIcon } from "@phosphor-icons/react";

import { CyclePrivacyCard } from "@/components/cycle-privacy-card";

import { PassoLayout } from "./PassoLayout";

export function PassoCiclo({
  total,
  pending,
  onActivate,
  onBack,
  onSkip,
}: {
  total: number;
  pending: boolean;
  onActivate: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={5}
      total={total}
      tone="peach"
      icon={<FlowerLotusIcon size={56} weight="fill" />}
      title="Quer acompanhar seu ciclo?"
      subtitle="Entenda melhor o seu corpo: anote como você está a cada dia e saiba quando o próximo ciclo deve chegar."
      ctaLabel="Ativar ciclo"
      ctaTone="peach"
      declineLabel="Agora não"
      pending={pending}
      onNext={onActivate}
      onBack={onBack}
      onSkip={onSkip}
    >
      <CyclePrivacyCard className="max-w-72" />
    </PassoLayout>
  );
}
