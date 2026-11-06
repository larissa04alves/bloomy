"use client";

import { SwapIcon } from "@phosphor-icons/react";

import type { HistoryItem } from "../hooks/format";

export function ListaCiclos({
  items,
  error,
  onRetry,
}: {
  items: HistoryItem[] | null;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Seus ciclos</h2>
      {items ? (
        items.map((item) =>
          item.kind === "switch" ? (
            <div
              key={item.key}
              className="flex items-center gap-2 rounded-card border border-dashed border-hairline p-3 text-xs font-semibold text-ink-read"
            >
              <SwapIcon size={16} weight="bold" className="shrink-0 text-peach-deep" />
              {item.text}
            </div>
          ) : (
            <div key={item.key} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{item.title}</span>
                <span className="text-xs font-semibold text-ink-read">{item.detail}</span>
              </span>
              {item.bar !== null ? (
                <span className="flex h-1.75 w-20 overflow-hidden rounded-full bg-ring-track">
                  <span className="bg-peach" style={{ width: `${item.bar}%` }} />
                </span>
              ) : null}
            </div>
          ),
        )
      ) : error ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-card bg-white p-3 text-sm font-bold text-peach-deep shadow-card-sm"
        >
          Não foi possível carregar o histórico · tentar de novo
        </button>
      ) : (
        <>
          <div className="h-16 animate-pulse rounded-card bg-lilac-tint-soft" />
          <div className="h-16 animate-pulse rounded-card bg-lilac-tint-soft" />
        </>
      )}
    </section>
  );
}
