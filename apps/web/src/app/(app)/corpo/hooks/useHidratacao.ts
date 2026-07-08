"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { WaterDay } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { garrafas } from "./garrafas";

export function useHidratacao(goalMl: number) {
  const { data, loading, reload, setData } = useResource<WaterDay>(
    useCallback(() => api.get<WaterDay>("/api/water"), []),
  );

  const totalMl = data?.totalMl ?? 0;
  const { done, target } = garrafas(totalMl, goalMl);

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

  return { totalMl, done, target, loading, addWater, reload };
}
