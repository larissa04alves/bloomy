"use client";

import { TrashIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

export function ApagarCicloSheet({
  open,
  onOpenChange,
  deleting,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Apagar dados do ciclo?"
      tone="coral"
      icon={<TrashIcon size={20} weight="fill" />}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white disabled:opacity-60"
          >
            {deleting ? "Apagando…" : "Apagar dados do ciclo"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full bg-lilac-tint py-3.5 font-display font-bold text-lilac-deep disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <p className="text-sm font-semibold text-ink-read">
        Apaga menstruações, sintomas, pílula e método. Não dá pra desfazer.
      </p>
    </BottomSheet>
  );
}
