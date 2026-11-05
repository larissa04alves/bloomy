"use client";

import { CakeIcon, PencilSimpleIcon, RulerIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";

function SobreVoceCard({
  icon,
  title,
  subtitle,
  pill,
  editLabel,
  onEdit,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string | null;
  pill: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card">
      <IconChip tone="lilac" icon={icon} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        {subtitle ? (
          <span className="truncate text-xs font-semibold text-ink-read">{subtitle}</span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-lilac-tint-soft px-3 text-sm font-bold text-lilac-deep"
      >
        {pill}
        <PencilSimpleIcon size={14} weight="bold" />
      </button>
    </div>
  );
}

export function SobreVoceSection({
  heightPill,
  birthPill,
  ageLabel,
  onEditHeight,
  onEditBirthDate,
}: {
  heightPill: string;
  birthPill: string;
  ageLabel: string | null;
  onEditHeight: () => void;
  onEditBirthDate: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Sobre você</h2>
      <SobreVoceCard
        icon={<RulerIcon size={22} weight="fill" />}
        title="Altura"
        subtitle={null}
        pill={heightPill}
        editLabel="Editar altura"
        onEdit={onEditHeight}
      />
      <SobreVoceCard
        icon={<CakeIcon size={22} weight="fill" />}
        title="Nascimento"
        subtitle={ageLabel}
        pill={birthPill}
        editLabel="Editar data de nascimento"
        onEdit={onEditBirthDate}
      />
    </section>
  );
}
