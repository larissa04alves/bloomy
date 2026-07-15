"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Checkin, Mood } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { mergeCheckin, notesOnly } from "./mente-helpers";

type CheckinResponse = { checkin: Checkin | null };
type HistoryResponse = { checkins: Checkin[] };

export function useMente() {
  const todayRes = useResource<CheckinResponse>(
    useCallback(() => api.get<CheckinResponse>("/api/checkins"), []),
  );
  const historyRes = useResource<HistoryResponse>(
    useCallback(() => api.get<HistoryResponse>("/api/checkins/history?limit=30"), []),
  );

  const today = todayRes.data?.checkin ?? null;
  const records = notesOnly(historyRes.data?.checkins ?? []);

  /** PUT parcial + merge da resposta em today e history; rollback no catch. */
  const patch = useCallback(
    async (input: { mood?: Mood; anxiety?: number; note?: string }, errMsg: string) => {
      const prevToday = todayRes.data;
      const prevHistory = historyRes.data;
      try {
        const { checkin } = await api.put<CheckinResponse>("/api/checkins", input);
        if (checkin) {
          todayRes.setData({ checkin });
          historyRes.setData({ checkins: mergeCheckin(historyRes.data?.checkins ?? [], checkin) });
        }
      } catch (e) {
        todayRes.setData(prevToday);
        historyRes.setData(prevHistory);
        toastError(e, errMsg);
      }
    },
    [todayRes, historyRes],
  );

  const setMood = useCallback(
    (mood: Mood) => {
      // Otimista: seleção reflete na hora (o merge da resposta confirma).
      if (todayRes.data) todayRes.setData({ checkin: { ...todayRes.data.checkin, mood } as Checkin });
      void patch({ mood }, "Não foi possível registrar o humor");
    },
    [todayRes, patch],
  );

  const setAnxiety = useCallback(
    (anxiety: number) => void patch({ anxiety }, "Não foi possível registrar a ansiedade"),
    [patch],
  );

  const saveNote = useCallback(
    (note: string) => patch({ note }, "Não foi possível salvar o registro"),
    [patch],
  );

  return {
    today,
    records,
    loading: todayRes.loading || historyRes.loading,
    setMood,
    setAnxiety,
    saveNote,
  };
}
