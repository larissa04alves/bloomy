"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Exam, ExamInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { byCompletedDesc, sortByWhen } from "./format";

type ListResponse = { exams: Exam[] };

export function useExames() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/exams"), []),
  );

  const all = list.data?.exams ?? [];
  const ativos = sortByWhen(all.filter((e) => e.status !== "completed"));
  const historico = byCompletedDesc(all.filter((e) => e.status === "completed"));

  const create = useCallback(
    async (input: ExamInput) => {
      try {
        await api.post("/api/exams", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível adicionar o exame");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: ExamInput) => {
      const prev = list.data;
      if (list.data) {
        list.setData({ exams: all.map((e) => (e.id === id ? { ...e, ...input } : e)) });
      }
      try {
        await api.put(`/api/exams/${id}`, input);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar o exame");
      }
    },
    [list, all],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ exams: all.filter((e) => e.id !== id) });
      try {
        await api.del(`/api/exams/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o exame");
      }
    },
    [list, all],
  );

  const complete = useCallback(
    async (id: string, opts: { needsReturn: boolean; followUpMonths?: number }) => {
      const prev = list.data;
      list.setData({
        exams: all.map((e) => (e.id === id ? { ...e, status: "completed" as const } : e)),
      });
      try {
        await api.post(`/api/exams/${id}/complete`, opts);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível concluir o exame");
      }
    },
    [list, all],
  );

  return {
    ativos,
    historico,
    loading: list.loading,
    create,
    update,
    remove,
    complete,
  };
}
