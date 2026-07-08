import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

import { mmss } from "../hooks/format";

export function DescansoOverlay({
  left,
  total,
  onAdjust,
  onSkip,
}: {
  left: number;
  total: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}) {
  const pct = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-105 px-5.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-4 rounded-card-lg bg-ink px-5 py-4 text-white shadow-sheet">
        <div className="relative grid place-items-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#5a5470" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#a78bd0"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
            />
          </svg>
          <span className="absolute font-display text-xl font-bold tabular-nums">{mmss(left)}</span>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[10px] font-extrabold tracking-widest text-white/70">DESCANSO</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Menos 15 segundos"
              onClick={() => onAdjust(-15)}
              className="grid size-9 place-items-center rounded-full bg-white/12"
            >
              <MinusIcon size={16} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Mais 15 segundos"
              onClick={() => onAdjust(15)}
              className="grid size-9 place-items-center rounded-full bg-white/12"
            >
              <PlusIcon size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="ml-auto rounded-full bg-white/15 px-4 py-2 text-[13px] font-bold"
            >
              Pular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
