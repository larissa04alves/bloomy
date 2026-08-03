"use client";

import { PillIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { Medication } from "@/lib/api-types";

import { frequencyLabel } from "../hooks/format";

export function AgendaRemediosSection({
  medications,
  onAdd,
  onEdit,
  onDelete,
}: {
  medications: Medication[];
  onAdd: () => void;
  onEdit: (m: Medication) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Agenda de remédios</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-bold text-coral"
        >
          <PlusIcon size={16} weight="bold" /> Cadastrar
        </button>
      </div>

      {medications.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum remédio cadastrado.
        </p>
      ) : (
        medications.map((m) => (
          <SwipeableRow key={m.id} onEdit={() => onEdit(m)} onDelete={() => onDelete(m.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="coral" icon={<PillIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{m.name}</span>
                <span className="text-xs font-semibold text-ink-read">
                  {frequencyLabel(m.times)}
                  {m.dose ? ` · ${m.dose}` : ""}
                </span>
              </div>
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
