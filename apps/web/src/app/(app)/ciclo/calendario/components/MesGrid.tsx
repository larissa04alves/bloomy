"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

import { dayAriaLabel, type GridCell } from "../hooks/format";
import type { LegendItem } from "../hooks/useCalendario";

const MARK: Record<NonNullable<NonNullable<GridCell>["mark"]>, string> = {
  period: "bg-peach text-white",
  spotting: "bg-peach-tint text-peach-deep",
  predicted: "border-2 border-dashed border-peach text-peach-deep",
};

const LEGEND_SWATCH: Record<LegendItem, string> = {
  period: "size-3 bg-peach",
  predicted: "size-3 border-2 border-dashed border-peach",
  spotting: "size-3 bg-peach-tint",
  symptom: "size-1.5 bg-lilac",
};

export function MesGrid({
  month,
  weekdays,
  grid,
  ready,
  error,
  legend,
  onPrev,
  onNext,
  onOpenDay,
  onRetry,
}: {
  month: string;
  weekdays: string[];
  grid: GridCell[];
  /** Enquanto o mês não carregou, os dias ficam desabilitados e esmaecidos. */
  ready: boolean;
  error: Error | null;
  legend: { id: LegendItem; label: string }[];
  onPrev: () => void;
  onNext: () => void;
  onOpenDay: (cell: NonNullable<GridCell>) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Mês anterior"
          className="grid size-9 place-items-center rounded-full text-ink-faint"
        >
          <CaretLeftIcon weight="bold" />
        </button>
        <span className="font-display text-base font-bold text-ink">{month}</span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próximo mês"
          className="grid size-9 place-items-center rounded-full text-ink-faint"
        >
          <CaretRightIcon weight="bold" />
        </button>
      </div>

      {error ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control bg-peach-tint p-3 text-sm font-bold text-peach-deep"
        >
          Não foi possível carregar o mês · tentar de novo
        </button>
      ) : null}

      <div
        aria-busy={!ready}
        className={cn(
          "grid grid-cols-7 gap-y-1 text-center text-sm font-bold text-ink",
          !ready && "animate-pulse opacity-50",
        )}
      >
        {weekdays.map((w, i) => (
          <span key={i} className="text-xs font-extrabold text-ink-faint" aria-hidden>
            {w}
          </span>
        ))}
        {grid.map((cell, i) =>
          cell ? (
            <button
              key={cell.day}
              type="button"
              disabled={cell.future || !ready}
              onClick={() => onOpenDay(cell)}
              aria-label={dayAriaLabel(cell)}
              className={cn(
                "relative mx-auto grid size-9 place-items-center rounded-full disabled:cursor-default",
                cell.mark && MARK[cell.mark],
                cell.today && "ring-2 ring-lilac-deep",
              )}
            >
              {cell.date}
              {cell.symptom ? (
                <span
                  className={cn(
                    "absolute bottom-0.5 size-1 rounded-full",
                    cell.mark === "period" ? "bg-white" : "bg-lilac",
                  )}
                />
              ) : null}
            </button>
          ) : (
            <span key={`empty-${i}`} />
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-ink-read">
        {legend.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1">
            <span className={cn("rounded-full", LEGEND_SWATCH[item.id])} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
