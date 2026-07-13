"use client";

import { CheckCircleIcon, CircleIcon, PillIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { IntakeSlot } from "@/lib/api-types";

export function RemediosSection({
  intakes,
  onToggle,
  onOpenModal,
}: {
  intakes: IntakeSlot[];
  onToggle: (slot: IntakeSlot) => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Remédios de hoje</h2>
        <button
          type="button"
          onClick={onOpenModal}
          className="flex items-center gap-1 text-sm font-bold text-coral"
        >
          <PlusIcon size={16} weight="bold" /> Cadastrar
        </button>
      </div>

      {intakes.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum remédio para hoje.
        </p>
      ) : (
        intakes.map((s) => (
          <button
            key={`${s.medicationId}|${s.time}`}
            type="button"
            onClick={() => onToggle(s)}
            className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
          >
            <IconChip tone="coral" icon={<PillIcon size={22} weight="fill" />} />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-ink">{s.name}</span>
              <span className="text-xs font-semibold text-ink-read">
                {s.time}
                {s.dose ? ` · ${s.dose}` : ""}
              </span>
            </div>
            {s.taken ? (
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            ) : (
              <CircleIcon size={24} className="text-control-off" />
            )}
          </button>
        ))
      )}
    </section>
  );
}
