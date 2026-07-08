"use client";

import { BarbellIcon, PlayIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import { FOCUS_LABELS, type WorkoutWithExercises } from "@/lib/api-types";

export function TreinoList({
  workouts,
  onStart,
  onEdit,
  onDelete,
}: {
  workouts: WorkoutWithExercises[];
  onStart: (workoutId: string) => void;
  onEdit: (workout: WorkoutWithExercises) => void;
  onDelete: (workoutId: string) => void;
}) {
  if (workouts.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline p-5 text-center text-[13px] font-semibold text-ink-read">
        Nenhum treino ainda. Crie o primeiro no botão acima.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      {workouts.map((w) => (
        <SwipeableRow key={w.id} onEdit={() => onEdit(w)} onDelete={() => onDelete(w.id)}>
          <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
            <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
            <div className="flex flex-1 flex-col">
              <span className="text-[14px] font-bold text-ink">{w.name}</span>
              <span className="text-[12px] font-semibold text-ink-read">
                {w.exercises.length} exercícios · {FOCUS_LABELS[w.focus]}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Iniciar ${w.name}`}
              onClick={() => onStart(w.id)}
              className="grid size-11 place-items-center rounded-full bg-pink-bright text-white shadow-btn"
            >
              <PlayIcon size={20} weight="fill" />
            </button>
          </div>
        </SwipeableRow>
      ))}
    </section>
  );
}
