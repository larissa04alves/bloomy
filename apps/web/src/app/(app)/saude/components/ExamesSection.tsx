"use client";

import { CircleIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import { EXAM_STATUS_LABELS, type Exam } from "@/lib/api-types";

import { examStatusTone } from "../hooks/format";
import { ReturnBadge } from "./ReturnBadge";

export function ExamesSection({
  ativos,
  onAdd,
  onEdit,
  onDelete,
  onMarkDone,
  onComplete,
  onHistory,
}: {
  ativos: Exam[];
  onAdd: () => void;
  onEdit: (e: Exam) => void;
  onDelete: (id: string) => void;
  onMarkDone: (e: Exam) => void;
  onComplete: (e: Exam) => void;
  onHistory: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Exames</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onHistory}
            className="text-sm font-bold text-lilac-deep"
          >
            Ver histórico
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-sm font-bold text-lilac-deep"
          >
            <PlusIcon size={16} weight="bold" /> Adicionar
          </button>
        </div>
      </div>

      {ativos.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum exame por aqui.
        </p>
      ) : (
        ativos.map((e) => (
          <SwipeableRow
            key={e.id}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.id)}
          >
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip
                tone="lilac"
                icon={<TestTubeIcon size={22} weight="fill" />}
              />
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-ink">{e.name}</span>
                  {e.parentId ? <ReturnBadge /> : null}
                </div>
                <span
                  className={`text-xs font-semibold ${examStatusTone(e.status)}`}
                >
                  {EXAM_STATUS_LABELS[e.status]}
                </span>
              </div>
              {e.status === "to_schedule" ? (
                <button
                  type="button"
                  aria-label={`Agendar exame ${e.name}`}
                  onClick={() => onEdit(e)}
                  className="rounded-full bg-lilac-tint px-3 py-1.5 text-xs font-bold text-lilac-deep"
                >
                  Agendar
                </button>
              ) : e.status === "scheduled" ? (
                <button
                  type="button"
                  aria-label={`Marcar exame ${e.name} como feito`}
                  onClick={() => onMarkDone(e)}
                >
                  <CircleIcon size={24} className="text-control-off" />
                </button>
              ) : e.status === "awaiting_result" ? (
                // aguardando resultado: abre o modal do resultado (anexar o laudo ou concluir sem ele).
                <button
                  type="button"
                  aria-label={`Resultado do exame ${e.name}`}
                  title="Informar resultado"
                  onClick={() => onComplete(e)}
                >
                  <CircleIcon size={24} className="text-control-off" />
                </button>
              ) : null}
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
