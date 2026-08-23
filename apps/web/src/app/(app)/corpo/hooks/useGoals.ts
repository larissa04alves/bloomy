"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { DEFAULT_PORTION_ML, type Goal, type GoalDomain, type Profile } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useGoals() {
  const { data } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );
  const { data: profile } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );

  const target = (domain: GoalDomain, fallback: number) =>
    data?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  return {
    waterGoalMl: target("water", 2000),
    mealsTarget: target("meals", 3),
    // Fallback só para o render: a Corpo desenha antes do fetch. Registrar com ele
    // gravaria 500 ml em quem configurou outra porção — daí o `portionReady`, que
    // bloqueia a ação até o valor real chegar.
    waterPortionMl: profile?.profile.waterPortionMl ?? DEFAULT_PORTION_ML,
    portionReady: profile !== null,
  };
}
