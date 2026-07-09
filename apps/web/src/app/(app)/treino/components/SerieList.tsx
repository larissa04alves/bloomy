import { ArrowLeftIcon, ArrowsOutIcon, CheckCircleIcon } from "@phosphor-icons/react";

import type { CatalogExercise, SessionExercise } from "@/lib/api-types";

import { GifThumb } from "./GifThumb";

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
  onPersist: (setId: string, patch: { reps: number | null; load: number | null }) => void;
  onDone: (setId: string, patch: { reps: number | null; load: number | null }) => void;
  onVerExecucao?: () => void;
}) {
  const doneN = exercise.sets.filter((s) => s.done).length;
  const last = exercise.lastPerformance;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onBack}
          className="grid size-10 place-items-center rounded-full bg-lilac-tint text-lilac-deep"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </button>
        {catalogExercise ? (
          <button type="button" aria-label="Ver execução" onClick={onVerExecucao}>
            <GifThumb id={catalogExercise.id} alt="" className="size-12 rounded-control" />
          </button>
        ) : null}
        <div className="flex flex-col">
          <h1 className="font-display text-xl font-bold text-ink">{exercise.name}</h1>
          <p className="text-[13px] font-semibold text-ink-read">
            {doneN} de {exercise.sets.length} séries
          </p>
        </div>
        {catalogExercise ? (
          <button
            type="button"
            onClick={onVerExecucao}
            className="ml-auto flex items-center gap-1 rounded-full bg-pink-tint px-2.5 py-1 text-[11px] font-bold text-pink-deep"
          >
            <ArrowsOutIcon size={12} weight="bold" /> ver execução
          </button>
        ) : null}
      </header>

      {last?.load != null ? (
        <p className="rounded-control bg-pink-tint px-4 py-2.5 text-[13px] font-semibold text-pink-deep">
          Último treino: {last.load} kg{last.reps != null ? ` · ${last.reps} reps` : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {exercise.sets.map((s, i) => {
          const current = !s.done && exercise.sets.slice(0, i).every((p) => p.done);
          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 rounded-card p-3 ${current ? "bg-lilac-tint" : "bg-white shadow-card-sm"}`}
            >
              <span className="w-16 text-[13px] font-bold text-ink">Série {s.setIndex}</span>

              <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={s.reps ?? ""}
                  onChange={(e) => onChangeReps(s.id, Number(e.target.value))}
                  onBlur={() => onPersist(s.id, { reps: s.reps, load: s.load })}
                  className="w-9 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                  aria-label={`Repetições da série ${s.setIndex}`}
                />
                <span className="text-[11px] font-bold text-ink-read">reps</span>
              </label>

              <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={s.load ?? ""}
                  onChange={(e) => onChangeLoad(s.id, Number(e.target.value))}
                  onBlur={() => onPersist(s.id, { reps: s.reps, load: s.load })}
                  className="w-11 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                  aria-label={`Carga da série ${s.setIndex}`}
                />
                <span className="text-[11px] font-bold text-ink-read">kg</span>
              </label>

              {s.done ? (
                <CheckCircleIcon size={26} weight="fill" className="ml-auto text-green-deep" />
              ) : (
                <button
                  type="button"
                  onClick={() => onDone(s.id, { reps: s.reps, load: s.load })}
                  className="ml-auto rounded-full bg-pink-bright px-4 py-2 text-[13px] font-bold text-white"
                >
                  Feito
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
