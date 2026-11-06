"use client";

import { MoonIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

export function ConfirmarAncoraSheet({
  open,
  onOpenChange,
  title,
  detail,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  detail: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={<MoonIcon size={22} weight="fill" />}
      tone="peach"
      footer={
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
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
      <p className="text-sm font-semibold text-ink-read">{detail}</p>
    </BottomSheet>
  );
}
