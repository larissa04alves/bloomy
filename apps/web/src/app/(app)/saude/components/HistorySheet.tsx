"use client";

import { ClockCounterClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

import { dayMonth } from "../hooks/format";

export type HistoryItem = {
  id: string;
  title: string;
  completedAt: string | null;
  attachment?: { href: string; name: string };
};

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
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-read">
                  {it.completedAt ? `concluído em ${dayMonth(it.completedAt)}` : "concluído"}
                </span>
                {it.attachment ? (
                  <a
                    href={it.attachment.href}
                    download={it.attachment.name}
                    aria-label={`Baixar resultado de ${it.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-control bg-lilac-tint text-lilac-deep"
                  >
                    <DownloadSimpleIcon size={18} weight="bold" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
