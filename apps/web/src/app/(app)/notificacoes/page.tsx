"use client";

import {
  ArrowLeftIcon,
  BarbellIcon,
  CalendarHeartIcon,
  DropIcon,
  PillIcon,
  SmileyIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ReminderType } from "@/lib/api-types";
import type { Tone } from "@/lib/tone";

import { HorarioSheet } from "./components/HorarioSheet";
import { LembreteCard } from "./components/LembreteCard";
import { NotificacoesError } from "./components/NotificacoesError";
import { NotificacoesSkeleton } from "./components/NotificacoesSkeleton";
import { PermissaoAviso } from "./components/PermissaoAviso";
import { reminderSubtitle } from "./hooks/format";
import { useNotificacoes } from "./hooks/useNotificacoes";

/** Cor e ícone de cada domínio, iguais aos da Hoje (`RituaisGrid`, `ConsultaCard`):
 *  uma cor por domínio, em todas as telas, sem exceção. Fica no `page.tsx` porque é
 *  JSX — mesmo lugar onde a Metas guarda os dela. */
const META: Record<ReminderType, { tone: Tone; icon: ReactNode; title: string }> = {
  water: { tone: "lilac", icon: <DropIcon size={22} weight="fill" />, title: "Água" },
  meds: { tone: "coral", icon: <PillIcon size={22} weight="fill" />, title: "Remédios" },
  workout: { tone: "pink", icon: <BarbellIcon size={22} weight="fill" />, title: "Treino" },
  mind: { tone: "lilac", icon: <SmileyIcon size={22} weight="fill" />, title: "Mente" },
  appointments: {
    tone: "lilac",
    icon: <CalendarHeartIcon size={22} weight="fill" />,
    title: "Consultas e exames",
  },
};

/** Só estes dois têm horário escolhido pela pessoa — os outros derivam ou são constantes. */
const TIMED: ReminderType[] = ["workout", "mind"];

export default function NotificacoesPage() {
  const n = useNotificacoes();

  if (!n.ready) {
    if (n.error) return <NotificacoesError onRetry={n.reload} />;
    return <NotificacoesSkeleton />;
  }

  const aberto = n.reminders.find((r) => r.id === n.sheetId);

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">Notificações</h1>
        <span className="size-9.5" aria-hidden="true" />
      </header>

      {n.permission ? <PermissaoAviso status={n.permission} /> : null}

      <div className="flex flex-col gap-3">
        {n.reminders.map((reminder) => {
          const meta = META[reminder.type];
          const blocked = reminder.type === "meds" && !n.hasMedication;
          return (
            <LembreteCard
              key={reminder.id}
              tone={meta.tone}
              icon={meta.icon}
              title={meta.title}
              subtitle={reminderSubtitle(reminder.type, {
                time: reminder.time,
                hasMedication: n.hasMedication,
              })}
              enabled={reminder.enabled}
              // Sem remédio cadastrado o lembrete não tem horário para derivar: ligar
              // seria prometer uma notificação que nunca sai. O toggle mostra o valor
              // guardado e o `disabled` do botão barra o toque — sem guarda no handler.
              blocked={blocked}
              onToggle={(next) => n.setEnabled(reminder.id, next)}
              onEditTime={
                TIMED.includes(reminder.type)
                  ? () => n.openSheet(reminder.id)
                  : undefined
              }
            />
          );
        })}
      </div>

      <p className="rounded-card bg-lilac-tint px-4 py-3 text-center text-sm font-semibold text-lilac-deep">
        Lembretes chegam como notificação, mesmo com o app fechado.
      </p>

      {aberto ? (
        <HorarioSheet
          open
          onOpenChange={(open) => n.setSheetOpen(aberto.id, open)}
          title={META[aberto.type].title}
          tone={META[aberto.type].tone}
          icon={META[aberto.type].icon}
          time={aberto.time ?? "18:00"}
          onSave={(time) => n.setTime(aberto.id, time)}
        />
      ) : null}
    </div>
  );
}
