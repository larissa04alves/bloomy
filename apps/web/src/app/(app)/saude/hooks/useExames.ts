"use client";

import { useCallback, useState } from "react";

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
  const historico = byCompletedDesc(
    all.filter((e) => e.status === "completed"),
  );
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (input: ExamInput) => {
      setCreating(true);
      try {
        await api.post("/api/exams", input);
        const data = await api.get<ListResponse>("/api/exams");
        list.setData(data);
      } catch (e) {
        toastError(e, "Não foi possível adicionar o exame");
      } finally {
        setCreating(false);
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: ExamInput) => {
      const prev = list.data;
      if (list.data) {
        list.setData({
          exams: all.map((e) => (e.id === id ? { ...e, ...input } : e)),
        });
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
    async (
      id: string,
      opts: { needsReturn: boolean; followUpMonths?: number },
    ) => {
      const prev = list.data;
      const done = all.find((e) => e.id === id);
      const nowIso = new Date().toISOString();
      const optimistic = all.map((e) =>
        e.id === id
          ? { ...e, status: "completed" as const, completedAt: nowIso }
          : e,
      );
      // Retorno otimista: o item `to_schedule` é derivável do concluído
      // (id/timestamps reais chegam no reload e reconciliam o temporário).
      if (opts.needsReturn && done) {
        const suggested = new Date();
        suggested.setMonth(suggested.getMonth() + (opts.followUpMonths ?? 1));
        optimistic.push({
          id: `temp-${crypto.randomUUID()}`,
          name: done.name,
          status: "to_schedule",
          scheduledAt: null,
          suggestedAt: suggested.toISOString(),
          completedAt: null,
          parentId: done.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      list.setData({ exams: optimistic });
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
    creating,
    create,
    update,
    remove,
    complete,
  };
}
