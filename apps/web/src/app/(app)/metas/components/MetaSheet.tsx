"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import type { Tone } from "@/lib/tone";

export type SheetField = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export function MetaSheet({
  open,
  onOpenChange,
  title,
  icon,
  tone,
  fields,
  hint,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  tone: Tone;
  fields: SheetField[];
  /** Linha viva sob os steppers (ex.: "≈ 4 porções por dia"). */
  hint?: (values: Record<string, number>) => string;
  onSave: (values: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  }, [open]);

  const values: Record<string, number> = {
    ...Object.fromEntries(fields.map((f) => [f.key, f.value])),
    ...draft,
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={icon}
      tone={tone}
      footer={
        <button
          type="button"
          onClick={() => {
            onSave(values);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Salvar
        </button>
      }
    >
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">{f.label}</span>
          <Stepper
            value={values[f.key]!}
            min={f.min}
            max={f.max}
            step={f.step}
            unit={f.unit}
            onChange={(next) => setDraft((d) => ({ ...d, [f.key]: next }))}
          />
        </div>
      ))}
      {hint ? (
        <p className="text-center text-sm font-semibold text-ink-faint">
          {hint(values)}
        </p>
      ) : null}
    </BottomSheet>
  );
}
