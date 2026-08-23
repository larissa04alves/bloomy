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

  // Handler da porção mora aqui, não na page: a tela só renderiza.
  const addPortion = useCallback(() => addWater(portionMl), [addWater, portionMl]);

  return { totalMl, done, target, loading, addWater, addPortion, reload };
}
