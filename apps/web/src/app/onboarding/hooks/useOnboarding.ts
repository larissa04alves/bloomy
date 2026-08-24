"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import {
  DEFAULT_GOAL_TARGETS,
  DEFAULT_PORTION_ML,
  type Goal,
  type Profile,
} from "@/lib/api-types";
import { toastError } from "@/lib/toast";

import { onboardingPayload, type OnboardingState } from "./format";

export function useOnboarding() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    waterMl: DEFAULT_GOAL_TARGETS.water,
    portionMl: DEFAULT_PORTION_ML,
    meals: DEFAULT_GOAL_TARGETS.meals,
    workoutDays: new Set(),
  });

  /** Único caminho de escrita: o "Pular" é este mesmo submit, antecipado. */
  const finish = useCallback(
    async (current: OnboardingState) => {
      setPending(true);
      try {
        await api.post<{ goals: Goal[]; profile: Profile }>(
          "/api/onboarding",
          onboardingPayload(current),
        );
      } catch (e) {
        setPending(false);
        toastError(e, "Não foi possível salvar suas metas. Tente de novo.");
        return;
      }

      try {
        router.replace("/home");
        // Sem `setPending(false)` no sucesso: a navegação desmonta a tela.
      } catch {
        setPending(false);
      }
    },
    [router],
  );

  const advance = useCallback(() => {
    if (state.step === 3) {
      void finish(state);
      return;
    }
    setState((s) =>
      s.step === state.step ? { ...s, step: (s.step + 1) as 2 | 3 } : s,
    );
  }, [state, finish]);

  const back = useCallback(() => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as 1 | 2 }));
  }, []);

  const toggleDay = useCallback((index: number) => {
    setState((s) => {
      const next = new Set(s.workoutDays);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...s, workoutDays: next };
    });
  }, []);

  return {
    state,
    pending,
    setWaterMl: useCallback(
      (waterMl: number) => setState((s) => ({ ...s, waterMl })),
      [],
    ),
    setPortionMl: useCallback(
      (portionMl: number) => setState((s) => ({ ...s, portionMl })),
      [],
    ),
    setMeals: useCallback(
      (meals: number) => setState((s) => ({ ...s, meals })),
      [],
    ),
    toggleDay,
    advance,
    back,
    skip: useCallback(() => void finish(state), [state, finish]),
  };
}
