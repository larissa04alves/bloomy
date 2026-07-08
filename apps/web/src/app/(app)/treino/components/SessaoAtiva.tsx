"use client";

import type { useSessao } from "../hooks/useSessao";
import { useDescanso } from "../hooks/useDescanso";
import { DescansoOverlay } from "./DescansoOverlay";
import { ExercicioList } from "./ExercicioList";
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
  const { detail, view, activeEx, finishSummary } = sessao;

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
    return (
      <>
        <SerieList
          exercise={exercise}
          onBack={sessao.backToList}
          onChangeReps={(setId, reps) => sessao.setSetValue(setId, { reps })}
          onChangeLoad={(setId, load) => sessao.setSetValue(setId, { load })}
          onPersist={(setId, patch) => sessao.persistSet(setId, patch)}
          onDone={async (setId, patch) => {
            const ok = await sessao.markDone(setId, patch);
            if (ok) descanso.start();
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
