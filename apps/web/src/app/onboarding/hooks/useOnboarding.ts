"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { maskBirthDate } from "@/lib/body";
import { enablePush, pushStatus } from "@/lib/push";
import {
  DEFAULT_GOAL_TARGETS,
  DEFAULT_PORTION_ML,
  type Goal,
  type Profile,
} from "@/lib/api-types";
import { toastError } from "@/lib/toast";

import {
  applyBodyStep,
  bodyErrors,
  finishHref,
  skipBodyStep,
  visibleErrors,
  type BodyField,
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
    heightRaw: "",
    weightRaw: "",
    birthRaw: "",
    recommendedMl: null,
    waterMl: DEFAULT_GOAL_TARGETS.water,
    portionMl: DEFAULT_PORTION_ML,
    meals: DEFAULT_GOAL_TARGETS.meals,
    workoutDays: new Set(),
    cycleIntent: false,
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
        router.replace(finishHref(current));
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
      setState((s) => {
        if (s.step !== state.step) return s;
        // Sair do "Sobre você" (avançando ou pulando) fixa a recomendação da água.
        const base = s.step === 1 ? applyBodyStep(s) : s;
        return { ...base, step: target };
      });
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

  /** Ativar ou pular o ciclo: a escolha precisa ir junto quando este é o último passo. */
  const chooseCycle = useCallback(
    (cycleIntent: boolean) => {
      const next = { ...state, cycleIntent };
      const target = nextStep(5, askPush);
      if (target === "finish") {
        setState(next);
        void finish(next);
        return;
      }
      setState({ ...next, step: target });
    },
    [state, askPush, finish],
  );

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

  const [touched, setTouched] = useState<ReadonlySet<BodyField>>(new Set());
  const errors = bodyErrors(state);

  return {
    state,
    pending,
    /** Só os erros de campos já visitados; o CTA bloqueia por todos (`canContinue`). */
    bodyErrors: visibleErrors(errors, touched),
    canContinue: Object.keys(errors).length === 0,
    touchField: useCallback(
      (field: BodyField) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field))),
      [],
    ),
    setHeight: useCallback(
      (heightRaw: string) => setState((s) => ({ ...s, heightRaw })),
      [],
    ),
    setWeight: useCallback(
      (weightRaw: string) => setState((s) => ({ ...s, weightRaw })),
      [],
    ),
    setBirthDate: useCallback(
      (raw: string) => setState((s) => ({ ...s, birthRaw: maskBirthDate(raw) })),
      [],
    ),
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
    totalSteps: askPush ? 6 : 5,
    advance,
    activateCycle: useCallback(() => chooseCycle(true), [chooseCycle]),
    skipCycle: useCallback(() => chooseCycle(false), [chooseCycle]),
    activatePush,
    back,
    skip: useCallback(() => {
      // Pular o "Sobre você" é não informar: o que foi digitado não vale nem gera
      // recomendação. O `goTo` encadeia nesta atualização (setState funcional).
      if (state.step === 1) setState(skipBodyStep);
      goTo(skipTarget(state.step, askPush));
    }, [goTo, state.step, askPush]),
  };
}
