"use client";

import { useCallback, useEffect, useRef } from "react";

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

  // Fila de gravação do humor: dois toques rápidos viram dois PUTs em ordem, e
  // nunca dois em voo — fora de ordem, o servidor gravaria o humor antigo.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);

  /** Grava o humor do dia — mesmo check-in da Mente (upsert por dia). */
  const setMood = useCallback(
    (index: number) => {
      const mood = MOOD_ORDER[index];
      if (!mood || !data) return;

      // Otimista: a carinha acende na hora; o PUT confirma.
      setData((cur) => (cur ? { ...cur, checkin: { mood } } : cur));

      pending.current += 1;
      queue.current = queue.current
        .then(() => api.put("/api/checkins", { mood }))
        .catch((e: unknown) => {
          toastError(e, "Não foi possível registrar o humor");
          // Só recarrega se este era o último toque da fila: com outro pendente,
          // quem decide o que fica na tela é a intenção mais recente. Um snapshot
          // local aqui apagaria a seleção que a pessoa acabou de fazer.
          if (pending.current === 1) reload();
        })
        .finally(() => {
          pending.current -= 1;
        });
    },
    [data, setData, reload],
  );

  return { today: data, moodIndex, loading, error, reload, setMood };
}
