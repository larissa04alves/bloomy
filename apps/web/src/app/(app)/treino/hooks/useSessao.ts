"use client";

import { useCallback, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { SessionDetail, WorkoutSummary } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { applySetPatch } from "./session";

type View = "lista" | "ex" | "fim";
type SetPatch = { reps?: number | null; load?: number | null };
type FinishSummary = { durationSec: number; exerciseCount: number; summary: WorkoutSummary };

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
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

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
      setStartingId(workoutId);
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
      } finally {
        setStartingId(null);
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
        // Recarrega o estado canônico em vez de restaurar um snapshot local —
        // um snapshot poderia sobrescrever escritas concorrentes já persistidas.
        reload();
        toastError(e, "Não foi possível salvar a série");
      }
    },
    [detail, reload],
  );

  // Marca feito (otimista): grava reps/load atuais + done. Retorna true se marcou.
  const markDone = useCallback(
    async (setId: string, patch: SetPatch): Promise<boolean> => {
      if (!detail) return false;
      patchLocal(setId, { ...patch, done: true });
      try {
        await api.put(
          `/api/sessions/${detail.session.id}/sets/${setId}`,
          toSetBody({ ...patch, done: true }),
        );
        return true;
      } catch (e) {
        // Não restaura snapshot completo: se outra série foi marcada nesse meio
        // tempo, o rollback apagaria a confirmação dela. Recarrega o canônico.
        reload();
        toastError(e, "Não foi possível salvar a série");
        return false;
      }
    },
    [detail, patchLocal, reload],
  );

  const complete = useCallback(async () => {
    if (!detail) return;
    setCompleting(true);
    try {
      const summary = await api.post<FinishSummary>(`/api/sessions/${detail.session.id}/complete`);
      setFinishSummary(summary);
      setView("fim");
    } catch (e) {
      toastError(e, "Não foi possível concluir o treino");
    } finally {
      setCompleting(false);
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
    startingId,
    completing,
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
