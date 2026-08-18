import type { TodayPayload } from "@/lib/api-types";

import { dayProgress, progressLabel } from "../hooks/format";

const SIZE = 46;
const STROKE = 5;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

/** Anel de progresso do dia: o primeiro elemento com peso visual da Hoje. */
export function ProgressoDia({ today }: { today: TodayPayload }) {
  const { done, total, ratio } = dayProgress(today);

  return (
    <section className="flex items-center gap-3.5 rounded-card-lg bg-lilac-tint px-4 py-3">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0 -rotate-90"
        role="progressbar"
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso das metas de hoje"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-white"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - ratio)}
          className="stroke-lilac transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>

      <div className="flex flex-col">
        <span className="font-display text-base font-bold text-ink">
          {done} de {total} metas
        </span>
        <span className="text-xs font-semibold text-ink-soft">
          {progressLabel(done, total)}
        </span>
      </div>
    </section>
  );
}
