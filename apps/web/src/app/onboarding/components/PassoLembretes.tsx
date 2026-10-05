"use client";

import { BellRingingIcon } from "@phosphor-icons/react";

import { PassoLayout } from "./PassoLayout";

export function PassoLembretes({
  pending,
  onActivate,
  onBack,
  onSkip,
}: {
  pending: boolean;
  onActivate: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={4}
      total={4}
      tone="lilac"
      icon={<BellRingingIcon size={50} weight="fill" />}
      title="Quer receber lembretes?"
      subtitle="Água, remédios, treino e check-in no horário, mesmo com o app fechado."
      ctaLabel="Ativar lembretes"
      skipLabel="Agora não"
      pending={pending}
      onNext={onActivate}
      onBack={onBack}
      onSkip={onSkip}
    >
      <p className="max-w-64 text-sm font-bold text-lilac-deep">
        Você ajusta cada um depois, em Notificações.
      </p>
    </PassoLayout>
  );
}
