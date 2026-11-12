"use client";

import { PillIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { Label, toDate, toDay, UNIT_NOUN } from "@/components/cycle-method-sheet";
import { DatePickerField } from "@/components/date-picker-field";
import { Stepper } from "@/components/stepper";
import { dayFor } from "@/server/shared/day";

import type { PackCountRange, PackDraft } from "../hooks/format";

export function CartelaAtualSheet({
  open,
  onOpenChange,
  title,
  noun,
  draft,
  onChange,
  units,
  countRange,
  activeDays,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  noun: (typeof UNIT_NOUN)[keyof typeof UNIT_NOUN];
  draft: PackDraft;
  onChange: (patch: Partial<PackDraft>) => void;
  /** Unidades por sequência; os chips só aparecem com mais de uma. */
  units: number;
  countRange: PackCountRange | null;
  activeDays: number;
  busy: boolean;
  onSave: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={title}
      tone="peach"
      icon={<PillIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={busy || !draft.start}
          onClick={onSave}
          className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach disabled:opacity-60"
        >
          {busy ? "Salvando…" : "Salvar"}
        </button>
      }
    >
      <Label>Começou em</Label>
      <DatePickerField
        typeable
        tone="peach"
        label="Começou em"
        value={toDate(draft.start)}
        maxDate={toDate(dayFor())}
        onChange={(date) => onChange({ start: toDay(date) })}
      />

      {units > 1 ? (
        <>
          <Label>{noun.which}</Label>
          <div className="-mt-2 flex flex-wrap gap-2">
            {Array.from({ length: units }, (_, i) => i + 1).map((n) => (
              <ChoiceChip key={n} tone="peach" selected={draft.unit === n} onClick={() => onChange({ unit: n })}>
                {`${n}${noun.ordinal}`}
              </ChoiceChip>
            ))}
          </div>
        </>
      ) : null}

      {countRange ? (
        <>
          <Label>Pílulas tomadas</Label>
          <div className="-mt-2 flex flex-col gap-1">
            <Stepper
              value={Math.min(Math.max(draft.count, countRange.min), countRange.max)}
              min={countRange.min}
              max={countRange.max}
              unit={`de ${activeDays}`}
              onChange={(count) => onChange({ count })}
            />
            <span className="text-center text-xs font-semibold text-ink-read">{`hoje é a ${countRange.max}ª`}</span>
          </div>
        </>
      ) : null}
    </BottomSheet>
  );
}
