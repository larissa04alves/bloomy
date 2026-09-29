"use client";

import { DropIcon, MinusIcon } from "@phosphor-icons/react";

import { ProgressBar } from "@/components/progress-bar";

import { dropFill } from "../hooks/format";

/** Até 3 linhas de 8 gotas; acima disso a fileira deixa de ser legível e vira barra. */
const MAX_DROPS = 24;
const DROPS_PER_ROW = 8;

export function HidratacaoSection({
  totalMl,
  goalMl,
  target,
  portionMl,
  portionReady,
  canAdd,
  canRemove,
  onAddPortion,
  onRemoveLast,
  onOpenModal,
}: {
  totalMl: number;
  goalMl: number;
  target: number;
  portionMl: number;
  /** Porção já carregada do profile. Falso = o `portionMl` ainda é o fallback. */
  portionReady: boolean;
  /** Falso enquanto uma remoção está em voo. */
  canAdd: boolean;
  /** Falso com o dia zerado ou com um add/remoção ainda em voo. */
  canRemove: boolean;
  onAddPortion: () => void;
  onRemoveLast: () => void;
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
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(target, DROPS_PER_ROW)}, minmax(0, 38px))`,
          }}
          aria-hidden="true"
        >
          {Array.from({ length: target }, (_, i) => {
            const fill = dropFill(totalMl, portionMl, i);
            return (
              <div key={i} className="relative aspect-square">
                <DropIcon
                  weight="fill"
                  className="absolute inset-0 size-full text-control-off"
                />
                <DropIcon
                  weight="fill"
                  className="absolute inset-0 size-full text-lilac"
                  // enche de baixo para cima, como nível de água
                  style={{ clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <ProgressBar value={goalMl > 0 ? totalMl / goalMl : 0} tone="lilac" />
      )}

      <div className="flex h-11 items-center overflow-hidden rounded-full bg-lilac-tint font-bold text-lilac-deep">
        <button
          type="button"
          aria-label="Tirar último registro"
          onClick={onRemoveLast}
          disabled={!canRemove}
          className="grid h-full w-13 shrink-0 place-items-center disabled:text-ink-faint disabled:opacity-50"
        >
          <MinusIcon size={17} weight="bold" />
        </button>
        <span className="h-5 w-px shrink-0 bg-ring-track" aria-hidden="true" />
        <button
          type="button"
          aria-label={portionReady ? `Adicionar ${portionMl} ml` : "Adicionar copo"}
          onClick={onAddPortion}
          disabled={!portionReady || !canAdd}
          className="flex h-full flex-1 items-center justify-center gap-1.5 text-sm disabled:opacity-60"
        >
          <DropIcon size={17} weight="fill" />
          {portionReady ? `+ ${portionMl} ml` : "+ copo"}
        </button>
        <span className="h-5 w-px shrink-0 bg-ring-track" aria-hidden="true" />
        <button
          type="button"
          aria-label="Escolher outra quantidade"
          onClick={onOpenModal}
          className="grid h-full w-18 shrink-0 place-items-center text-xs"
        >
          Outra
        </button>
      </div>
    </section>
  );
}
