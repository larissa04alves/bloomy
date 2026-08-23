"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { DEFAULT_PORTION_ML, type Goal, type Profile } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import type { MetaDomain } from "./format";

export function useMetas() {
  const {
    data: goalsData,
    setData: setGoals,
    error: goalsError,
    reload: reloadGoals,
  } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );

  const {
    data: profileData,
    setData: setProfile,
    error: profileError,
    reload: reloadProfile,
  } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );

  const targetOf = (domain: MetaDomain, fallback: number) =>
    goalsData?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  const saveTarget = useCallback(
    async (domain: MetaDomain, target: number) => {
      const current = goalsData;
      const found = current?.goals.find((g) => g.domain === domain);
      if (!current || !found) return;
      if (found.target === target) return;

      // Otimista: a pill já mostra o novo valor quando a sheet fecha.
      setGoals({
        goals: current.goals.map((g) => (g.id === found.id ? { ...g, target } : g)),
      });
      try {
        await api.put(`/api/goals/${found.id}`, { target });
      } catch (e) {
        setGoals(current);
        toastError(e, "Não foi possível salvar a meta");
      }
    },
    [goalsData, setGoals],
  );

  const savePortion = useCallback(
    async (waterPortionMl: number) => {
      const current = profileData;
      if (!current) return;
      if (current.profile.waterPortionMl === waterPortionMl) return;

      setProfile({ profile: { ...current.profile, waterPortionMl } });
      try {
        await api.patch("/api/profile", { waterPortionMl });
      } catch (e) {
        setProfile(current);
        toastError(e, "Não foi possível salvar o tamanho da porção");
      }
    },
    [profileData, setProfile],
  );

  return {
    waterGoalMl: targetOf("water", 2000),
    mealsTarget: targetOf("meals", 3),
    workoutTarget: targetOf("workout", 4),
    waterPortionMl: profileData?.profile.waterPortionMl ?? DEFAULT_PORTION_ML,
    // `ready` em vez de `loading`: a tela só renderiza com os DOIS recursos em mãos,
    // senão a pill de hidratação piscaria o default antes do valor real.
    ready: goalsData !== null && profileData !== null,
    error: goalsError ?? profileError,
    reload: useCallback(() => {
      reloadGoals();
      reloadProfile();
    }, [reloadGoals, reloadProfile]),
    saveTarget,
    savePortion,
  };
}
