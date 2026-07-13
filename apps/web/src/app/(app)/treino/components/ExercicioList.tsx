"use client";

import {
  BarbellIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  FlagCheckeredIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { SessionExercise } from "@/lib/api-types";

import { mmss } from "../hooks/format";
import { doneCount } from "../hooks/session";
import { GifThumb } from "./GifThumb";

export function ExercicioList({
  name,
  exercises,
  startedAt,
  auto,
  onToggleAuto,
  onOpenExercise,
  onComplete,
  completing,
}: {
  name: string;
  exercises: SessionExercise[];
  startedAt: string;
  auto: boolean;
  onToggleAuto: (v: boolean) => void;
  onOpenExercise: (i: number) => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const doneEx = exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-28">
      <header className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold text-ink">{name}</h1>
          <p className="text-[13px] font-semibold text-ink-read">
            {doneEx} de {exercises.length} exercícios
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-pink-tint px-3 py-1.5 font-display text-[13px] font-bold text-pink-deep tabular-nums">
          <TimerIcon size={16} weight="fill" /> {mmss(elapsed)}
        </span>
      </header>

      <p className="text-[13px] font-semibold text-ink-read">Toque num exercício para registrar as séries.</p>

      <div className="flex flex-col gap-2">
        {exercises.map((ex, i) => {
          const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
          return (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() => onOpenExercise(i)}
              className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
            >
              {ex.catalogId ? (
                <GifThumb id={ex.catalogId} alt="" className="size-10.5 rounded-[14px]" />
              ) : (
                <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
              )}
              <div className="flex flex-1 flex-col">
                <span className="text-[14px] font-bold text-ink">{ex.name}</span>
                <span className="text-[12px] font-semibold text-ink-read">
                  {doneCount(ex)}/{ex.targetSets} séries
                  {ex.lastPerformance?.load != null ? ` · ${ex.lastPerformance.load} kg` : ""}
                </span>
              </div>
              {done ? (
                <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
              ) : (
                <CaretRightIcon size={20} className="text-ink-faint" />
              )}
            </button>
          );
        })}
      </div>

      <label className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm">
        <span className="text-[13px] font-bold text-ink">Descanso automático</span>
        <ToggleSwitch checked={auto} onCheckedChange={onToggleAuto} label="Descanso automático" />
      </label>

      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn transition-opacity disabled:opacity-70"
      >
        {completing ? (
          <>
            <CircleNotchIcon size={18} weight="bold" className="animate-spin" />
            Concluindo…
          </>
        ) : (
          <>
            <FlagCheckeredIcon size={18} weight="fill" />
            Concluir treino
          </>
        )}
      </button>
    </div>
  );
}
