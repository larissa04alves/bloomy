"use client";

import { DropIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";
import { waterSubtitle } from "@/lib/water";

import { PassoLayout } from "./PassoLayout";

export function PassoAgua({
  total,
  waterMl,
  portionMl,
  recommendedMl,
  pending,
  onWaterMl,
  onPortionMl,
  onNext,
  onBack,
  onSkip,
}: {
  total: number;
  waterMl: number;
  portionMl: number;
  /** Meta sugerida pelo peso do passo anterior; `null` sem peso. */
  recommendedMl: number | null;
  pending: boolean;
  onWaterMl: (ml: number) => void;
  onPortionMl: (ml: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const subtitle = waterSubtitle(waterMl, recommendedMl);

  return (
    <PassoLayout
      step={2}
      total={total}
      tone="lilac"
      icon={<DropIcon size={52} weight="fill" />}
      title="Quanto de água por dia?"
      subtitle={
        subtitle.restore && recommendedMl !== null ? (
          <>
            {subtitle.text} ·{" "}
            <button
              type="button"
              onClick={() => onWaterMl(recommendedMl)}
              className="font-bold text-lilac-deep underline"
            >
              restaurar
            </button>
          </>
        ) : (
          subtitle.text
        )
      }
      ctaLabel="Continuar"
      pending={pending}
      onNext={onNext}
      onBack={onBack}
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
      </div>
    </PassoLayout>
  );
}
