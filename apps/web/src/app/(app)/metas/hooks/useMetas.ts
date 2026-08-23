"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import { DEFAULT_PORTION_ML, type Goal, type Profile } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import type { SheetField } from "../components/MetaSheet";

import { portionHint, type MetaDomain } from "./format";

/** Configuração de uma sheet de meta: os números e o que salvar. Ícone, título e
 *  tom ficam na tela — aqui mora só a lógica. */
export type MetaSheetSpec = {
  domain: MetaDomain;
  fields: SheetField[];
  hint?: (values: Record<string, number>) => string;
  onSave: (values: Record<string, number>) => void;
};

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

  const [sheet, setSheet] = useState<MetaDomain | null>(null);

  const waterGoalMl = targetOf("water", 2000);
  const mealsTarget = targetOf("meals", 3);
  const workoutTarget = targetOf("workout", 4);
  const waterPortionMl = profileData?.profile.waterPortionMl ?? DEFAULT_PORTION_ML;

  /** As faixas repetem os números de `GOAL_LIMITS`/`PORTION_LIMITS`: aqueles moram
   *  em serviço `server-only` e não podem ser importados no client. O servidor
   *  continua sendo o dono da regra — aqui é só o alcance do stepper. */
  const sheets: Record<MetaDomain, Omit<MetaSheetSpec, "domain">> = {
    water: {
      fields: [
        { key: "goalMl", label: "Meta do dia", value: waterGoalMl, min: 500, max: 5000, step: 100, unit: "ml" },
        { key: "portionMl", label: "Cada porção", value: waterPortionMl, min: 100, max: 2000, step: 50, unit: "ml" },
      ],
      hint: (v) => portionHint(v.goalMl!, v.portionMl!),
      onSave: (v) => {
        saveTarget("water", v.goalMl!);
        savePortion(v.portionMl!);
      },
    },
    meals: {
      fields: [
        { key: "target", label: "Refeições por dia", value: mealsTarget, min: 1, max: 8, step: 1 },
      ],
      onSave: (v) => saveTarget("meals", v.target!),
    },
    workout: {
      fields: [
        { key: "target", label: "Dias por semana", value: workoutTarget, min: 1, max: 7, step: 1 },
      ],
      onSave: (v) => saveTarget("workout", v.target!),
    },
  };

  return {
    waterGoalMl,
    mealsTarget,
    workoutTarget,
    waterPortionMl,
    /** Qual sheet está aberta — a tela pergunta, não guarda. */
    isOpen: (domain: MetaDomain) => sheet === domain,
    openSheet: useCallback((domain: MetaDomain) => setSheet(domain), []),
    setSheetOpen: useCallback(
      (domain: MetaDomain, open: boolean) => setSheet(open ? domain : null),
      [],
    ),
    sheets,

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
