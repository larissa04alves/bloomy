import { CheckCircleIcon, CircleIcon, CoffeeIcon, PillIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";

import type { CicloView } from "../hooks/useCiclo";

export function PilulaHoje({
  pill,
  onToggle,
}: {
  pill: NonNullable<CicloView["pill"]>;
  onToggle: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Pílula de hoje</h2>
      {pill.due ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={pill.taken}
          className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
        >
          <IconChip tone="peach" icon={<PillIcon size={22} weight="fill" />} />
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold text-ink">Pílula</span>
            {pill.detail ? (
              <span className="text-xs font-semibold text-ink-read">{pill.detail}</span>
            ) : null}
          </span>
          {pill.taken ? (
            <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
          ) : (
            <CircleIcon size={24} className="text-control-off" />
          )}
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-hairline p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-[14px] bg-lilac-tint-soft text-ink-faint">
            <CoffeeIcon size={20} weight="fill" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold text-ink-read">Sem pílula na pausa</span>
            <span className="text-xs font-semibold text-ink-faint">o lembrete descansa também</span>
          </span>
        </div>
      )}
    </section>
  );
}
