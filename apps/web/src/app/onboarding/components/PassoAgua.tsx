"use client";

import { DropIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";
import { portions } from "@/server/shared/units";

import { portionHint } from "../hooks/format";
import { PassoLayout } from "./PassoLayout";

const MAX_GOTAS = 12;

export function PassoAgua({
  waterMl,
  portionMl,
  pending,
  onWaterMl,
  onPortionMl,
  onNext,
  onSkip,
}: {
  waterMl: number;
  portionMl: number;
  pending: boolean;
  onWaterMl: (ml: number) => void;
  onPortionMl: (ml: number) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { target } = portions(0, waterMl, portionMl);

  return (
    <PassoLayout
      step={1}
      tone="lilac"
      icon={<DropIcon size={52} weight="fill" />}
      title="Quanto de água por dia?"
      subtitle="A gente conta as porções ao longo do dia."
      ctaLabel="Continuar"
      pending={pending}
      onNext={onNext}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">
            Meta do dia
          </span>
          <Stepper
            value={waterMl}
            min={500}
            max={5000}
            step={100}
            unit="ml"
            onChange={onWaterMl}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">
            Cada porção
          </span>
          <Stepper
            value={portionMl}
            min={100}
            max={2000}
            step={50}
            unit="ml"
            onChange={onPortionMl}
          />
        </div>
        <p className="text-sm font-semibold text-ink-faint">
          {portionHint(waterMl, portionMl)}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
          {Array.from({ length: Math.min(target, MAX_GOTAS) }, (_, i) => (
            <DropIcon key={i} size={20} weight="fill" className="text-lilac" />
          ))}
        </div>
      </div>
    </PassoLayout>
  );
}
