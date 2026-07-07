"use client";

import { DropIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { Stepper } from "@/components/stepper";

const SHORTCUTS = [200, 250, 500, 750];
const SHORTCUT_LABELS: Record<number, string> = { 200: "200", 250: "250", 500: "500", 750: "Garrafa" };

export function WaterModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ml: number) => void;
}) {
  const [ml, setMl] = useState(500);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar água"
      tone="lilac"
      icon={<DropIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          onClick={() => {
            onConfirm(ml);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Registrar
        </button>
      }
    >
      <Stepper value={ml} min={50} max={2000} step={50} onChange={setMl} unit="ml" />
      <div className="flex gap-2">
        {SHORTCUTS.map((s) => (
          <ChoiceChip key={s} selected={ml === s} onClick={() => setMl(s)}>
            {SHORTCUT_LABELS[s]}
          </ChoiceChip>
        ))}
      </div>
    </BottomSheet>
  );
}
