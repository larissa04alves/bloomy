"use client";

import {
  ArrowsClockwiseIcon,
  BarbellIcon,
  CaretRightIcon,
  CheckCircleIcon,
  DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { SessionExercise } from "@/lib/api-types";

import { doneCount, isExerciseDone } from "../hooks/session";
import { GifThumb } from "./GifThumb";

export function ExercicioRow({
  ex,
  index,
  completing,
  draggable,
  onOpen,
  onSwap,
  onRemove,
  onDropOrder,
}: {
  ex: SessionExercise;
  index: number;
  completing: boolean;
  /** false quando a lista tem 1 exercício: não há o que reordenar. */
  draggable: boolean;
  onOpen: (i: number) => void;
  onSwap: (ex: SessionExercise) => void;
  onRemove: (ex: SessionExercise) => void;
  onDropOrder: () => void;
}) {
  const controls = useDragControls();
  const done = isExerciseDone(ex);

  return (
    <Reorder.Item
      as="li"
      value={ex.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDropOrder}
    >
      <SwipeableRow
        onEdit={completing ? undefined : () => onSwap(ex)}
        editIcon={<ArrowsClockwiseIcon size={22} weight="bold" />}
        editLabel="Trocar exercício"
        onDelete={completing ? undefined : () => onRemove(ex)}
      >
        <div className="flex w-full items-center gap-1 rounded-card bg-white p-3 shadow-card-sm">
          {draggable ? (
            <button
              type="button"
              disabled={completing}
              aria-label={`Mover ${ex.name}`}
              // stopPropagation p/ o SwipeableRow não registrar o gesto: hoje ele só
              // reage a |dx| >= 6px, mas o reorder não deve depender desse limiar.
              onPointerDown={(e) => {
                if (completing) return;
                e.stopPropagation();
                controls.start(e);
              }}
              // touch-none: sem isso o navegador trata o arraste vertical como scroll
              // da página e o drag nunca começa.
              className="grid size-8 shrink-0 touch-none place-items-center text-ink-faint disabled:opacity-40"
            >
              <DotsSixVerticalIcon size={18} weight="bold" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpen(index)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            {ex.catalogId ? (
              <GifThumb id={ex.catalogId} alt="" className="size-10.5 rounded-[14px]" />
            ) : (
              <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
            )}
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-ink">{ex.name}</span>
              <span className="text-xs font-semibold text-ink-read">
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
        </div>
      </SwipeableRow>
    </Reorder.Item>
  );
}
