"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { CycleAnchorBody, CycleDayBody, CycleState, DayEntry } from "@/lib/api-types";
import { activeDaysFor, ATIVAR_HREF, type CycleFlow, type CycleSymptom } from "@/lib/cycle";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";
import { dayFor } from "@/server/shared/day";

import {
  calendarHint,
  continuousLabel,
  extendEffect,
  lateLabel,
  nextPauseLabel,
  pauseDots,
  pauseLabel,
  pillDots,
  pillLabel,
  ringStops,
  showExtend,
  startPauseEffect,
  summaryLabel,
  todayEntry,
  type PillDot,
  windowLabel,
} from "./format";

export const AJUSTES_HREF: Route = "/perfil#ciclo";

export type { PillDot };

export type CicloCard =
  | {
      kind: "active";
      title: string;
      detail: string;
      dots: PillDot[] | null;
      units: number[];
      nextPause: string;
    }
  | { kind: "pause"; title: string; detail: string; dots: PillDot[] }
  | {
      kind: "natural";
      cycleDay: number;
      ring: { period: number; from: number; to: number };
      window: string;
      late: string | null;
    }
  | { kind: "continuous"; title: string; detail: string; note: string };

export type RegistroInitial = { flow: CycleFlow | null; symptoms: CycleSymptom[] };

export type AnchorKind = CycleAnchorBody["kind"];

const BLEEDING: CycleFlow[] = ["light", "medium", "heavy"];

function buildCard(cycle: CycleState, today: string): CicloCard {
  const { kind, activeDays: pillActiveDays } = cycle.method;
  const s = cycle.scheduled;
  if (s) {
    if (s.phase === "pause") {
      const length = Math.max(1, cycle.method.pauseDays ?? 1);
      return { kind: "pause", ...pauseLabel(s, kind), dots: pauseDots(length, s.pauseDay ?? 1) };
    }
    const activeDays = activeDaysFor(kind, pillActiveDays) ?? 21;
    return {
      kind: "active",
      ...pillLabel(s, kind, activeDays),
      dots:
        kind === "pill"
          ? pillDots({
              length: activeDays,
              current: s.pill,
              today,
              startedOn: cycle.method.startedOn,
              takenDays: cycle.pill?.takenDays ?? [],
              takenToday: cycle.pill?.taken ?? false,
            })
          : null,
      units: Array.from({ length: s.units }, (_, i) =>
        i < s.unit - 1 ? 1 : i === s.unit - 1 ? s.pill / activeDays : 0,
      ),
      nextPause: nextPauseLabel(s, today),
    };
  }
  if (cycle.natural) {
    const n = cycle.natural;
    return {
      kind: "natural",
      cycleDay: n.cycleDay,
      ring: ringStops(n, today),
      window: windowLabel(n.window),
      late: n.lateDays > 0 ? lateLabel(n.lateDays) : null,
    };
  }
  return { kind: "continuous", ...continuousLabel(cycle) };
}

function buildAnchors(cycle: CycleState, today: string) {
  const s = cycle.scheduled;
  if (!s) return null;
  const { kind, activeDays, pauseDays } = cycle.method;
  const extendLabel = kind === "pill" ? "Emendar mais uma cartela" : "Emendar mais 3 semanas";
  const confirm: Record<AnchorKind, { title: string; detail: string; action: string }> = {
    pause_started: {
      title: "A pausa começou hoje?",
      detail: startPauseEffect(today, pauseDays ?? 0, kind),
      action: "Comecei a pausa hoje",
    },
    pack_extended: {
      title: `${extendLabel}?`,
      detail: extendEffect(s, today, activeDaysFor(kind, activeDays) ?? 21),
      action: extendLabel,
    },
  };
  return {
    canStartPause: s.phase !== "pause",
    canExtend: showExtend(s, today),
    confirm,
  };
}

function buildView(cycle: CycleState, today: string) {
  const s = cycle.scheduled;
  const { flow } = cycle.today;
  const pillDetail = [cycle.pill?.time, s?.phase === "active" && cycle.method.kind === "pill" && `comprimido ${s.pill}`]
    .filter(Boolean)
    .join(" · ");

  return {
    subtitle: summaryLabel(cycle),
    card: buildCard(cycle, today),
    pill: cycle.pill ? { due: cycle.pill.due, taken: cycle.pill.taken, detail: pillDetail } : null,
    anchors: buildAnchors(cycle, today),
    primary:
      cycle.mode === "natural"
        ? flow && BLEEDING.includes(flow)
          ? null
          : ("period" as const)
        : cycle.mode === "continuous"
          ? ("bleeding" as const)
          : null,
    todayEntry: todayEntry(cycle.today),
    todayEmptyLabel:
      cycle.mode === "scheduled"
        ? "Registrar sangramento ou sintoma"
        : cycle.mode === "natural"
          ? "Registrar sintoma ou escape"
          : "Registrar sintoma",
    calendarHint: calendarHint(cycle),
  };
}

export type CicloView = ReturnType<typeof buildView>;

function saveErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 422) return "Esse dia ainda não chegou";
  return "Não foi possível salvar o registro";
}

export function useCiclo() {
  const router = useRouter();
  const today = dayFor();
  const { data, error, reload, setData } = useResource<{ cycle: CycleState | null }>(
    useCallback(() => api.get<{ cycle: CycleState | null }>("/api/cycle"), []),
  );
  const cycle = data?.cycle ?? null;
  const inactive = data !== null && data.cycle === null;

  useEffect(() => {
    if (inactive) router.replace(ATIVAR_HREF);
  }, [inactive, router]);

  const view = useMemo(() => (cycle ? buildView(cycle, today) : null), [cycle, today]);

  const [registro, setRegistro] = useState<{ open: boolean; day: string; initial: RegistroInitial }>({
    open: false,
    day: today,
    initial: { flow: null, symptoms: [] },
  });
  const [busy, setBusy] = useState(false);

  const openRegistro = useCallback(
    (day: string = today, initial?: Partial<RegistroInitial>) => {
      const base: RegistroInitial =
        day === today && cycle ? { ...cycle.today } : { flow: null, symptoms: [] };
      setRegistro({ open: true, day, initial: { ...base, ...initial } });
    },
    [cycle, today],
  );

  const openPeriodToday = useCallback(() => openRegistro(today, { flow: "medium" }), [openRegistro, today]);

  const setRegistroOpen = useCallback((open: boolean) => setRegistro((r) => ({ ...r, open })), []);

  const saveDay = useCallback(
    async (day: string, entry: CycleDayBody): Promise<boolean> => {
      let saved: DayEntry;
      try {
        ({ entry: saved } = await api.put<{ entry: DayEntry }>(`/api/cycle/days/${day}`, entry));
      } catch (e) {
        toastError(e, saveErrorMessage(e));
        return false;
      }
      // O card de hoje não pode depender do reload: um toggle da pílula em voo o invalida.
      if (day === today) {
        setData((prev) =>
          prev?.cycle
            ? { cycle: { ...prev.cycle, today: { flow: saved.flow, symptoms: saved.symptoms } } }
            : prev,
        );
      }
      // Sangramento muda previsão e contagem: o resto do estado vem de novo do servidor.
      reload();
      return true;
    },
    [reload, setData, today],
  );

  const setHiddenSymptoms = useCallback(
    async (ids: CycleSymptom[]): Promise<boolean> => {
      try {
        setData(await api.patch<{ cycle: CycleState | null }>("/api/cycle/settings", { hiddenSymptoms: ids }));
        return true;
      } catch (e) {
        toastError(e, "Não foi possível salvar a lista");
        return false;
      }
    },
    [setData],
  );

  const togglePill = useCallback(async () => {
    if (!cycle?.pill) return;
    const taken = !cycle.pill.taken;
    const markPill = (value: boolean) =>
      setData((prev) =>
        prev?.cycle?.pill ? { cycle: { ...prev.cycle, pill: { ...prev.cycle.pill, taken: value } } } : prev,
      );
    markPill(taken);
    try {
      setData(
        taken
          ? await api.post<{ cycle: CycleState | null }>("/api/cycle/pill")
          : await api.del<{ cycle: CycleState | null }>("/api/cycle/pill"),
      );
    } catch (e) {
      markPill(!taken);
      toastError(e, "Não foi possível atualizar a pílula");
    }
  }, [cycle, setData]);

  const addAnchor = useCallback(
    async (kind: AnchorKind): Promise<boolean> => {
      setBusy(true);
      try {
        setData(await api.post<{ cycle: CycleState | null }>("/api/cycle/anchors", { kind }));
        return true;
      } catch (e) {
        toastError(e, "Não foi possível ajustar a cartela");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [setData],
  );
  const startPause = useCallback(() => addAnchor("pause_started"), [addAnchor]);
  const extendPack = useCallback(() => addAnchor("pack_extended"), [addAnchor]);

  // Âncora não tem desfazer: toda gravação passa por confirmação.
  const [anchorConfirm, setAnchorConfirm] = useState<{ open: boolean; kind: AnchorKind }>({
    open: false,
    kind: "pause_started",
  });
  const askAnchor = useCallback((kind: AnchorKind) => setAnchorConfirm({ open: true, kind }), []);
  const setAnchorConfirmOpen = useCallback(
    (open: boolean) => setAnchorConfirm((c) => ({ ...c, open })),
    [],
  );
  const confirmAnchor = useCallback(async () => {
    if (await addAnchor(anchorConfirm.kind)) setAnchorConfirmOpen(false);
  }, [addAnchor, anchorConfirm.kind, setAnchorConfirmOpen]);

  return {
    ready: view !== null,
    error: cycle ? null : error,
    reload,
    cycle,
    view,
    today,
    busy,
    registro,
    openRegistro,
    openPeriodToday,
    setRegistroOpen,
    saveDay,
    setHiddenSymptoms,
    togglePill,
    startPause,
    extendPack,
    anchorConfirm,
    askAnchor,
    setAnchorConfirmOpen,
    confirmAnchor,
  };
}
