"use client";

import { CalendarDotsIcon, CaretRightIcon, GearSixIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { IconChip } from "@/components/icon-chip";
import { Screen } from "@/components/screen";
import { CALENDARIO_HREF } from "@/lib/cycle";

import { AcoesCartela } from "./components/AcoesCartela";
import { CicloError } from "./components/CicloError";
import { ConfirmarAncoraSheet } from "./components/ConfirmarAncoraSheet";
import { CicloSkeleton } from "./components/CicloSkeleton";
import { HojeCiclo } from "./components/HojeCiclo";
import { PilulaHoje } from "./components/PilulaHoje";
import { RegistroSheet } from "./components/RegistroSheet";
import { ResumoCiclo } from "./components/ResumoCiclo";
import { AJUSTES_HREF, useCiclo } from "./hooks/useCiclo";

export default function CicloPage() {
  const c = useCiclo();

  if (!c.ready || !c.view || !c.cycle) {
    if (c.error) return <CicloError onRetry={c.reload} />;
    return <CicloSkeleton />;
  }

  const { view } = c;

  return (
    <Screen
      title="Ciclo"
      subtitle={view.subtitle}
      action={
        <Link
          href={AJUSTES_HREF}
          aria-label="Ajustes do ciclo"
          className="grid size-9.5 shrink-0 place-items-center rounded-control bg-peach-tint text-peach-deep"
        >
          <GearSixIcon size={18} weight="bold" />
        </Link>
      }
    >
      <ResumoCiclo card={view.card} />

      {view.primary === "period" ? (
        <button
          type="button"
          onClick={c.openPeriodToday}
          className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach"
        >
          Menstruei hoje
        </button>
      ) : null}
      {view.primary === "bleeding" ? (
        <button
          type="button"
          onClick={() => c.openRegistro()}
          className="w-full rounded-full bg-peach-tint py-3.5 font-display font-bold text-peach-deep"
        >
          Registrar sangramento
        </button>
      ) : null}

      {view.pill ? <PilulaHoje pill={view.pill} onToggle={c.togglePill} /> : null}

      {view.anchors ? (
        <>
          <AcoesCartela anchors={view.anchors} onAsk={c.askAnchor} />
          <ConfirmarAncoraSheet
            open={c.anchorConfirm.open}
            onOpenChange={c.setAnchorConfirmOpen}
            title={view.anchors.confirm[c.anchorConfirm.kind].title}
            detail={view.anchors.confirm[c.anchorConfirm.kind].detail}
            busy={c.busy}
            onConfirm={c.confirmAnchor}
          />
        </>
      ) : null}

      <HojeCiclo
        entry={view.todayEntry}
        emptyLabel={view.todayEmptyLabel}
        onOpen={() => c.openRegistro()}
      />

      <Link
        href={CALENDARIO_HREF}
        className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm"
      >
        <IconChip tone="peach" icon={<CalendarDotsIcon size={20} weight="fill" />} />
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-bold text-ink">Calendário e histórico</span>
          <span className="text-xs font-semibold text-ink-read">{view.calendarHint}</span>
        </span>
        <CaretRightIcon weight="bold" className="text-ink-faint" />
      </Link>

      <RegistroSheet
        open={c.registro.open}
        onOpenChange={c.setRegistroOpen}
        day={c.registro.day}
        initial={c.registro.initial}
        hiddenSymptoms={c.cycle.hiddenSymptoms}
        onSave={c.saveDay}
        onHiddenChange={c.setHiddenSymptoms}
      />
    </Screen>
  );
}
