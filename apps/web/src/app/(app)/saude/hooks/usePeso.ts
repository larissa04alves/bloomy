"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import type { WeightLog } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import type { Period } from "./peso-helpers";

type ListResponse = { weights: WeightLog[] };

export type WeightInput = { grams: number; day: string };

export function usePeso() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/weights"), []),
  );
  const [period, setPeriod] = useState<Period>("3m");

  const weights = list.data?.weights ?? [];

  const create = useCallback(
    async (input: WeightInput) => {
      try {
        await api.post<{ weight: WeightLog }>("/api/weights", input);
      } catch (e) {
        toastError(e, "Não foi possível registrar o peso");
        return;
      }
      try {
        // Refetch: o upsert pode ter substituído um registro existente do dia,
        // então não dá pra inserir na lista local sem reconciliar.
        list.setData(await api.get<ListResponse>("/api/weights"));
      } catch (e) {
        toastError(e, "Peso registrado, mas a lista não atualizou — recarregue");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: WeightInput) => {
      const prev = list.data;
      list.setData((d) =>
        d
          ? {
              weights: d.weights
                .map((w) => (w.id === id ? { ...w, ...input } : w))
                .sort((a, b) => b.day.localeCompare(a.day)),
            }
          : d,
      );
      try {
        await api.patch<{ weight: WeightLog }>(`/api/weights/${id}`, input);
      } catch (e) {
        list.setData(prev ?? null);
        toastError(e, "Não foi possível salvar o peso");
      }
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData((d) => (d ? { weights: d.weights.filter((w) => w.id !== id) } : d));
      try {
        await api.del(`/api/weights/${id}`);
      } catch (e) {
        list.setData(prev ?? null);
        toastError(e, "Não foi possível excluir o registro");
      }
    },
    [list],
  );

  return {
    weights,
    loading: list.loading,
    period,
    setPeriod,
    lastGrams: weights[0]?.grams,
    create,
    update,
    remove,
  };
}
