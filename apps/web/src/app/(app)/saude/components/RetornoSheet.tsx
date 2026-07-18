"use client";

import { CalendarHeartIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";

const MONTH_OPTIONS = [1, 3, 6, 12];

export function RetornoSheet({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (opts: { needsReturn: boolean; followUpMonths?: number }) => void;
}) {
  const [months, setMonths] = useState<number>(1);

  useEffect(() => {
    if (open) setMonths(1);
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      tone="lilac"
      icon={<CalendarHeartIcon size={22} weight="fill" />}
      footer={
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onConfirm({ needsReturn: true, followUpMonths: months });
              onOpenChange(false);
            }}
            className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
          >
            Agendar retorno
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({ needsReturn: false });
              onOpenChange(false);
            }}
            className="w-full rounded-full bg-lilac-tint py-3.5 font-display font-bold text-lilac-deep"
          >
            Não precisa
          </button>
        </div>
      }
    >
      <p className="text-sm font-semibold text-ink-read">
        Quer agendar um retorno? Criamos um lembrete de "a agendar".
      </p>
      <div className="flex flex-wrap gap-2">
        {MONTH_OPTIONS.map((n) => (
          <ChoiceChip
            key={n}
            selected={months === n}
            onClick={() => setMonths(n)}
          >
            {n === 1 ? "1 mês" : `${n} meses`}
          </ChoiceChip>
        ))}
      </div>
    </BottomSheet>
  );
}
