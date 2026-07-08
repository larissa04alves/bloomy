"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Focus, WorkoutSummary, WorkoutWithExercises } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export type WorkoutInput = {
  name: string;
  focus: Focus;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: number;
    restSeconds: number;
    position: number;
  }[];
};

export function useTreinos() {
  const list = useResource<{ workouts: WorkoutWithExercises[] }>(
    useCallback(() => api.get<{ workouts: WorkoutWithExercises[] }>("/api/workouts"), []),
  );
  const sum = useResource<WorkoutSummary>(
    useCallback(() => api.get<WorkoutSummary>("/api/workouts/summary"), []),
  );

  const workouts = list.data?.workouts ?? [];

  const create = useCallback(
    async (input: WorkoutInput) => {
      try {
        await api.post("/api/workouts", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível criar o treino");
      }
    },
    [list],
  );

  const edit = useCallback(
    async (id: string, input: WorkoutInput) => {
      try {
        await api.put(`/api/workouts/${id}`, input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível salvar o treino");
      }
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ workouts: workouts.filter((w) => w.id !== id) }); // otimista
      try {
        await api.del(`/api/workouts/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o treino");
      }
    },
    [list, workouts],
  );

  return {
    workouts,
    summary: sum.data,
    loading: list.loading,
    reload: () => {
      list.reload();
      sum.reload();
    },
    create,
    edit,
    remove,
  };
}
