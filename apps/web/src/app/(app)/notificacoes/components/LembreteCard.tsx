"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { Tone } from "@/lib/tone";

export function LembreteCard({
  tone,
  icon,
  title,
  subtitle,
  enabled,
  blocked = false,
  onToggle,
  onEditTime,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  /** Linha explicativa — vem de `reminderSubtitle`. */
  subtitle: string;
  enabled: boolean;
  /** Linha existe mas não pode ligar (ex.: remédios sem cadastro). O motivo já
   *  está no `subtitle` — some com a linha esconderia a feature. */
  blocked?: boolean;
  onToggle: (next: boolean) => void;
  /** Só treino e mente têm horário próprio; sem isso a linha não é tocável. */
  onEditTime?: () => void;
}) {
  const body = (
    <>
      <IconChip tone={tone} icon={icon} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="truncate text-xs font-semibold text-ink-read">{subtitle}</span>
      </span>
      {onEditTime ? (
        <CaretRightIcon size={16} weight="bold" className="shrink-0 text-ink-faint" />
      ) : null}
    </>
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-card bg-white p-4 shadow-card ${
        blocked ? "opacity-60" : ""
      }`}
    >
      {onEditTime && !blocked ? (
        <button
          type="button"
          onClick={onEditTime}
          aria-label={`Ajustar horário de ${title}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <ToggleSwitch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={blocked}
        label={`Lembrete de ${title}`}
      />
    </div>
  );
}
