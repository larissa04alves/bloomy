"use client";

import { CircleIcon, PlusIcon, StethoscopeIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { Appointment } from "@/lib/api-types";

import { hourLabel, weekdayDay } from "../hooks/format";

export function ConsultasSection({
  ativas,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onHistory,
}: {
  ativas: Appointment[];
  onAdd: () => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
  onComplete: (a: Appointment) => void;
  onHistory: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Consultas</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onHistory} className="text-sm font-bold text-lilac-deep">
            Ver histórico
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-sm font-bold text-lilac-deep"
          >
            <PlusIcon size={16} weight="bold" /> Agendar
          </button>
        </div>
      </div>

      {ativas.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhuma consulta agendada.
        </p>
      ) : (
        ativas.map((a) => (
          <SwipeableRow key={a.id} onEdit={() => onEdit(a)} onDelete={() => onDelete(a.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="lilac" icon={<StethoscopeIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{a.professional}</span>
                {a.specialty ? (
                  <span className="text-xs font-semibold text-ink-read">{a.specialty}</span>
                ) : null}
              </div>
              {a.status === "scheduled" && a.scheduledAt ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-lilac-deep">{weekdayDay(a.scheduledAt)}</span>
                  <span className="text-xs font-semibold text-ink-read">{hourLabel(a.scheduledAt)}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-coral">a agendar</span>
              )}
              <button
                type="button"
                aria-label={`Concluir consulta ${a.professional}`}
                onClick={() => onComplete(a)}
              >
                <CircleIcon size={24} className="text-control-off" />
              </button>
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
