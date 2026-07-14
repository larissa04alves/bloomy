"use client";

import { CheckCircleIcon, FireIcon } from "@phosphor-icons/react";

import type { WorkoutSummary } from "@/lib/api-types";

import { formatDuration } from "../hooks/format";
import { useTodayIndex } from "../hooks/today";

const DOW = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg..dom

export function SessaoFim({
  durationSec,
  exerciseCount,
  summary,
  onRestart,
}: {
  durationSec: number;
  exerciseCount: number;
  summary: WorkoutSummary;
  onRestart: () => void;
}) {
  const todayIndex = useTodayIndex(); // resolvido após o mount (evita mismatch SSR)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5.5 pb-8 text-center">
      <div className="relative">
        <div className="absolute -inset-3.5 rounded-full bg-green-deep animate-halo" />
        <CheckCircleIcon
          size={92}
          weight="fill"
          className="relative text-green-deep"
        />
      </div>

      <h1 className="font-display text-2xl font-bold text-ink">
        Treino concluído!
      </h1>

      {summary.streak > 0 ? (
        <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-display text-base font-bold text-pink-deep shadow-card-sm">
          <FireIcon size={16} weight="fill" /> {summary.streak}{" "}
          {summary.streak === 1 ? "dia seguido" : "dias seguidos"}
        </span>
      ) : null}

      <div className="flex w-full gap-3">
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">
            {exerciseCount}
          </span>
          <span className="text-xs font-semibold text-ink-read">
            exercícios
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">
            {formatDuration(durationSec)}
          </span>
          <span className="text-xs font-semibold text-ink-read">
            duração
          </span>
        </div>
      </div>

      <div className="flex gap-2.5">
        {summary.weekDays.map((active, i) => (
          <span
            key={i}
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
              active
                ? "bg-pink-bright text-white"
                : "bg-white text-pink-deep/50 shadow-card-sm"
            } ${i === todayIndex ? "shadow-[0_0_0_3px_rgba(224,138,176,0.35)]" : ""}`}
          >
            {DOW[i]}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-2 w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
      >
        Voltar ao início
      </button>
    </div>
  );
}
