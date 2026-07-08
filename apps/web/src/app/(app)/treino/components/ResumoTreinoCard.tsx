import { FireIcon } from "@phosphor-icons/react/dist/ssr";

import type { WorkoutSummary } from "@/lib/api-types";

const DOW = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg..dom

export function ResumoTreinoCard({ summary }: { summary: WorkoutSummary }) {
  return (
    <section className="flex flex-col gap-3 rounded-card-lg bg-pink-tint p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-display text-[15px] font-bold text-pink-deep">
            {summary.weekCount} {summary.weekCount === 1 ? "treino" : "treinos"} essa semana
          </span>
          <span className="text-[12px] font-semibold text-pink-deep/80">
            Meta: {summary.weekTarget} por semana
          </span>
        </div>
        {summary.streak > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-[13px] font-bold text-pink-deep">
            <FireIcon size={16} weight="fill" /> {summary.streak}
          </span>
        ) : null}
      </div>

      <div className="flex justify-between">
        {summary.weekDays.map((active, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                active ? "bg-pink-bright text-white" : "bg-white/60 text-pink-deep/50"
              }`}
            >
              {DOW[i]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
