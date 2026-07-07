"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Meal, MealsDay, MealType } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRefeicoes() {
  const { data, loading, reload } = useResource<MealsDay>(
    useCallback(() => api.get<MealsDay>("/api/meals"), []),
  );

  const addMeal = useCallback(
    async (input: { type: MealType; description: string }) => {
      try {
        await api.post<{ meal: Meal }>("/api/meals", input);
        reload();
      } catch (e) {
        toastError(e, "Não foi possível salvar a refeição");
      }
    },
    [reload],
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      try {
        await api.del(`/api/meals/${id}`);
        reload();
      } catch (e) {
        toastError(e, "Não foi possível remover a refeição");
      }
    },
    [reload],
  );

  return {
    meals: data?.meals ?? [],
    pendingTypes: data?.pendingTypes ?? [],
    count: data?.meals.length ?? 0,
    loading,
    addMeal,
    deleteMeal,
    reload,
  };
}
