"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Goal, GoalDomain } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useGoals() {
  const { data } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );

  const target = (domain: GoalDomain, fallback: number) =>
    data?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  return { waterGoalMl: target("water", 2000), mealsTarget: target("meals", 3) };
}
