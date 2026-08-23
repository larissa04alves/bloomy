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
    // fallback enquanto o profile não chegou: a Corpo renderiza antes do fetch
    waterPortionMl: profile?.profile.waterPortionMl ?? DEFAULT_PORTION_ML,
  };
}
