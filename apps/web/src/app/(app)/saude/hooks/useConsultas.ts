"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import type { Appointment, AppointmentInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { byCompletedDesc, sortByWhen } from "./format";

type ListResponse = { appointments: Appointment[] };
type NextResponse = { appointment: Appointment | null };

export function useConsultas() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/appointments"), []),
  );
  const next = useResource<NextResponse>(
    useCallback(() => api.get<NextResponse>("/api/appointments/next"), []),
  );

  const all = list.data?.appointments ?? [];
  const ativas = sortByWhen(all.filter((a) => a.status !== "completed"));
  const historico = byCompletedDesc(
    all.filter((a) => a.status === "completed"),
  );
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (input: AppointmentInput) => {
      setCreating(true);
      try {
        await api.post("/api/appointments", input);
        const data = await api.get<ListResponse>("/api/appointments");
        list.setData(data);
        next.reload();
      } catch (e) {
        toastError(e, "Não foi possível agendar a consulta");
      } finally {
        setCreating(false);
      }
    },
    [list, next],
  );

  const update = useCallback(
    async (id: string, input: AppointmentInput) => {
      const prev = list.data;
      // Otimista: reflete os campos editados; reload confirma (status pode mudar no back).
      if (list.data) {
        list.setData({
          appointments: all.map((a) => (a.id === id ? { ...a, ...input } : a)),
        });
      }
      try {
        await api.put(`/api/appointments/${id}`, input);
        list.reload();
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar a consulta");
      }
    },
    [list, next, all],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ appointments: all.filter((a) => a.id !== id) });
      try {
        await api.del(`/api/appointments/${id}`);
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir a consulta");
      }
    },
    [list, next, all],
  );

  const complete = useCallback(
    async (
      id: string,
      opts: { needsReturn: boolean; followUpMonths?: number },
    ) => {
      const prev = list.data;
      const done = all.find((a) => a.id === id);
      const nowIso = new Date().toISOString();
      const optimistic = all.map((a) =>
        a.id === id
          ? { ...a, status: "completed" as const, completedAt: nowIso }
          : a,
      );
      // Retorno otimista: o item `to_schedule` é 100% derivável do concluído
      // (id/timestamps reais chegam no reload e reconciliam o temporário).
      if (opts.needsReturn && done) {
        const suggested = new Date();
        suggested.setMonth(suggested.getMonth() + (opts.followUpMonths ?? 1));
        optimistic.push({
          id: `temp-${crypto.randomUUID()}`,
          professional: done.professional,
          specialty: done.specialty,
          status: "to_schedule",
          scheduledAt: null,
          suggestedAt: suggested.toISOString(),
          completedAt: null,
          location: null,
          remindDayBefore: false,
          parentId: done.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      list.setData({ appointments: optimistic });
      try {
        await api.post(`/api/appointments/${id}/complete`, opts);
        list.reload();
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível concluir a consulta");
      }
    },
    [list, next, all],
  );

  return {
    ativas,
    historico,
    proxima: next.data?.appointment ?? null,
    loading: list.loading,
    creating,
    create,
    update,
    remove,
    complete,
  };
}
