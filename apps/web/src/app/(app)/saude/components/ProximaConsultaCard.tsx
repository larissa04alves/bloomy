"use client";

import { CalendarHeartIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { Appointment } from "@/lib/api-types";

import { hourLabel, monthShort, relativeDays, weekdayDay } from "../hooks/format";

export function ProximaConsultaCard({ proxima }: { proxima: Appointment | null }) {
  const title = (() => {
    if (!proxima) return "Nenhuma consulta marcada";
    if (proxima.status === "to_schedule") return "Retorno a agendar";
    return `Próxima consulta ${relativeDays(proxima.scheduledAt ?? "")}`;
  })();

  const subtitle = (() => {
    if (!proxima) return "Agende quando precisar 💜";
    const who = proxima.professional;
    if (proxima.status === "to_schedule") {
      const when = proxima.suggestedAt ? ` · sugerido em ${monthShort(proxima.suggestedAt)}` : "";
      return `${who}${when}`;
    }
    const at = proxima.scheduledAt;
    return at ? `${who} · ${weekdayDay(at)} às ${hourLabel(at)}` : who;
  })();

  return (
    <div className="mb-2 flex items-center gap-3 rounded-card bg-lilac-tint p-4">
      <IconChip
        tone="lilac"
        variant="white"
        icon={<CalendarHeartIcon size={22} weight="fill" />}
        className="size-11.5"
      />
      <div className="flex flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="text-xs font-semibold text-ink-read">{subtitle}</span>
      </div>
    </div>
  );
}
