import { DropIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";

import type { CicloView } from "../hooks/useCiclo";

export function HojeCiclo({
  entry,
  emptyLabel,
  onOpen,
}: {
  entry: CicloView["todayEntry"];
  emptyLabel: string;
  onOpen: () => void;
}) {
  if (!entry) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-bold text-ink">Como você está hoje</h2>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center gap-2 rounded-card border border-dashed border-hairline p-4 text-sm font-semibold text-ink-read"
        >
          <PlusIcon weight="bold" />
          {emptyLabel}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Como você está hoje</h2>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-peach-deep"
        >
          <PencilSimpleIcon weight="bold" />
          Editar
        </button>
      </div>
      <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card-sm">
        {entry.flow ? (
          <div className="flex items-center gap-3">
            <IconChip tone="peach" icon={<DropIcon size={20} weight="fill" />} />
            <span className="text-sm font-bold text-ink">{entry.flow}</span>
          </div>
        ) : null}
        {entry.symptoms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {entry.symptoms.map((label) => (
              <span
                key={label}
                className="rounded-full bg-peach-tint px-3 py-1.5 text-xs font-bold text-peach-deep"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
