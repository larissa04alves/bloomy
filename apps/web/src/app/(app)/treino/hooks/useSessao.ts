"use client";

import { useCallback, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { SessionDetail } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { applySetPatch } from "./session";

type View = "lista" | "ex" | "fim";
type SetPatch = { reps?: number | null; load?: number | null };
type FinishSummary = { durationSec: number; exerciseCount: number };

// O back aceita reps/load como z.number().optional() (não .nullable()): enviar null → 400.
// Só mandamos chaves com número de fato; done sempre que definido.
function toSetBody(patch: SetPatch & { done?: boolean }) {
  const body: { reps?: number; load?: number; done?: boolean } = {};
  if (typeof patch.reps === "number") body.reps = patch.reps;
  if (typeof patch.load === "number") body.load = patch.load;
  if (typeof patch.done === "boolean") body.done = patch.done;
  return body;
}

export function useSessao() {
  const { data, loading, reload, setData } = useResource<{ session: SessionDetail | null }>(
    useCallback(() => api.get<{ session: SessionDetail | null }>("/api/sessions/active"), []),
  );
  const detail = data?.session ?? null;

  const [view, setView] = useState<View>("lista");
  const [activeEx, setActiveEx] = useState(0);
  const [finishSummary, setFinishSummary] = useState<FinishSummary | null>(null);

  const patchLocal = useCallback(
    (setId: string, patch: SetPatch & { done?: boolean }) => {
      if (!detail) return;
      setData({
        session: { ...detail, exercises: applySetPatch(detail.exercises, setId, patch) },
      });
    },
    [detail, setData],
  );

  const start = useCallback(
    async (workoutId: string) => {
      try {
        const { session } = await api.post<{ session: SessionDetail }>(
          `/api/workouts/${workoutId}/sessions`,
        );
        setData({ session });
        setView("lista");
        setActiveEx(0);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          reload(); // já havia uma sessão ativa — recarrega em vez de erro
          return;
        }
        toastError(e, "Não foi possível iniciar o treino");
      }
    },
    [setData, reload],
  );

  const openExercise = useCallback((i: number) => {
    setActiveEx(i);
    setView("ex");
  }, []);
  const backToList = useCallback(() => setView("lista"), []);

  // Edição local (stepper) sem persistir.
  const setSetValue = useCallback((setId: string, patch: SetPatch) => patchLocal(setId, patch), [patchLocal]);

  // Persiste reps/load ao sair do campo (sem marcar feito).
  const persistSet = useCallback(
    async (setId: string, patch: SetPatch) => {
      if (!detail) return;
      try {
        await api.put(`/api/sessions/${detail.session.id}/sets/${setId}`, toSetBody(patch));
      } catch (e) {
        toastError(e, "Não foi possível salvar a série");
      }
    },
    [detail],
  );

  // Marca feito (otimista): grava reps/load atuais + done. Retorna true se marcou.
  const markDone = useCallback(
    async (setId: string, patch: SetPatch): Promise<boolean> => {
      if (!detail) return false;
      const prev = data;
      patchLocal(setId, { ...patch, done: true });
      try {
        await api.put(
          `/api/sessions/${detail.session.id}/sets/${setId}`,
          toSetBody({ ...patch, done: true }),
        );
        return true;
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível salvar a série");
        return false;
      }
    },
    [detail, data, setData, patchLocal],
  );

  const complete = useCallback(async () => {
    if (!detail) return;
    try {
      const summary = await api.post<FinishSummary>(`/api/sessions/${detail.session.id}/complete`);
      setFinishSummary(summary);
      setView("fim");
    } catch (e) {
      toastError(e, "Não foi possível concluir o treino");
    }
  }, [detail]);

  const reset = useCallback(() => {
    setData({ session: null });
    setFinishSummary(null);
    setView("lista");
    setActiveEx(0);
  }, [setData]);

  return {
    detail,
    loading,
    view,
    activeEx,
    finishSummary,
    start,
    openExercise,
    backToList,
    setSetValue,
    persistSet,
    markDone,
    complete,
    reset,
  };
}
