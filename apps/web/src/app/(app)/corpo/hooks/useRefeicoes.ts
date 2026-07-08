"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { MAIN_MEAL_TYPES, type Meal, type MealsDay, type MealType } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

/** Pendências recomputadas no cliente (espelha o back: só principais, lanche nunca). */
function recomputePending(meals: { type: MealType }[]): MealType[] {
  const has = new Set(meals.map((m) => m.type));
  return MAIN_MEAL_TYPES.filter((t) => !has.has(t));
}

export function useRefeicoes() {
  const { data, loading, reload, setData } = useResource<MealsDay>(
    useCallback(() => api.get<MealsDay>("/api/meals"), []),
  );

  const meals = data?.meals ?? [];
  const pendingTypes = data?.pendingTypes ?? [];

  const commit = useCallback(
    async (nextMeals: Meal[], call: () => Promise<unknown>, errMsg: string) => {
      const prev = data;
      setData({ meals: nextMeals, pendingTypes: recomputePending(nextMeals) });
      try {
        await call();
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, errMsg);
      }
    },
    [data, setData, reload],
  );

  const addMeal = useCallback(
    (input: { type: MealType; description: string }) => {
      const optimistic: Meal = {
        id: `tmp-${crypto.randomUUID()}`,
        type: input.type,
        description: input.description,
        day: "",
        createdAt: new Date().toISOString(),
      };
      return commit(
        [...meals, optimistic],
        () => api.post("/api/meals", input),
        "Não foi possível salvar a refeição",
      );
    },
    [meals, commit],
  );

  const editMeal = useCallback(
    (id: string, input: { type: MealType; description: string }) =>
      commit(
        meals.map((m) => (m.id === id ? { ...m, ...input } : m)),
        () => api.put(`/api/meals/${id}`, input),
        "Não foi possível editar a refeição",
      ),
    [meals, commit],
  );

  const deleteMeal = useCallback(
    (id: string) =>
      commit(
        meals.filter((m) => m.id !== id),
        () => api.del(`/api/meals/${id}`),
        "Não foi possível remover a refeição",
      ),
    [meals, commit],
  );

  return { meals, pendingTypes, count: meals.length, loading, addMeal, editMeal, deleteMeal, reload };
}
