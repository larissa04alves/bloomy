"use client";

import { FireIcon } from "@phosphor-icons/react/dist/ssr";

import type { WorkoutSummary } from "@/lib/api-types";

import { useTodayIndex } from "../hooks/today";

const DOW = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg..dom

export function ResumoTreinoCard({ summary }: { summary: WorkoutSummary }) {
  const todayIndex = useTodayIndex(); // resolvido após o mount (evita mismatch SSR)
  return (
    <section className="flex flex-col gap-3 rounded-card-lg bg-pink-tint p-4">
      <div className="flex items-center justify-between">
        <div className="flex justify-between">
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold text-pink-deep">
              {summary.weekCount}{" "}
              {summary.weekCount === 1 ? "treino" : "treinos"}
            </span>
            <span className="text-xs font-semibold text-pink-deep/70">
              Meta semanal de {summary.weekTarget} dias
            </span>
          </div>
        </div>
        <span className="flex items-center gap-1.25 rounded-full bg-white px-3 py-1.5 font-display text-sm font-bold text-pink-deep">
          <FireIcon size={16} weight="fill" className="text-pink-bright" />
          {summary.streak} {summary.streak === 1 ? "dia" : "dias"}
        </span>
      </div>

      <div className="flex justify-between">
        {summary.weekDays.map((active, i) => (
          <span
            key={i}
            className={`flex items-center justify-center size-7 rounded-full text-xs font-bold ${
              active ? "bg-pink-bright text-white" : "bg-white text-[#c9a8b8]"
            } ${i === todayIndex && !active ? "border-2 border-pink-bright" : ""}`}
          >
            {DOW[i]}
          </span>
        ))}
      </div>
    </section>
  );
}
