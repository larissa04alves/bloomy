"use client";

import { DropIcon, PlusIcon } from "@phosphor-icons/react";

import { ProgressBar } from "@/components/progress-bar";

const MAX_DROPS = 12;

export function HidratacaoSection({
  totalMl,
  goalMl,
  done,
  target,
  portionMl,
  onAddPortion,
  onOpenModal,
}: {
  totalMl: number;
  goalMl: number;
  done: number;
  target: number;
  portionMl: number;
  onAddPortion: () => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-base font-bold text-ink">
          Hidratação
        </h2>
        <span className="font-display text-base font-bold text-lilac-deep">
          {totalMl} de {goalMl} ml
        </span>
      </div>

      {target <= MAX_DROPS ? (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: target }, (_, i) => (
            <DropIcon
              key={i}
              size={28}
              weight="fill"
              className={i < done ? "text-lilac" : "text-control-off"}
            />
          ))}
        </div>
      ) : (
        <ProgressBar value={goalMl > 0 ? totalMl / goalMl : 0} tone="lilac" />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddPortion}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-lilac font-bold text-white shadow-btn"
        >
          <PlusIcon size={18} weight="bold" /> Adicionar {portionMl} ml
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
