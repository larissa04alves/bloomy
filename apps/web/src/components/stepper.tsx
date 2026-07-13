"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  unit?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="grid size-12 place-items-center rounded-full bg-lilac-tint text-lilac-deep disabled:text-ink-faint"
      >
        <MinusIcon size={22} weight="bold" />
      </button>
      <div className="flex flex-col items-center">
        <span className="font-display text-4xl font-bold text-ink">{value}</span>
        {unit ? <span className="text-sm font-semibold text-ink-read">{unit}</span> : null}
      </div>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="grid size-12 place-items-center rounded-full bg-lilac text-white shadow-btn disabled:opacity-60"
      >
        <PlusIcon size={22} weight="bold" />
      </button>
    </div>
  );
}
