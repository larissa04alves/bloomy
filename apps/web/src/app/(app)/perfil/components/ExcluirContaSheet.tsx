"use client";

import { TrashIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

import { DELETE_PHRASE } from "../hooks/format";

export function ExcluirContaSheet({
  open,
  onOpenChange,
  value,
  onChange,
  canDelete,
  deleting,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (raw: string) => void;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir sua conta?"
      tone="coral"
      icon={<TrashIcon size={20} weight="fill" />}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!canDelete}
            onClick={onDelete}
            className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white disabled:opacity-60"
          >
            {deleting ? "Excluindo…" : "Excluir conta"}
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
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-ink-read">
          Vamos apagar tudo o que você registrou no Bloomy: água, refeições, remédios,
          treinos, humor, consultas, exames e anexos. Não dá pra desfazer.
        </p>
        <label className="flex flex-col gap-3">
          <span className="text-sm font-bold text-ink">
            Pra confirmar, digite <b className="text-coral">{DELETE_PHRASE}</b>
          </span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={DELETE_PHRASE}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
      </div>
    </BottomSheet>
  );
}
