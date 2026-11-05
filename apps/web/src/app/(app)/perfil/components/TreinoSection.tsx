"use client";

import { BellRingingIcon, TimerIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";

function TreinoCard({
  icon,
  title,
  subtitle,
  checked,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card">
      <IconChip tone="pink" icon={icon} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="truncate text-xs font-semibold text-ink-read">{subtitle}</span>
      </div>
      <ToggleSwitch checked={checked} onCheckedChange={onToggle} label={title} />
    </div>
  );
}

export function TreinoSection({
  autoRest,
  onAutoRestChange,
  restAlert,
  onRestAlertChange,
}: {
  autoRest: boolean;
  onAutoRestChange: (next: boolean) => void;
  restAlert: boolean;
  onRestAlertChange: (next: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Treino</h2>
      <TreinoCard
        icon={<TimerIcon size={22} weight="fill" />}
        title="Descanso automático"
        subtitle="inicia o descanso ao marcar a série"
        checked={autoRest}
        onToggle={onAutoRestChange}
      />
      <TreinoCard
        icon={<BellRingingIcon size={22} weight="fill" />}
        title="Aviso de fim do descanso"
        subtitle="som + notificação"
        checked={restAlert}
        onToggle={onRestAlertChange}
      />
    </section>
  );
}
