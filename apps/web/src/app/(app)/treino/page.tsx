"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Screen } from "@/components/screen";
import type { WorkoutWithExercises } from "@/lib/api-types";

import { ResumoTreinoCard } from "./components/ResumoTreinoCard";
import { SessaoAtiva } from "./components/SessaoAtiva";
import { TreinoList } from "./components/TreinoList";
import { TreinoModal } from "./components/TreinoModal";
import { useSessao } from "./hooks/useSessao";
import { useTreinos } from "./hooks/useTreinos";

export default function TreinoPage() {
  const sessao = useSessao();
  const treinos = useTreinos();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutWithExercises | undefined>(
    undefined,
  );

  if (sessao.detail) {
    const workoutName =
      treinos.workouts.find((w) => w.id === sessao.detail!.session.workoutId)
        ?.name ?? "Treino";
    return <SessaoAtiva sessao={sessao} workoutName={workoutName} />;
  }

  return (
    <Screen title="Treino" subtitle="Escolha o treino de hoje">
      {treinos.summary ? <ResumoTreinoCard summary={treinos.summary} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">
          Seus treinos
        </h2>
        <button
          type="button"
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
          className="flex items-center gap-1 text-sm font-bold text-pink-deep"
        >
          <PlusIcon size={16} weight="bold" /> Novo treino
        </button>
      </div>

      <TreinoList
        workouts={treinos.workouts}
        startingId={sessao.startingId}
        onStart={sessao.start}
        onEdit={(w) => {
          setEditing(w);
          setModalOpen(true);
        }}
        onDelete={treinos.remove}
      />

      <TreinoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSubmit={(input) => {
          if (editing) treinos.edit(editing.id, input);
          else treinos.create(input);
        }}
      />
    </Screen>
  );
}
