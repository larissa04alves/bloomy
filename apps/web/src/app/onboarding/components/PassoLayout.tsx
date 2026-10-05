"use client";

import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

import type { OnboardingStep } from "../hooks/format";

export function PassoLayout({
  step,
  total,
  tone,
  icon,
  title,
  subtitle,
  ctaLabel,
  skipLabel = "Pular",
  pending,
  onNext,
  onSkip,
  onBack,
  children,
}: {
  step: OnboardingStep;
  /** 3 ou 4: o passo de lembretes só existe quando há permissão a pedir. */
  total: number;
  tone: Tone;
  icon: ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  skipLabel?: string;
  pending: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const t = TONE[tone];

  return (
    <div className="flex min-h-dvh flex-col px-7 pt-4 pb-8">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              n <= step ? "bg-lilac" : "bg-control-off",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold text-ink-faint">
          Passo {step} de {total}
        </span>
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-xs font-bold text-lilac-deep disabled:opacity-60"
        >
          {skipLabel}
        </button>
      </div>

      <div
        key={step}
        className="animate-fade-in flex flex-1 flex-col items-center justify-center text-center"
      >
        <div
          className={cn(
            "grid size-28 place-items-center rounded-full",
            t.tint,
            t.deep,
          )}
        >
          {icon}
        </div>
        <h1 className="max-w-64 pt-5 font-display text-2xl font-bold text-ink">
          {title}
        </h1>
        <p className="max-w-64 pt-2 pb-7 text-sm font-semibold text-ink-read">
          {subtitle}
        </p>
        {children}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="w-full rounded-control bg-lilac py-4 font-display font-bold text-white shadow-btn disabled:opacity-60"
      >
        {ctaLabel}
      </button>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="pt-3 text-sm font-bold text-ink-read disabled:opacity-60"
        >
          Voltar
        </button>
      ) : null}
    </div>
  );
}
