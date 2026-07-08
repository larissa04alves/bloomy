"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { IntakeSlot, Medication } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRemedios() {
  const { data, loading, reload, setData } = useResource<{
    intakes: IntakeSlot[];
  }>(useCallback(() => api.get<{ intakes: IntakeSlot[] }>("/api/intakes"), []));

  const intakes = data?.intakes ?? [];

  const toggle = useCallback(
    async (slot: IntakeSlot) => {
      const prev = data;
      const next = intakes.map((s) =>
        s.medicationId === slot.medicationId && s.time === slot.time
          ? { ...s, taken: !s.taken }
          : s,
      );
      setData({ intakes: next });
      try {
        if (slot.taken) {
          await api.del(
            `/api/intakes?medicationId=${encodeURIComponent(slot.medicationId)}&time=${encodeURIComponent(slot.time)}`,
          );
        } else {
          await api.post("/api/intakes", {
            medicationId: slot.medicationId,
            time: slot.time,
          });
        }
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível atualizar o remédio");
      }
    },
    [data, intakes, setData, reload],
  );

  const addMedication = useCallback(
    async (input: {
      name: string;
      dose?: string;
      stock?: number;
      times: string[];
    }) => {
      const prev = data;
      const newSlots: IntakeSlot[] = input.times.map((time) => ({
        medicationId: `tmp-${crypto.randomUUID()}`,
        name: input.name,
        dose: input.dose ?? null,
        time,
        taken: false,
      }));
      const next = [...intakes, ...newSlots].sort(
        (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
      );
      setData({ intakes: next }); // otimista
      try {
        await api.post<{ medication: Medication }>("/api/medications", input);
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível cadastrar o remédio");
      }
    },
    [data, intakes, setData, reload],
  );

  const taken = intakes.filter((s) => s.taken).length;

  return {
    intakes,
    taken,
    total: intakes.length,
    loading,
    toggle,
    addMedication,
    reload,
  };
}
