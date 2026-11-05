"use client";

import { SignOutIcon, TrashIcon } from "@phosphor-icons/react";

const ROW =
  "flex w-full items-center gap-3 rounded-control px-2 py-3 text-left text-sm font-bold disabled:opacity-60";
const CHIP = "grid size-8 shrink-0 place-items-center rounded-[14px]";

export function ContaSection({
  signingOut,
  onSignOut,
  onDelete,
}: {
  signingOut: boolean;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Conta</h2>
      <div className="flex flex-col rounded-card bg-white p-2 shadow-card">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className={`${ROW} text-coral`}
        >
          <span className={`${CHIP} bg-coral-tint`}>
            <SignOutIcon size={18} weight="fill" />
          </span>
          {signingOut ? "Saindo…" : "Sair"}
        </button>
        <div className="mx-2 h-px bg-hairline-soft" />
        <button type="button" onClick={onDelete} className={`${ROW} text-ink-read`}>
          <span className={`${CHIP} bg-lilac-tint-soft text-ink-read`}>
            <TrashIcon size={18} weight="fill" />
          </span>
          Excluir conta
        </button>
      </div>
    </section>
  );
}
