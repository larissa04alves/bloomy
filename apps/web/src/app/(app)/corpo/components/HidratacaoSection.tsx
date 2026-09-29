"use client";

import { useWaterDrop } from "../hooks/useWaterDrop";
import { WaterDrop } from "./WaterDrop";

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
  const drop = useWaterDrop({
    totalMl,
    goalMl,
    portionReady,
    canAdd,
    canRemove,
    onAddPortion,
    onRemoveLast,
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Hidratação</h2>

      <div className="flex items-center justify-between gap-3 rounded-card-lg bg-lilac-tint py-4 pr-5 pl-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display text-2xl font-bold text-lilac-deep">
            {totalMl} <span className="text-sm opacity-70">/ {goalMl} ml</span>
          </span>
          <span className="text-sm font-bold text-lilac-deep">
            {drop.leftMl > 0 ? `faltam ${drop.leftMl} ml` : "meta batida 💜"}
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
            onClick={drop.undo}
            // aria-disabled (não disabled): o foco não se perde enquanto a remoção está em voo
            aria-disabled={!canRemove}
            className="sr-only self-start text-xs font-bold text-lilac-deep focus:not-sr-only aria-disabled:opacity-50"
          >
            Tirar último copo
          </button>
        </div>

        <button
          type="button"
          aria-label={portionReady ? `Beber ${portionMl} ml` : "Beber um copo"}
          aria-disabled={!drop.canDrink}
          {...drop.hold.handlers}
          className="shrink-0 touch-manipulation select-none rounded-full [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lilac"
        >
          <WaterDrop
            level={drop.level}
            holding={drop.hold.holding}
            ringMs={drop.hold.ringMs}
            burst={drop.burst}
          />
        </button>
      </div>
    </section>
  );
}
