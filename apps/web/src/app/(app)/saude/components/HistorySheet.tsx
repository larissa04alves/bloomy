"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

import { dayMonth } from "../hooks/format";

export type HistoryItem = { id: string; title: string; completedAt: string | null };

export function HistorySheet({
  open,
  onOpenChange,
  title,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: HistoryItem[];
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      tone="lilac"
      icon={<ClockCounterClockwiseIcon size={22} weight="fill" />}
    >
      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nada por aqui ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm"
            >
              <span className="text-sm font-bold text-ink">{it.title}</span>
              <span className="text-xs font-semibold text-ink-read">
                {it.completedAt ? `concluído em ${dayMonth(it.completedAt)}` : "concluído"}
              </span>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
