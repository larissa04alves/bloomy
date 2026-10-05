"use client";

import { BarbellIcon, CircleNotchIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { IconChip } from "@/components/icon-chip";
import type { WorkoutWithExercises } from "@/lib/api-types";

import { previewSummary } from "../hooks/format";
import { GifThumb } from "./GifThumb";

/** Prévia antes de iniciar: o que vem no treino, sem criar sessão. */
export function PreviaTreino({
  workout,
  starting,
  onOpenChange,
  onStart,
}: {
  workout: WorkoutWithExercises | null;
  starting: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
}) {
  return (
    <BottomSheet
      open={workout !== null}
      onOpenChange={onOpenChange}
      title={workout?.name ?? ""}
      tone="pink"
      icon={<BarbellIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          {starting ? <CircleNotchIcon size={18} weight="bold" className="animate-spin" /> : null}
          Iniciar treino
        </button>
      }
    >
      {workout ? (
        <div className="flex flex-col gap-1">
          <p className="pb-2 text-xs font-semibold text-ink-read">
            {previewSummary(workout.exercises)}
          </p>
          {workout.exercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-3 border-b border-hairline py-2 last:border-b-0"
            >
              {ex.catalogId ? (
                <GifThumb
                  id={ex.catalogId}
                  alt=""
                  className="size-10 shrink-0 rounded-[18px] bg-lilac-tint-soft object-cover"
                />
              ) : (
                // Exercício criado pela pessoa: mesmo ícone da lista do treino (`ExercicioRow`).
                <IconChip tone="pink" size="lg" icon={<BarbellIcon size={22} weight="fill" />} />
              )}
              <span className="flex-1 text-sm font-bold text-ink">{ex.name}</span>
              <span className="text-xs font-bold whitespace-nowrap text-lilac-deep">
                {ex.targetSets} × {ex.targetReps}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </BottomSheet>
  );
}
