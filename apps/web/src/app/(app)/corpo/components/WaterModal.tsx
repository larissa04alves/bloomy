"use client";

import { DropIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { Stepper } from "@/components/stepper";

import { waterShortcuts } from "../hooks/format";

export function WaterModal({
  open,
  onOpenChange,
  onConfirm,
  portionMl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ml: number) => void;
  /** Porção configurada na meta — vira atalho e valor inicial do stepper. */
  portionMl: number;
}) {
  const [ml, setMl] = useState(portionMl);

  // A Corpo monta o modal antes do profile chegar, então o `useState` inicial
  // pega o fallback de 500. Re-semear na abertura é o que faz o stepper nascer
  // na porção realmente configurada.
  useEffect(() => {
    if (open) setMl(portionMl);
  }, [open, portionMl]);

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
      <div className="flex flex-wrap gap-2">
        {waterShortcuts(portionMl).map((s) => (
          <ChoiceChip key={s} selected={ml === s} onClick={() => setMl(s)}>
            {s}
          </ChoiceChip>
        ))}
      </div>
    </BottomSheet>
  );
}
