"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Medication, MedicationInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

type ListResponse = { medications: Medication[] };

export function useAgendaRemedios() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/medications"), []),
  );

  const medications = list.data?.medications ?? [];

  const create = useCallback(
    async (input: MedicationInput) => {
      try {
        await api.post("/api/medications", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível cadastrar o remédio");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: MedicationInput) => {
      const prev = list.data;
      if (list.data) {
        list.setData({
          medications: medications.map((m) => (m.id === id ? { ...m, ...input } : m)),
        });
      }
      try {
        await api.put(`/api/medications/${id}`, input);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar o remédio");
      }
    },
    [list, medications],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ medications: medications.filter((m) => m.id !== id) });
      try {
        await api.del(`/api/medications/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o remédio");
      }
    },
    [list, medications],
  );

  return { medications, loading: list.loading, create, update, remove };
}
