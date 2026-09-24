"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { WaterDay } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";
import { portions } from "@/server/shared/units";

export function useHidratacao(goalMl: number, portionMl: number) {
  const { data, loading, reload, setData } = useResource<WaterDay>(
    useCallback(() => api.get<WaterDay>("/api/water"), []),
  );

  const totalMl = data?.totalMl ?? 0;
  const { done, target } = portions(totalMl, goalMl, portionMl);

  const addWater = useCallback(
    async (ml: number) => {
      const prev = data;
      // Otimista: soma o total na hora (as gotas reagem ao totalMl)
      setData({ logs: data?.logs ?? [], totalMl: totalMl + ml });
      try {
        await api.post("/api/water", { ml });
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível registrar a água");
      }
    },
    [data, totalMl, setData, reload],
  );

  const removeLast = useCallback(async () => {
    const prev = data;
    // Otimista só quando o último registro é conhecido; logo após um add otimista
    // os logs ainda não têm a linha nova, então espera o servidor.
    const last = data?.logs[0];
    if (data && last && data.logs.reduce((s, l) => s + l.ml, 0) === totalMl) {
      setData({ logs: data.logs.slice(1), totalMl: totalMl - last.ml });
    }
    try {
      await api.del("/api/water/last");
      reload();
    } catch (e) {
      if (prev) setData(prev);
      toastError(e, "Não foi possível tirar a água");
    }
  }, [data, totalMl, setData, reload]);

  // Handler da porção mora aqui, não na page: a tela só renderiza.
  const addPortion = useCallback(() => addWater(portionMl), [addWater, portionMl]);

  return { totalMl, done, target, loading, addWater, addPortion, removeLast, reload };
}
