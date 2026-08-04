"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { SwipeableRow } from "@/components/swipeable-row";
import type { WeightLog } from "@/lib/api-types";

import { dayLabel, deltaBetween, formatKg, groupByMonth } from "../hooks/peso-helpers";
import { DeltaLabel } from "./PesoSection";

export function PesoHistorySheet({
  open,
  onOpenChange,
  weights,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weights: WeightLog[]; // desc
  onEdit: (weight: WeightLog) => void;
  onDelete: (id: string) => void;
}) {
  const groups = groupByMonth(weights);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Histórico de peso"
      tone="lilac"
      icon={<ClockCounterClockwiseIcon size={22} weight="fill" />}
    >
      {groups.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nada por aqui ainda.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wide text-ink-faint uppercase">
                {group.label}
              </span>
              {group.balance ? <DeltaLabel delta={group.balance} /> : null}
            </div>
            {group.items.map((item) => {
              // Variação sempre contra a pesagem imediatamente anterior — inclusive
              // quando ela está no mês passado, por isso o índice vem da lista inteira.
              const index = weights.findIndex((w) => w.id === item.id);
              const delta = deltaBetween(item.grams, weights[index + 1]?.grams);
              return (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                >
                  <div className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm">
                    <span className="text-sm font-bold text-ink">{dayLabel(item.day)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-sm font-bold text-ink">
                        {formatKg(item.grams)} kg
                      </span>
                      {delta ? <DeltaLabel delta={delta} /> : null}
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        ))
      )}
    </BottomSheet>
  );
}
