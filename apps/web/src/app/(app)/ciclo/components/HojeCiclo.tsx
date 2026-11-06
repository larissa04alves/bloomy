import { DropIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";

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
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 rounded-card bg-white p-3 shadow-card-sm">
          <span className="text-xs font-bold text-ink-faint">Fluxo</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
            <DropIcon weight="fill" className="text-peach-deep" />
            {entry.flow}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-card bg-white p-3 shadow-card-sm">
          <span className="text-xs font-bold text-ink-faint">Sintomas</span>
          <span className="text-sm font-bold text-ink">
            {entry.symptoms}
            {entry.more > 0 ? <span className="text-ink-read"> +{entry.more}</span> : null}
          </span>
        </div>
      </div>
    </section>
  );
}
