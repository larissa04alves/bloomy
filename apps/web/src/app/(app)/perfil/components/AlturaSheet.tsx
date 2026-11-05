"use client";

import { RulerIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import { HEIGHT_CM_LIMITS } from "@/lib/body";

import { parseCm } from "../hooks/format";

export function AlturaSheet({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number;
  onChange: (cm: number) => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Altura"
      tone="lilac"
      icon={<RulerIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Salvar
        </button>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <Stepper
          value={value}
          min={HEIGHT_CM_LIMITS.min}
          max={HEIGHT_CM_LIMITS.max}
          step={1}
          unit="cm"
          parse={parseCm}
          onChange={onChange}
        />
        <span className="text-center text-xs font-semibold text-ink-read">
          toque no número pra digitar
        </span>
      </div>
    </BottomSheet>
  );
}
