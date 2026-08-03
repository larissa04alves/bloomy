"use client";

import { useCallback, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type {
  CatalogExercise,
  SessionAdjustments,
  SessionDetail,
  SessionExercise,
  WorkoutSummary,
} from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { applySetPatch } from "./session";

type View = "lista" | "ex" | "fim";
type SetPatch = { reps?: number | null; load?: number | null };
type AdjustState =
  | { mode: "add" }
  | { mode: "swap"; id: string; name: string; doneSets: number }
  | null;
type FinishSummary = {
  durationSec: number;
  exerciseCount: number;
  adjustments: SessionAdjustments;
  summary: WorkoutSummary;
};

// Defaults de um exercício escolhido do catálogo — os mesmos do TreinoModal.
const CATALOG_DEFAULTS = { targetSets: 3, targetReps: 12, restSeconds: 45 };

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
  const [adjust, setAdjust] = useState<AdjustState>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<
    { id: string; name: string; doneSets: number } | null
  >(null);

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

  const openAdd = useCallback(() => setAdjust({ mode: "add" }), []);
  const openSwap = useCallback(
    (ex: SessionExercise) =>
      setAdjust({
        mode: "swap",
        id: ex.id,
        name: ex.name,
        doneSets: ex.sets.filter((s) => s.done).length,
      }),
    [],
  );
  const closeAdjust = useCallback(() => setAdjust(null), []);

  // Um único caminho para adicionar e trocar: o modo vem do estado `adjust`.
  const pickExercise = useCallback(
    async (picked: CatalogExercise) => {
      if (!detail || !adjust) return;
      const body = {
        name: picked.namePt,
        catalogId: picked.id,
        muscleGroup: null,
        ...CATALOG_DEFAULTS,
      };
      const sessionId = detail.session.id;
      try {
        if (adjust.mode === "add") {
          const { session } = await api.post<{ session: SessionDetail }>(
            `/api/sessions/${sessionId}/exercises`,
            body,
          );
          setData({ session });
        } else {
          const { session } = await api.put<{
            session: SessionDetail;
            discardedDoneSets: number;
          }>(`/api/sessions/${sessionId}/exercises/${adjust.id}`, body);
          setData({ session });
        }
        setAdjust(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          // toastError mostra e.message quando `e` é ApiError — passar `undefined`
          // força o fallback, porque o back devolve texto em EN ("exercise already in session").
          toastError(undefined, "Esse exercício já está na sessão");
          return; // mantém a busca aberta para escolher outro
        }
        toastError(
          e,
          adjust.mode === "add"
            ? "Não foi possível adicionar o exercício"
            : "Não foi possível trocar o exercício",
        );
      }
    },
    [detail, adjust, setData],
  );

  const removeExercise = useCallback(
    async (sessionExerciseId: string) => {
      if (!detail) return;
      try {
        // o client expõe `del`, não `delete` (ver apps/web/src/lib/api.ts)
        const { session } = await api.del<{ session: SessionDetail }>(
          `/api/sessions/${detail.session.id}/exercises/${sessionExerciseId}`,
        );
        setData({ session });
      } catch (e) {
        toastError(e, "Não foi possível remover o exercício");
      }
    },
    [detail, setData],
  );

  // Mesma regra da troca: sem série feita remove direto, com série feita confirma antes.
  const askRemove = useCallback(
    (ex: SessionExercise) => {
      const doneSets = ex.sets.filter((s) => s.done).length;
      if (doneSets === 0) {
        void removeExercise(ex.id);
        return;
      }
      setPendingRemoval({ id: ex.id, name: ex.name, doneSets });
    },
    [removeExercise],
  );

  const confirmRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    await removeExercise(pendingRemoval.id);
    setPendingRemoval(null);
  }, [pendingRemoval, removeExercise]);

  const cancelRemove = useCallback(() => setPendingRemoval(null), []);

  // Chamado da tela de fim: a sessão já está concluída, `detail` ainda tem o id.
  const applyToWorkout = useCallback(async () => {
    if (!detail) return;
    setApplying(true);
    try {
      await api.post(`/api/sessions/${detail.session.id}/apply-to-workout`);
      setApplied(true);
    } catch (e) {
      toastError(e, "Não foi possível salvar no treino");
    } finally {
      setApplying(false);
    }
  }, [detail]);

  const reset = useCallback(() => {
    setData({ session: null });
    setFinishSummary(null);
    setView("lista");
    setActiveEx(0);
    setAdjust(null);
    setApplied(false);
    setApplying(false);
    setPendingRemoval(null);
  }, [setData]);

  return {
    detail,
    loading,
    view,
    activeEx,
    finishSummary,
    startingId,
    completing,
    adjust,
    applying,
    applied,
    pendingRemoval,
    start,
    openExercise,
    backToList,
    setSetValue,
    persistSet,
    markDone,
    complete,
    reset,
    openAdd,
    openSwap,
    closeAdjust,
    pickExercise,
    askRemove,
    confirmRemove,
    cancelRemove,
    applyToWorkout,
  };
}
