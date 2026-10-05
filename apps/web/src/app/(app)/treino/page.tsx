"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";

import { BicepsFlexedIcon } from "@/components/icons/biceps-flexed";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Screen } from "@/components/screen";
import type { WorkoutWithExercises } from "@/lib/api-types";

import { PreviaTreino } from "./components/PreviaTreino";
import { ResumoTreinoCard } from "./components/ResumoTreinoCard";
import { SessaoAtiva } from "./components/SessaoAtiva";
import { TreinoList } from "./components/TreinoList";
import { TreinoModal } from "./components/TreinoModal";
import { useBackStack } from "./hooks/useBackStack";
import { useSessao } from "./hooks/useSessao";
import { useTreinos } from "./hooks/useTreinos";

export default function TreinoPage() {
  const sessao = useSessao();
  const treinos = useTreinos();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutWithExercises | undefined>(
    undefined,
  );
  const [previewing, setPreviewing] = useState<WorkoutWithExercises | null>(null);
  // A prévia também é uma camada: o voltar do celular fecha o sheet em vez de sair.
  useBackStack(previewing ? 1 : 0, useCallback(() => setPreviewing(null), []));

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  if (sessao.detail) {
    const workoutName =
      treinos.workouts.find((w) => w.id === sessao.detail!.session.workoutId)
        ?.name ?? "Treino";
    return (
      <SessaoAtiva
        sessao={sessao}
        workoutName={workoutName}
        onExit={() => {
          sessao.reset();
          treinos.reload(); // o card semanal foi buscado à parte — recarrega
        }}
      />
    );
  }

  return (
    <Screen title="Treino" subtitle="Escolha o treino de hoje">
      {treinos.summary ? <ResumoTreinoCard summary={treinos.summary} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">
          Seus treinos
        </h2>
        {treinos.workouts.length > 0 ? (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1 text-sm font-bold text-pink-deep"
          >
            <PlusIcon size={16} weight="bold" /> Novo treino
          </button>
        ) : null}
      </div>

      {treinos.loading && treinos.workouts.length === 0 ? null : (
        <TreinoList
          workouts={treinos.workouts}
          startingId={sessao.startingId}
          onStart={sessao.start}
          onPreview={setPreviewing}
          onEdit={(w) => {
            setEditing(w);
            setModalOpen(true);
          }}
          onDelete={treinos.remove}
          onCreate={openCreate}
        />
      )}

      <PreviaTreino
        workout={previewing}
        starting={sessao.startingId !== null}
        onOpenChange={(open) => {
          if (!open) window.history.back();
        }}
        onStart={async () => {
          if (!previewing) return;
          await sessao.start(previewing.id);
          setPreviewing(null);
        }}
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

      {treinos.creating ? (
        <LoadingOverlay label="Criando treino…">
          <BicepsFlexedIcon animate size={40} className="text-pink-bright" />
        </LoadingOverlay>
      ) : null}
    </Screen>
  );
}
