"use client";

import { ArrowLeftIcon, HandTapIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { CICLO_HREF } from "@/lib/cycle";

import { CicloError } from "../components/CicloError";
import { CicloSkeleton } from "../components/CicloSkeleton";
import { RegistroSheet } from "../components/RegistroSheet";
import { ListaCiclos } from "./components/ListaCiclos";
import { MesGrid } from "./components/MesGrid";
import { ResumoMedias } from "./components/ResumoMedias";
import { useCalendario } from "./hooks/useCalendario";

export default function CalendarioPage() {
  const c = useCalendario();

  if (!c.ready || !c.cycle) {
    if (c.error) return <CicloError onRetry={c.reload} />;
    return <CicloSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href={CICLO_HREF}
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">Calendário</h1>
        <span className="size-9.5" aria-hidden="true" />
      </header>

      {c.tipVisible ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-read">
          <HandTapIcon weight="fill" className="shrink-0 text-ink-faint" />
          <span className="flex-1">Toque num dia para ver ou editar o que você registrou</span>
          <button
            type="button"
            onClick={c.dismissTip}
            aria-label="Fechar dica"
            className="grid min-h-9 min-w-9 shrink-0 place-items-center text-ink-faint"
          >
            <XIcon weight="bold" />
          </button>
        </p>
      ) : null}

      <MesGrid
        month={c.month}
        weekdays={c.weekdays}
        grid={c.grid}
        ready={c.monthReady}
        error={c.monthError}
        onRetry={c.retryMonth}
        legend={c.legend}
        natural={c.natural}
        onPrev={c.prevMonth}
        onNext={c.nextMonth}
        onOpenDay={c.openDay}
      />

      {c.averages ? <ResumoMedias averages={c.averages} /> : null}

      <ListaCiclos items={c.history} error={c.historyError} onRetry={c.reloadHistory} />

      <RegistroSheet
        open={c.registro.open}
        onOpenChange={c.setRegistroOpen}
        day={c.registro.day}
        initial={c.registro.initial}
        hiddenSymptoms={c.cycle.hiddenSymptoms}
        onSave={c.saveDay}
        onHiddenChange={c.setHiddenSymptoms}
      />
    </div>
  );
}
