"use client";

import { ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import type { CatalogExercise } from "@/lib/api-types";

import type { useSessao } from "../hooks/useSessao";
import { useCatalogo } from "../hooks/useCatalogo";
import { useDescanso } from "../hooks/useDescanso";
import { BuscaExercicio } from "./BuscaExercicio";
import { DescansoOverlay } from "./DescansoOverlay";
import { ExercicioList } from "./ExercicioList";
import { GifViewer } from "./GifViewer";
import { SerieList } from "./SerieList";
import { SessaoFim } from "./SessaoFim";

export function SessaoAtiva({
  sessao,
  workoutName,
  onExit,
}: {
  sessao: ReturnType<typeof useSessao>;
  workoutName: string;
  onExit: () => void;
}) {
  const descanso = useDescanso();
  const { catalog } = useCatalogo(true);
  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const [preview, setPreview] = useState<CatalogExercise | null>(null);
  const [confirmedSwap, setConfirmedSwap] = useState(false);
  const { detail, view, activeEx, finishSummary, adjust, pendingRemoval } = sessao;

  // Fecha o "ver execução" ao navegar entre exercícios ou voltar pra lista
  // (não depende do overlay do GifViewer cobrir a tela inteira).
  useEffect(() => {
    setPreview(null);
  }, [activeEx, view]);

  useEffect(() => {
    if (!adjust) setConfirmedSwap(false);
  }, [adjust]);

  if (!detail) return null;

  // Remoção com séries feitas: confirma antes de apagar.
  if (pendingRemoval) {
    return (
      <BottomSheet
        open
        onOpenChange={(open) => {
          if (!open) sessao.cancelRemove();
        }}
        title="Remover exercício"
        tone="coral"
        icon={<TrashIcon size={22} weight="fill" />}
        footer={
          <button
            type="button"
            onClick={sessao.confirmRemove}
            className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white shadow-btn"
          >
            Remover e descartar
          </button>
        }
      >
        <p className="text-sm font-semibold text-ink-read">
          {pendingRemoval.doneSets === 1
            ? "A série já registrada de "
            : `As ${pendingRemoval.doneSets} séries já registradas de `}
          <span className="font-bold text-ink">{pendingRemoval.name}</span>
          {pendingRemoval.doneSets === 1 ? " será perdida." : " serão perdidas."}
        </p>
      </BottomSheet>
    );
  }

  // Troca com séries feitas: confirma antes de abrir a busca.
  if (adjust?.mode === "swap" && adjust.doneSets > 0 && !confirmedSwap) {
    return (
      <BottomSheet
        open
        onOpenChange={(open) => {
          if (!open) sessao.closeAdjust();
        }}
        title="Trocar exercício"
        tone="pink"
        icon={<ArrowsClockwiseIcon size={22} weight="bold" />}
        footer={
          <button
            type="button"
            onClick={() => setConfirmedSwap(true)}
            className="w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn"
          >
            Trocar e descartar
          </button>
        }
      >
        <p className="text-sm font-semibold text-ink-read">
          {adjust.doneSets === 1
            ? "A série já registrada de "
            : `As ${adjust.doneSets} séries já registradas de `}
          <span className="font-bold text-ink">{adjust.name}</span>
          {adjust.doneSets === 1 ? " será perdida." : " serão perdidas."}
        </p>
      </BottomSheet>
    );
  }

  if (adjust) {
    return (
      <div className="px-5.5 pt-6 pb-28">
        <BuscaExercicio
          onBack={sessao.closeAdjust}
          onPick={(picked) => sessao.pickExercise(picked)}
          alreadyAdded={detail.exercises.flatMap((e) => (e.catalogId ? [e.catalogId] : []))}
        />
      </div>
    );
  }

  if (view === "fim" && finishSummary) {
    return (
      <SessaoFim
        durationSec={finishSummary.durationSec}
        exerciseCount={finishSummary.exerciseCount}
        summary={finishSummary.summary}
        adjustments={finishSummary.adjustments}
        onApplyToWorkout={sessao.applyToWorkout}
        applying={sessao.applying}
        applied={sessao.applied}
        onRestart={onExit}
      />
    );
  }

  if (view === "ex") {
    const exercise = detail.exercises[activeEx];
    const activeCatalog = exercise.catalogId ? catalogById.get(exercise.catalogId) ?? null : null;
    return (
      <>
        <SerieList
          exercise={exercise}
          catalogExercise={activeCatalog}
          onBack={sessao.backToList}
          onChangeReps={(setId, reps) => sessao.setSetValue(setId, { reps })}
          onChangeLoad={(setId, load) => sessao.setSetValue(setId, { load })}
          onPersist={(setId, patch) => sessao.persistSet(setId, patch)}
          onDone={async (setId, patch) => {
            const ok = await sessao.markDone(setId, patch);
            if (ok) descanso.start(exercise.restSeconds); // descanso do exercício ativo
          }}
          onVerExecucao={() => {
            if (activeCatalog) setPreview(activeCatalog);
          }}
        />
        {descanso.resting ? (
          <DescansoOverlay
            left={descanso.left}
            total={descanso.seconds}
            onAdjust={descanso.adjust}
            onSkip={descanso.stop}
          />
        ) : null}
        {preview ? <GifViewer exercise={preview} onClose={() => setPreview(null)} /> : null}
      </>
    );
  }

  return (
    <ExercicioList
      name={workoutName}
      exercises={detail.exercises}
      startedAt={detail.session.startedAt}
      auto={descanso.auto}
      onToggleAuto={descanso.setAuto}
      onOpenExercise={sessao.openExercise}
      onComplete={sessao.complete}
      completing={sessao.completing}
      onSwapExercise={sessao.openSwap}
      onRemoveExercise={sessao.askRemove}
      onAddExercise={sessao.openAdd}
    />
  );
}
