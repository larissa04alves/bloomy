"use client";

import { useCallback, useEffect } from "react";

import { api } from "@/lib/api";
import { MOOD_ORDER, type TodayPayload } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useHome() {
  const { data, error, loading, reload, setData } = useResource<TodayPayload>(
    useCallback(() => api.get<TodayPayload>("/api/today"), []),
  );

  // Revalida quando a aba volta a ficar visível: cobre o app em segundo plano
  // atravessando a meia-noite e registro feito em outro dispositivo.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const moodIndex = data?.checkin.mood ? MOOD_ORDER.indexOf(data.checkin.mood) : null;

  /** Grava o humor do dia — mesmo check-in da Mente (upsert por dia). */
  const setMood = useCallback(
    async (index: number) => {
      const mood = MOOD_ORDER[index];
      if (!mood || !data) return;

      const prev = data;
      // Otimista: a carinha acende na hora; o PUT confirma.
      setData({ ...data, checkin: { mood } });
      try {
        await api.put("/api/checkins", { mood });
      } catch (e) {
        setData(prev);
        toastError(e, "Não foi possível registrar o humor");
      }
    },
    [data, setData],
  );

  return { today: data, moodIndex, loading, error, reload, setMood };
}
