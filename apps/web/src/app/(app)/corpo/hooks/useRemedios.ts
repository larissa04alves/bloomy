"use client";

import { useCallback, useEffect, useRef } from "react";

import { api } from "@/lib/api";
import type { IntakeSlot, IntakesPayload } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRemedios() {
  const { data, loading, reload, setData } = useResource<IntakesPayload>(
    useCallback(() => api.get<IntakesPayload>("/api/intakes"), []),
  );

  // Como na Home: revalida quando a aba volta a ficar visível, cobrindo a virada da meia-noite.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const intakes = data?.intakes ?? [];
  const pill = data?.pill ?? null;

  const toggle = useCallback(
    async (slot: IntakeSlot) => {
      const prev = data;
      const next = intakes.map((s) =>
        s.medicationId === slot.medicationId && s.time === slot.time
          ? { ...s, taken: !s.taken }
          : s,
      );
      setData({ intakes: next, pill });
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
    [data, intakes, pill, setData, reload],
  );

  // POST e DELETE em voo ao mesmo tempo podem chegar fora de ordem: um toque por vez.
  const pillPending = useRef(false);
  const togglePill = useCallback(async () => {
    if (!pill || pillPending.current) return;
    pillPending.current = true;
    const taken = !pill.taken;
    const markPill = (value: boolean) =>
      setData((prev) => (prev?.pill ? { ...prev, pill: { ...prev.pill, taken: value } } : prev));
    markPill(taken);
    try {
      if (taken) await api.post("/api/cycle/pill");
      else await api.del("/api/cycle/pill");
    } catch (e) {
      markPill(!taken);
      toastError(e, "Não foi possível salvar a pílula");
    } finally {
      pillPending.current = false;
    }
  }, [pill, setData]);

  const pillSubtitle = pill ? `${pill.time} · ${pill.label}` : null;
  const taken = intakes.filter((s) => s.taken).length + (pill?.taken ? 1 : 0);
  const total = intakes.length + (pill ? 1 : 0);

  return { intakes, pill, pillSubtitle, taken, total, loading, toggle, togglePill, reload };
}
