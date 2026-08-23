"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";
import { TONE, type Tone } from "@/lib/tone";

export function MetaCard({
  tone,
  icon,
  title,
  meta,
  pill,
  onEdit,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  /** Texto após "Meta: " — vem de `metaLabel`. */
  meta: string;
  /** Valor curto dentro da pill (ex.: "2000 ml", "3", "4"). */
  pill: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card">
      <IconChip tone={tone} icon={icon} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="truncate text-xs font-semibold text-ink-read">Meta: {meta}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ajustar meta de ${title}`}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-bold ${TONE[tone].tint} ${TONE[tone].deep}`}
      >
        {pill}
        <PencilSimpleIcon size={14} weight="fill" />
      </button>
    </div>
  );
}
