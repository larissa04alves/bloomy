"use client";

import { useEffect, useMemo, useState } from "react";

import type { CatalogExercise } from "@/lib/api-types";

import type { useSessao } from "../hooks/useSessao";
import { useCatalogo } from "../hooks/useCatalogo";
import { useDescanso } from "../hooks/useDescanso";
import { DescansoOverlay } from "./DescansoOverlay";
import { ExercicioList } from "./ExercicioList";
import { GifViewer } from "./GifViewer";
import { SerieList } from "./SerieList";
import { SessaoFim } from "./SessaoFim";

export function SessaoAtiva({
  sessao,
  workoutName,
}: {
  sessao: ReturnType<typeof useSessao>;
  workoutName: string;
}) {
  const descanso = useDescanso();
  // Só busca o catálogo se a sessão tiver algum exercício de catálogo (GIF a resolver).
  const needsCatalog = !!sessao.detail?.exercises.some((e) => e.catalogId);
  const { catalog } = useCatalogo(needsCatalog);
  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const [preview, setPreview] = useState<CatalogExercise | null>(null);
  const { detail, view, activeEx, finishSummary } = sessao;

  // Fecha o "ver execução" ao navegar entre exercícios ou voltar pra lista
  // (não depende do overlay do GifViewer cobrir a tela inteira).
  useEffect(() => {
    setPreview(null);
  }, [activeEx, view]);

  if (!detail) return null;

  if (view === "fim" && finishSummary) {
    return (
      <SessaoFim
        durationSec={finishSummary.durationSec}
        exerciseCount={finishSummary.exerciseCount}
        onRestart={sessao.reset}
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
    />
  );
}
