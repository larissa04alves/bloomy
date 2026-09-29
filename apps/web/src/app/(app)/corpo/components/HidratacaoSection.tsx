"use client";

import { useState } from "react";

import { useHoldPress } from "../hooks/useHoldPress";
import { waterLevel } from "../hooks/format";
import { type DropBurst, WaterDrop } from "./WaterDrop";

export function HidratacaoSection({
  totalMl,
  goalMl,
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
  const [burst, setBurst] = useState<DropBurst | null>(null);

  const drink = () => {
    if (!portionReady || !canAdd) return;
    onAddPortion();
    setBurst({ id: Date.now(), kind: "add" });
  };
  const undo = () => {
    if (!canRemove) return;
    onRemoveLast();
    setBurst({ id: Date.now(), kind: "remove" });
  };
  const hold = useHoldPress({ onTap: drink, onHold: undo, canHold: canRemove });

  const left = Math.max(0, goalMl - totalMl);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Hidratação</h2>

      <div className="flex items-center justify-between gap-3 rounded-card-lg bg-lilac-tint py-4 pr-5 pl-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-2xl font-bold text-lilac-deep">
            {totalMl} <span className="text-sm opacity-70">/ {goalMl} ml</span>
          </span>
          <span className="text-sm font-bold text-lilac-deep">
            {left > 0 ? `faltam ${left} ml` : "meta batida 💜"}
          </span>
          <span className="text-xs font-semibold text-ink-read">
            {portionReady
              ? `Toque na gota: +${portionMl} ml`
              : "Toque na gota: +1 copo"}
            <br />
            Segure para remover
          </span>
          <button
            type="button"
            onClick={onOpenModal}
            className="mt-1.5 self-start rounded-full bg-white px-3 py-1.5 text-xs font-bold text-lilac-deep"
          >
            Outra quantidade
          </button>
          {/* segurar não existe no teclado nem no leitor de tela */}
          <button
            type="button"
            onClick={undo}
            disabled={!canRemove}
            className="sr-only self-start text-xs font-bold text-lilac-deep focus:not-sr-only disabled:opacity-50"
          >
            Tirar último copo
          </button>
        </div>

        <button
          type="button"
          aria-label={portionReady ? `Beber ${portionMl} ml` : "Beber um copo"}
          aria-disabled={!portionReady || !canAdd}
          {...hold.handlers}
          className="shrink-0 touch-manipulation select-none rounded-full [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lilac"
        >
          <WaterDrop
            level={waterLevel(totalMl, goalMl)}
            totalMl={totalMl}
            goalMl={goalMl}
            holding={hold.holding}
            ringMs={hold.ringMs}
            burst={burst}
            showTotal={false}
          />
        </button>
      </div>
    </section>
  );
}
