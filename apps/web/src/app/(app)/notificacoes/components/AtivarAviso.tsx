"use client";

import { BellRingingIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";

/** Convite para registrar este aparelho. O botão é obrigatório: o Chrome só mostra
 *  o pedido de permissão a partir de um toque. */
export function AtivarAviso({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-card bg-lilac-tint p-4">
      <IconChip
        tone="lilac"
        icon={<BellRingingIcon size={18} weight="fill" />}
        variant="white"
        size="md"
      />
      <span className="flex flex-1 flex-col gap-2">
        <span className="flex flex-col gap-1">
          <span className="font-display text-sm font-bold text-lilac-deep">
            Ative os lembretes neste aparelho
          </span>
          <span className="text-xs font-semibold text-lilac-deep">
            Sem isso as notificações abaixo não chegam aqui.
          </span>
        </span>
        <button
          type="button"
          onClick={onActivate}
          className="self-start rounded-control bg-lilac px-4 py-2 font-display text-sm font-bold text-white shadow-btn"
        >
          Ativar
        </button>
      </span>
    </div>
  );
}
