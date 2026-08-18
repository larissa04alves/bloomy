import { CalendarHeartIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { IconChip } from "@/components/icon-chip";
import type { Appointment } from "@/lib/api-types";

import { consultaLabel, monthShort } from "../hooks/format";

export function ConsultaCard({ appointment }: { appointment: Appointment | null }) {
  const isToSchedule = appointment?.status === "to_schedule" && !!appointment.suggestedAt;
  // consulta marcada tem scheduledAt; retorno a agendar só tem suggestedAt (sem hora real)
  const scheduledAt = !isToSchedule ? appointment?.scheduledAt : null;
  const when = scheduledAt ? consultaLabel(scheduledAt) : null;

  return (
    <Link
      href="/saude"
      className="flex items-center gap-3 rounded-card-lg bg-white p-4 shadow-card"
    >
      <IconChip tone="lilac" icon={<CalendarHeartIcon size={22} weight="fill" />} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
          {isToSchedule ? "Retorno a agendar" : "Próxima consulta"}
        </p>
        <p className="mt-0.5 truncate font-display text-sm font-bold text-ink">
          {appointment
            ? [appointment.professional, appointment.specialty].filter(Boolean).join(" · ")
            : "Nenhuma marcada"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {isToSchedule ? (
          <>
            <p className="font-display text-sm font-bold text-lilac-deep">
              {monthShort(appointment.suggestedAt!)}
            </p>
            <p className="text-xs font-semibold text-ink-soft">sugerido</p>
          </>
        ) : when ? (
          <>
            <p className="font-display text-sm font-bold text-lilac-deep">{when.date}</p>
            <p className="text-xs font-semibold text-ink-soft">{when.time}</p>
          </>
        ) : (
          <p className="text-xs font-bold text-lilac-deep">Agendar</p>
        )}
      </div>
    </Link>
  );
}
