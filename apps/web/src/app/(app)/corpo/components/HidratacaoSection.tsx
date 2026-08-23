"use client";

import { DropIcon, PlusIcon } from "@phosphor-icons/react";

import { ProgressBar } from "@/components/progress-bar";

import { dropSize } from "../hooks/format";

const MAX_DROPS = 12;

export function HidratacaoSection({
  totalMl,
  goalMl,
  done,
  target,
  portionMl,
  portionReady,
  onAddPortion,
  onOpenModal,
}: {
  totalMl: number;
  goalMl: number;
  done: number;
  target: number;
  portionMl: number;
  /** Porção já carregada do profile. Falso = o `portionMl` ainda é o fallback. */
  portionReady: boolean;
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
        <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
          {Array.from({ length: target }, (_, i) => (
            <DropIcon
              key={i}
              size={dropSize(target)}
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
          disabled={!portionReady}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-lilac font-bold text-white shadow-btn disabled:opacity-60 disabled:shadow-none"
        >
          <PlusIcon size={18} weight="bold" />
          {portionReady ? `Adicionar ${portionMl} ml` : "Adicionar porção"}
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
