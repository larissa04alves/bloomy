"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { enablePush, pushStatus } from "@/lib/push";
import {
  DEFAULT_GOAL_TARGETS,
  DEFAULT_PORTION_ML,
  type Goal,
  type Profile,
} from "@/lib/api-types";
import { toastError } from "@/lib/toast";

import {
  nextStep,
  onboardingPayload,
  skipTarget,
  type OnboardingState,
  type OnboardingStep,
} from "./format";

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

  // Decidido no efeito, e não no render: `Notification.permission` não existe no SSR.
  const [askPush, setAskPush] = useState(false);
  useEffect(() => {
    setAskPush(pushStatus() === "default");
  }, []);

  const goTo = useCallback(
    (target: OnboardingStep | "finish") => {
      if (target === "finish") {
        void finish(state);
        return;
      }
      setState((s) => (s.step === state.step ? { ...s, step: target } : s));
    },
    [state, finish],
  );

  const advance = useCallback(() => goTo(nextStep(state.step, askPush)), [goTo, state.step, askPush]);

  /** Chamado direto do toque: o Chrome só mostra o pedido de permissão a partir de
   *  um gesto. Termina o onboarding com qualquer resposta — negar não trava ninguém. */
  const activatePush = useCallback(async () => {
    setPending(true);
    try {
      await enablePush();
    } catch (e) {
      toastError(e, "Não foi possível ativar as notificações neste aparelho");
    }
    await finish(state);
  }, [state, finish]);

  const back = useCallback(() => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as OnboardingStep }));
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
    totalSteps: askPush ? 4 : 3,
    advance,
    activatePush,
    back,
    skip: useCallback(() => goTo(skipTarget(state.step, askPush)), [goTo, state.step, askPush]),
  };
}
