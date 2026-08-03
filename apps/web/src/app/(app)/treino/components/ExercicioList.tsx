"use client";

import {
  CircleNotchIcon,
  FlagCheckeredIcon,
  PlusIcon,
  TimerIcon,
} from "@phosphor-icons/react";
import { Reorder } from "motion/react";
import { useEffect, useState } from "react";

import { ToggleSwitch } from "@/components/toggle-switch";
import type { SessionExercise } from "@/lib/api-types";

import { mmss } from "../hooks/format";
import { isExerciseDone } from "../hooks/session";
import { ExercicioRow } from "./ExercicioRow";

export function ExercicioList({
  name,
  exercises,
  startedAt,
  auto,
  onToggleAuto,
  onOpenExercise,
  onComplete,
  completing,
  onSwapExercise,
  onRemoveExercise,
  onAddExercise,
  onReorder,
  onDropOrder,
}: {
  name: string;
  exercises: SessionExercise[];
  startedAt: string;
  auto: boolean;
  onToggleAuto: (v: boolean) => void;
  onOpenExercise: (i: number) => void;
  onComplete: () => void;
  completing: boolean;
  onSwapExercise: (ex: SessionExercise) => void;
  onRemoveExercise: (ex: SessionExercise) => void;
  onAddExercise: () => void;
  onReorder: (ids: string[]) => void;
  onDropOrder: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const doneEx = exercises.filter(isExerciseDone).length;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-28">
      <header className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold text-ink">{name}</h1>
          <p className="text-sm font-semibold text-ink-read">
            {doneEx} de {exercises.length} exercícios
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-pink-tint px-3 py-1.5 font-display text-sm font-bold text-pink-deep tabular-nums">
          <TimerIcon size={16} weight="fill" /> {mmss(elapsed)}
        </span>
      </header>

      <p className="text-sm font-semibold text-ink-read">
        Toque em um exercício para registrar as séries.
      </p>

      <Reorder.Group
        as="ul"
        axis="y"
        values={exercises.map((ex) => ex.id)}
        onReorder={onReorder}
        className="flex flex-col gap-2"
      >
        {exercises.map((ex, i) => (
          <ExercicioRow
            key={ex.id}
            ex={ex}
            index={i}
            completing={completing}
            draggable={exercises.length > 1}
            onOpen={onOpenExercise}
            onSwap={onSwapExercise}
            onRemove={onRemoveExercise}
            onDropOrder={onDropOrder}
          />
        ))}
      </Reorder.Group>

      <button
        type="button"
        onClick={onAddExercise}
        disabled={completing}
        className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-3 text-sm font-bold text-pink-deep disabled:opacity-70"
      >
        <PlusIcon size={16} weight="bold" /> Adicionar exercício
      </button>

      <label className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm">
        <span className="text-sm font-bold text-ink">Descanso automático</span>
        <ToggleSwitch
          checked={auto}
          onCheckedChange={onToggleAuto}
          label="Descanso automático"
        />
      </label>

      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-full bg-pink-deep py-3.5 font-display font-bold text-white shadow-btn transition-opacity disabled:opacity-70"
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
