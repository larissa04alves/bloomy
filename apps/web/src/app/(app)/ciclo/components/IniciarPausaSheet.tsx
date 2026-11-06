"use client";

import { MoonIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { DatePickerField } from "@/components/date-picker-field";

import type { PauseSheetView } from "../hooks/useCiclo";

export function IniciarPausaSheet({
  sheet,
  onOpenChange,
  onDayChange,
  busy,
  onConfirm,
}: {
  sheet: PauseSheetView;
  onOpenChange: (open: boolean) => void;
  onDayChange: (date: Date | undefined) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <BottomSheet
      open={sheet.open}
      onOpenChange={onOpenChange}
      title="Em que dia a pausa começou?"
      icon={<MoonIcon size={22} weight="fill" />}
      tone="peach"
      footer={
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy || !sheet.value}
            onClick={onConfirm}
            className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach disabled:opacity-60"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full bg-peach-tint py-3.5 font-display font-bold text-peach-deep disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">Início da pausa</span>
          <DatePickerField
            typeable
            tone="peach"
            label="Início da pausa"
            value={sheet.value}
            minDate={sheet.minDate}
            maxDate={sheet.maxDate}
            onChange={onDayChange}
          />
        </div>
        {sheet.effect ? <p className="text-sm font-semibold text-ink-read">{sheet.effect}</p> : null}
      </div>
    </BottomSheet>
  );
}
