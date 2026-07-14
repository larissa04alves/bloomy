import {
  ArrowLeftIcon,
  ArrowsOutIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import type { CatalogExercise, SessionExercise } from "@/lib/api-types";
import { FOCUS_LABELS } from "@/lib/api-types";

import { GifThumb } from "./GifThumb";

function StepperField({
  label,
  value,
  mode = "numeric",
  ariaLabel,
  onChange,
  onCommit,
  onBlurCommit,
}: {
  label: string;
  value: number | null;
  mode?: "numeric" | "decimal";
  ariaLabel: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  onBlurCommit: () => void;
}) {
  const step = (delta: number) => {
    const next = Math.max(0, (value ?? 0) + delta);
    onChange(next);
    onCommit(next);
  };

  // Digitação manual: nunca deixa reps/carga ir para negativo ou NaN.
  const sanitize = (raw: string) => {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl bg-white px-2 py-2">
      <span className="px-1 text-xs font-bold text-ink-read">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => step(-1)}
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-lilac-tint text-lilac-deep"
        >
          <MinusIcon size={14} weight="bold" />
        </button>
        <input
          type="number"
          min={0}
          inputMode={mode}
          value={value ?? ""}
          onChange={(e) => onChange(sanitize(e.target.value))}
          onBlur={onBlurCommit}
          className="w-full min-w-0 bg-transparent text-center text-base font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={ariaLabel}
        />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => step(1)}
          className="grid size-7 shrink-0 place-items-center rounded-lg bg-lilac-tint text-lilac-deep"
        >
          <PlusIcon size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function SerieList({
  exercise,
  catalogExercise,
  onBack,
  onChangeReps,
  onChangeLoad,
  onPersist,
  onDone,
  onVerExecucao,
}: {
  exercise: SessionExercise;
  catalogExercise?: CatalogExercise | null;
  onBack: () => void;
  onChangeReps: (setId: string, reps: number) => void;
  onChangeLoad: (setId: string, load: number) => void;
  onPersist: (
    setId: string,
    patch: { reps: number | null; load: number | null },
  ) => void;
  onDone: (
    setId: string,
    patch: { reps: number | null; load: number | null },
  ) => void;
  onVerExecucao?: () => void;
}) {
  const doneN = exercise.sets.filter((s) => s.done).length;
  const total = exercise.sets.length;
  const last = exercise.lastPerformance;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onBack}
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </button>
        {catalogExercise ? (
          <button
            type="button"
            aria-label="Ver execução"
            onClick={onVerExecucao}
            className="size-20 shrink-0 overflow-hidden rounded-2xl bg-lilac-tint-soft shadow-card-sm"
          >
            <GifThumb
              id={catalogExercise.id}
              alt=""
              className="size-full object-cover"
            />
          </button>
        ) : null}
        <div className="flex flex-col">
          <h1 className="font-display text-lg font-bold text-ink">
            {exercise.name}
          </h1>
          {catalogExercise ? (
            <p className="text-xs font-semibold text-ink-read">
              {FOCUS_LABELS[catalogExercise.group]}
            </p>
          ) : null}
        </div>
      </header>

      {catalogExercise ? (
        <button
          type="button"
          onClick={onVerExecucao}
          className="flex w-fit items-center gap-1.5 rounded-full bg-lilac-tint px-4 py-2 text-xs font-bold text-lilac-deep"
        >
          <ArrowsOutIcon size={14} weight="bold" /> Ver execução
        </button>
      ) : null}

      {last?.load != null ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-lilac-tint px-4 py-3">
          <ClockCounterClockwiseIcon
            size={18}
            weight="fill"
            className="shrink-0 text-lilac-deep"
          />
          <span className="text-sm font-semibold text-lilac-deep">
            Último treino: {last.load} kg
            {last.reps != null ? ` · ${last.reps} reps` : ""}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="font-display text-sm font-bold text-ink">Séries</h2>
          <div className="flex items-center gap-1.5">
            {exercise.sets.map((s) => (
              <span
                key={s.id}
                className={`size-2 rounded-full ${
                  s.done ? "bg-lilac-deep" : "bg-lilac-tint"
                }`}
              />
            ))}
            <span className="ml-1 text-xs font-bold text-lilac-deep">
              {doneN} de {total}
            </span>
          </div>
        </div>

        {exercise.sets.map((s, i) => {
          const current =
            !s.done && exercise.sets.slice(0, i).every((p) => p.done);
          const bg = s.done
            ? "bg-green-tint-soft"
            : current
              ? "bg-lilac-tint"
              : "bg-lilac-tint-soft";
          return (
            <div
              key={s.id}
              className={`flex flex-col gap-3 rounded-2xl p-3.5 ${bg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-read">
                  Série {s.setIndex}
                </span>
                {s.done ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-deep">
                    <CheckCircleIcon size={16} weight="fill" /> Finalizada
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2">
                <StepperField
                  label="reps"
                  value={s.reps}
                  mode="numeric"
                  ariaLabel={`Repetições da série ${s.setIndex}`}
                  onChange={(v) => onChangeReps(s.id, v)}
                  onCommit={(v) => onPersist(s.id, { reps: v, load: s.load })}
                  onBlurCommit={() =>
                    onPersist(s.id, { reps: s.reps, load: s.load })
                  }
                />
                <StepperField
                  label="kg"
                  value={s.load}
                  mode="decimal"
                  ariaLabel={`Carga da série ${s.setIndex}`}
                  onChange={(v) => onChangeLoad(s.id, v)}
                  onCommit={(v) => onPersist(s.id, { reps: s.reps, load: v })}
                  onBlurCommit={() =>
                    onPersist(s.id, { reps: s.reps, load: s.load })
                  }
                />
              </div>

              {!s.done ? (
                <button
                  type="button"
                  onClick={() => onDone(s.id, { reps: s.reps, load: s.load })}
                  className="w-full rounded-xl bg-lilac py-3 text-sm font-bold text-white"
                >
                  Completar
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
