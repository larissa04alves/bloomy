"use client";

import { CakeIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

export function NascimentoSheet({
  open,
  onOpenChange,
  value,
  onChange,
  canSave,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (raw: string) => void;
  canSave: boolean;
  onSave: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nascimento"
      tone="lilac"
      icon={<CakeIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          Salvar
        </button>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink-read">Data de nascimento</span>
        <input
          inputMode="numeric"
          autoComplete="bday"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="dd/mm/aaaa"
          className="rounded-control border border-hairline bg-white px-4 py-3 font-display text-lg font-bold text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
    </BottomSheet>
  );
}
