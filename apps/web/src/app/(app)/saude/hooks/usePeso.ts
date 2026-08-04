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
  const [saving, setSaving] = useState(false);

  const weights = list.data?.weights ?? [];

  /** Insere/substitui o registro do dia e reordena — o `day` é único por usuário. */
  const mergeWeight = useCallback(
    (weight: WeightLog) => {
      list.setData((d) => {
        if (!d) return d;
        return {
          weights: [
            ...d.weights.filter((w) => w.day !== weight.day),
            weight,
          ].sort((a, b) => b.day.localeCompare(a.day)),
        };
      });
    },
    [list],
  );

  const create = useCallback(
    async (input: WeightInput): Promise<boolean> => {
      setSaving(true);
      try {
        const { weight } = await api.post<{ weight: WeightLog }>(
          "/api/weights",
          input,
        );
        mergeWeight(weight);
        return true;
      } catch (e) {
        toastError(e, "Não foi possível registrar o peso");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [mergeWeight],
  );

  const update = useCallback(
    async (id: string, input: WeightInput): Promise<boolean> => {
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
      setSaving(true);
      try {
        await api.patch<{ weight: WeightLog }>(`/api/weights/${id}`, input);
        return true;
      } catch (e) {
        list.setData(prev ?? null);
        toastError(e, "Não foi possível salvar o peso");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData((d) =>
        d ? { weights: d.weights.filter((w) => w.id !== id) } : d,
      );
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
    saving,
    lastGrams: weights[0]?.grams,
    create,
    update,
    remove,
  };
}
