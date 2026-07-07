"use client";

import { DropIcon, PlusIcon } from "@phosphor-icons/react";

export function HidratacaoSection({
  done,
  target,
  onAddGarrafa,
  onOpenModal,
}: {
  done: number;
  target: number;
  onAddGarrafa: () => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">Hidratação</h2>
        <span className="text-[13px] font-semibold text-ink-read">
          {done} de {target} garrafas
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: target }, (_, i) => (
          <DropIcon
            key={i}
            size={28}
            weight="fill"
            className={i < done ? "text-lilac" : "text-control-off"}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddGarrafa}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-lilac py-3 font-display text-[15px] font-bold text-white shadow-btn"
        >
          <PlusIcon size={18} weight="bold" /> Adicionar garrafa
        </button>
        <button
          type="button"
          aria-label="Escolher quantidade"
          onClick={onOpenModal}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-lilac-tint text-lilac-deep"
        >
          <DropIcon size={22} weight="fill" />
        </button>
      </div>
    </section>
  );
}
