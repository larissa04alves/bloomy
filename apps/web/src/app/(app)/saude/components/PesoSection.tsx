"use client";

import { CaretDownIcon, CaretUpIcon, MinusIcon, PlusIcon, ScalesIcon } from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

import { IconChip } from "@/components/icon-chip";
import type { WeightLog } from "@/lib/api-types";

import {
  PERIODS,
  chartSeries,
  dayLabel,
  deltaBetween,
  filterPeriod,
  formatKg,
  type Delta,
  type Period,
} from "../hooks/peso-helpers";
import { PesoChart } from "./PesoChart";

/** Variação sempre em tinta neutra: a seta informa, a cor não julga. */
export function DeltaLabel({ delta }: { delta: Delta }) {
  const Icon =
    delta.direction === "up" ? CaretUpIcon : delta.direction === "down" ? CaretDownIcon : MinusIcon;
  const direction =
    delta.direction === "up" ? "subiu" : delta.direction === "down" ? "desceu" : "manteve";
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-extrabold text-ink-soft"
      aria-label={`${direction} ${delta.label} quilos`}
    >
      <Icon size={12} weight="bold" aria-hidden="true" />
      {delta.label}
    </span>
  );
}

export function PesoSection({
  weights,
  period,
  onPeriodChange,
  onAdd,
  onHistory,
}: {
  weights: WeightLog[]; // desc
  period: Period;
  onPeriodChange: (period: Period) => void;
  onAdd: () => void;
  onHistory: () => void;
}) {
  const latest = weights[0];
  // Por design: o número grande é "o último peso conhecido", então o delta ao lado
  // compara sempre com a penúltima pesagem da lista inteira (`weights[1]`), não com
  // a penúltima do período selecionado. O período (`visible`/`points`, abaixo) só
  // recorta o gráfico — não deve entrar nesta conta. Não trocar por `visible[1]`.
  const delta = latest ? deltaBetween(latest.grams, weights[1]?.grams) : null;
  const visible = filterPeriod(weights, period);
  const points = chartSeries(visible);

  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Registrar peso"
      className="grid size-6.5 place-items-center rounded-full bg-lilac text-white shadow-btn"
    >
      <PlusIcon size={15} weight="bold" />
    </button>
  );

  // Estado vazio: convite, nunca cobrança. Sem gráfico, sem períodos, sem número zerado.
  if (!latest) {
    return (
      <section className="rounded-card bg-white p-3.5 shadow-card">
        <div className="mb-2.5 flex items-center gap-2">
          <IconChip tone="lilac" icon={<ScalesIcon size={18} weight="fill" />} className="size-7" />
          <h2 className="font-display text-base font-bold text-ink">Peso</h2>
        </div>
        <p className="text-center text-sm font-bold text-ink">Nenhum peso registrado</p>
        <p className="mt-1 text-center text-xs font-semibold text-ink-faint">
          Quando quiser acompanhar, é só registrar.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-2.5 w-full rounded-full bg-lilac-tint py-2.5 font-display text-sm font-bold text-lilac-deep"
        >
          Registrar peso
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconChip tone="lilac" icon={<ScalesIcon size={18} weight="fill" />} className="size-7" />
          <h2 className="font-display text-base font-bold text-ink">Peso</h2>
        </div>
        {weights.length > 1 ? (
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-label={p.full}
                aria-pressed={p.value === period}
                onClick={() => onPeriodChange(p.value)}
                className={cn(
                  "rounded-full px-2 py-1.5 text-xs font-extrabold",
                  p.value === period
                    ? "bg-lilac text-white"
                    : "bg-lilac-tint-soft text-ink-faint",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          addButton
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold text-ink">{formatKg(latest.grams)}</span>
          <span className="font-display text-sm font-bold text-ink-soft">kg</span>
          {delta ? <DeltaLabel delta={delta} /> : null}
        </div>
        {weights.length > 1 ? addButton : null}
      </div>

      {/* Um ponto só não é gráfico: diz o que falta em vez de desenhar uma linha reta. */}
      {weights.length === 1 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          registrado em {dayLabel(latest.day)} · a tendência aparece no segundo registro
        </p>
      ) : points.length === 0 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          nenhuma pesagem nesse período · última em {dayLabel(latest.day)}
        </p>
      ) : points.length === 1 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          uma pesagem nesse período · escolha um período maior pra ver a tendência
        </p>
      ) : (
        <div className="mt-1.5">
          <PesoChart points={points} />
        </div>
      )}

      {weights.length > 1 ? (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-faint">
            {weights.length} registros
          </span>
          <button
            type="button"
            onClick={onHistory}
            className="text-xs font-bold text-lilac-deep"
          >
            Ver todos ›
          </button>
        </div>
      ) : null}
    </section>
  );
}
