"use client";

import type { ReactNode } from "react";

import { CheckCircleIcon, CircleIcon, FlowerLotusIcon, PillIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { IntakeSlot, PillToday } from "@/lib/api-types";
import { formatDose } from "@/lib/dose";
import type { Tone } from "@/lib/tone";

export function RemediosSection({
  intakes,
  onToggle,
  pill,
  pillSubtitle,
  onTogglePill,
}: {
  intakes: IntakeSlot[];
  onToggle: (slot: IntakeSlot) => void;
  pill: PillToday | null;
  pillSubtitle: string | null;
  onTogglePill: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Remédios de hoje</h2>

      {intakes.length === 0 && !pill ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum remédio para hoje.
        </p>
      ) : (
        <>
          {intakes.map((s) => (
            <IntakeRow
              key={`${s.medicationId}|${s.time}`}
              tone="coral"
              icon={<PillIcon size={22} weight="fill" />}
              title={s.name}
              subtitle={`${s.time} · ${formatDose(s.doseAmount, s.doseUnit)}`}
              taken={s.taken}
              onClick={() => onToggle(s)}
            />
          ))}
          {pill && (
            <IntakeRow
              tone="peach"
              icon={<FlowerLotusIcon size={22} weight="fill" />}
              title="Pílula"
              subtitle={pillSubtitle ?? ""}
              taken={pill.taken}
              onClick={onTogglePill}
            />
          )}
        </>
      )}
    </section>
  );
}

function IntakeRow({
  tone,
  icon,
  title,
  subtitle,
  taken,
  onClick,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  subtitle: string;
  taken: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
    >
      <IconChip tone={tone} icon={icon} />
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-bold text-ink">{title}</span>
        <span className="text-xs font-semibold text-ink-read">{subtitle}</span>
      </div>
      {taken ? (
        <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
      ) : (
        <CircleIcon size={24} className="text-control-off" />
      )}
    </button>
  );
}
