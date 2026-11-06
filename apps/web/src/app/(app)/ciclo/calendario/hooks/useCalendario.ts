"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { CycleDayBody, CycleHistory, CycleState, DayEntry } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

import { useCiclo } from "../../hooks/useCiclo";
import { type GridCell, historyItems, monthBounds, monthGrid, monthLabel, shiftMonth } from "./format";

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];
const TIP_KEY = "bloomy.cycle.calendarTipDismissed";

function readTipDismissed(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTipDismissed() {
  try {
    localStorage.setItem(TIP_KEY, "1");
  } catch {}
}

export type LegendItem = "period" | "predicted" | "spotting" | "symptom";

function legendFor(cycle: CycleState): { id: LegendItem; label: string }[] {
  const bleed = cycle.mode === "natural" ? "menstruação" : "sangramento";
  return [
    { id: "period" as const, label: bleed },
    ...(cycle.mode === "continuous"
      ? []
      : [{ id: "predicted" as const, label: cycle.mode === "natural" ? "prevista" : "pausa prevista" }]),
    { id: "spotting" as const, label: "escape" },
    { id: "symptom" as const, label: "sintoma" },
  ];
}

export function useCalendario() {
  const c = useCiclo();
  const { cycle, today } = c;
  const [month, setMonth] = useState(today.slice(0, 7));
  const [loaded, setLoaded] = useState<{ month: string; days: DayEntry[] } | null>(null);
  const [monthError, setMonthError] = useState<{ month: string; error: Error } | null>(null);
  const [monthAttempt, setMonthAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    const { from, to } = monthBounds(month);
    api
      .get<{ days: DayEntry[] }>(`/api/cycle/days?from=${from}&to=${to}`)
      .then(({ days }) => {
        if (stale) return;
        setLoaded({ month, days });
        setMonthError(null);
      })
      .catch((e: Error) => {
        if (!stale) setMonthError({ month, error: e });
      });
    return () => {
      stale = true;
    };
  }, [month, monthAttempt]);

  const history = useResource<CycleHistory>(
    useCallback(() => api.get<CycleHistory>("/api/cycle/history"), []),
  );

  const monthReady = loaded?.month === month;
  const days = useMemo(() => (loaded?.month === month ? loaded.days : []), [loaded, month]);
  const predicted = cycle?.natural?.window ?? cycle?.scheduled?.nextPause ?? null;
  const grid = useMemo(() => monthGrid(month, days, predicted, today), [month, days, predicted, today]);

  // Começa escondida e lê o storage depois de montar para o HTML do servidor e do cliente baterem.
  const [tipVisible, setTipVisible] = useState(false);
  useEffect(() => {
    setTipVisible(!readTipDismissed());
  }, []);
  const dismissTip = useCallback(() => {
    setTipVisible(false);
    writeTipDismissed();
  }, []);

  const { openRegistro } = c;
  const openDay = useCallback(
    (cell: NonNullable<GridCell>) => {
      // Sem o mês carregado o sheet abriria vazio e o upsert apagaria o que o dia já tem.
      if (cell.future || !monthReady) return;
      const entry = days.find((d) => d.day === cell.day);
      openRegistro(cell.day, entry ? { flow: entry.flow, symptoms: entry.symptoms } : undefined);
      dismissTip();
    },
    [openRegistro, days, monthReady, dismissTip],
  );

  const { saveDay: saveCycleDay } = c;
  const { reload: reloadHistory } = history;
  const saveDay = useCallback(
    async (day: string, entry: CycleDayBody): Promise<boolean> => {
      if (!(await saveCycleDay(day, entry))) return false;
      setLoaded((prev) =>
        prev && prev.month === day.slice(0, 7)
          ? { ...prev, days: [...prev.days.filter((d) => d.day !== day), { day, ...entry }] }
          : prev,
      );
      // Um GET do mês em voo foi lido antes do salvamento: refazê-lo descarta a resposta antiga.
      setMonthAttempt((n) => n + 1);
      reloadHistory();
      return true;
    },
    [saveCycleDay, reloadHistory],
  );

  const averages =
    cycle?.natural
      ? {
          cycle: String(cycle.natural.avgLength),
          period: cycle.natural.avgPeriodLength === null ? "—" : String(cycle.natural.avgPeriodLength),
        }
      : null;

  return {
    ready: c.ready,
    error: c.error,
    reload: c.reload,
    cycle,
    month: monthLabel(month),
    prevMonth: () => setMonth((m) => shiftMonth(m, -1)),
    nextMonth: () => setMonth((m) => shiftMonth(m, 1)),
    weekdays: WEEKDAY_INITIALS,
    grid,
    monthReady,
    monthError: monthError?.month === month && !monthReady ? monthError.error : null,
    retryMonth: () => setMonthAttempt((n) => n + 1),
    legend: cycle ? legendFor(cycle) : [],
    openDay,
    natural: cycle?.mode === "natural",
    tipVisible,
    dismissTip,
    averages,
    history: history.data ? historyItems(history.data, today) : null,
    historyError: history.data ? null : history.error,
    reloadHistory,
    registro: c.registro,
    setRegistroOpen: c.setRegistroOpen,
    saveDay,
    setHiddenSymptoms: c.setHiddenSymptoms,
  };
}
