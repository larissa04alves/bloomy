import type { CycleFlow } from "@/lib/cycle";
import { addDays, daysBetween } from "@/server/shared/day";

export type DayLog = { day: string; flow: CycleFlow };
export type Period = { start: string; end: string };

const MAX_CYCLES = 6;

function isBleeding(flow: CycleFlow): boolean {
  return flow === "light" || flow === "medium" || flow === "heavy";
}

// Dias separados por no máximo 1 dia de fora (sem registro ou registrado sem sangramento) formam o mesmo bloco.
function groupDays(days: string[]): Period[] {
  const sorted = [...new Set(days)].sort();
  const groups: Period[] = [];
  for (const day of sorted) {
    const last = groups.at(-1);
    if (last && daysBetween(last.end, day) <= 2) last.end = day;
    else groups.push({ start: day, end: day });
  }
  return groups;
}

export function deducePeriods(days: DayLog[]): Period[] {
  return groupDays(days.filter((d) => isBleeding(d.flow)).map((d) => d.day));
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function naturalPrediction(input: {
  starts: string[];
  usualLength: number;
  today: string;
  periods?: Period[];
}): {
  cycleDay: number;
  avgLength: number;
  avgPeriodLength: number | null;
  window: { from: string; to: string };
  lateDays: number;
} {
  const starts = [...new Set(input.starts)].sort();
  const lastStart = starts.at(-1);
  if (!lastStart) throw new Error("naturalPrediction requires at least one start");

  const cycles = starts.slice(1).map((s, i) => daysBetween(starts[i], s)).slice(-MAX_CYCLES);

  let avgLength = input.usualLength;
  let margin = 2;
  if (cycles.length >= 2) {
    const avg = mean(cycles);
    const sd = Math.sqrt(mean(cycles.map((c) => (c - avg) ** 2)));
    avgLength = Math.round(avg);
    margin = Math.min(4, Math.max(1, Math.round(sd)));
  }

  const center = addDays(lastStart, avgLength);
  const window = { from: addDays(center, -margin), to: addDays(center, margin) };

  const periods = (input.periods ?? [])
    .filter((p) => p.start >= starts[0])
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(-MAX_CYCLES);
  const avgPeriodLength = periods.length
    ? Math.round(mean(periods.map((p) => daysBetween(p.start, p.end) + 1)))
    : null;

  return {
    cycleDay: daysBetween(lastStart, input.today) + 1,
    avgLength,
    avgPeriodLength,
    window,
    lateDays: Math.max(0, daysBetween(window.to, input.today)),
  };
}

export type ScheduledMethod = { sequenceStart: string; activeDays: number; pauseEvery: number; pauseDays: number };
export type Anchor = { day: string; kind: "pause_started" | "pack_extended" };

type Segment = { kind: "unit"; start: string; unit: number } | { kind: "pause"; start: string };

// Uma sequência = unidades + pausa final; uma pausa interrompida por "emendar" vira um
// segmento de pausa no meio, por isso a fase do dia é a do último segmento que começou.
function buildSequence(method: ScheduledMethod, seqStart: string, anchors: Anchor[]) {
  const segments: Segment[] = [];
  for (let i = 0; i < method.pauseEvery; i++) {
    segments.push({ kind: "unit", start: addDays(seqStart, i * method.activeDays), unit: i + 1 });
  }
  let pauseStart = addDays(seqStart, method.pauseEvery * method.activeDays);
  const pauseEnd = () => addDays(pauseStart, method.pauseDays - 1);
  const unitCount = () => segments.filter((s) => s.kind === "unit").length;

  for (const anchor of anchors) {
    if (anchor.day < seqStart) continue;
    if (anchor.day > pauseEnd()) break;
    const d = anchor.day;
    if (anchor.kind === "pause_started") {
      while (segments.length > 1 && segments.at(-1)!.start >= d) segments.pop();
      // Só sobra pausa no fim quando "emendar" durante a pausa e "comecei a pausa" caem no mesmo
      // dia: a emenda é desfeita e a pausa interrompida some (seus dias voltam para a unidade
      // anterior), ficando só a pausa nova em d.
      while (segments.length > 1 && segments.at(-1)!.kind === "pause") segments.pop();
      pauseStart = d;
    } else if (d < pauseStart) {
      segments.push({ kind: "unit", start: pauseStart, unit: unitCount() + 1 });
      pauseStart = addDays(pauseStart, method.activeDays);
    } else {
      segments.push({ kind: "pause", start: pauseStart });
      segments.push({ kind: "unit", start: d, unit: unitCount() + 1 });
      pauseStart = addDays(d, method.activeDays);
    }
  }

  return { segments, pauseStart, pauseEnd: pauseEnd(), units: unitCount() };
}

export function pillPosition(
  method: ScheduledMethod,
  anchors: Anchor[],
  today: string,
): {
  phase: "active" | "pause";
  unit: number;
  units: number;
  pill: number;
  pauseDay: number | null;
  nextPause: { from: string; to: string };
} {
  // A pausa termina em pauseStart + pauseDays − 1 e pauseStart nunca fica antes do início da
  // sequência (âncoras anteriores são ignoradas); com pauseDays ≥ 1 cada sequência dura ao menos
  // 1 dia e o loop abaixo sempre avança. Com 0, "comecei a pausa" no 1º dia repetia a sequência.
  if (method.activeDays < 1 || method.pauseEvery < 1 || method.pauseDays < 1) {
    throw new Error("pillPosition requires activeDays >= 1, pauseEvery >= 1 and pauseDays >= 1");
  }
  const sorted = [...anchors].sort((a, b) => a.day.localeCompare(b.day));
  const day = today < method.sequenceStart ? method.sequenceStart : today;

  let seq = buildSequence(method, method.sequenceStart, sorted);
  while (day > seq.pauseEnd) seq = buildSequence(method, addDays(seq.pauseEnd, 1), sorted);

  const segments: Segment[] = [...seq.segments, { kind: "pause", start: seq.pauseStart }];
  const index = segments.findLastIndex((s) => s.start <= day);
  const current = segments[index];
  const nextPause = { from: seq.pauseStart, to: seq.pauseEnd };

  if (current.kind === "unit") {
    return {
      phase: "active",
      unit: current.unit,
      units: seq.units,
      pill: daysBetween(current.start, day) + 1,
      pauseDay: null,
      nextPause,
    };
  }

  const lastUnit = segments.slice(0, index).findLast((s) => s.kind === "unit");
  return {
    phase: "pause",
    unit: lastUnit?.kind === "unit" ? lastUnit.unit : 1,
    units: seq.units,
    pill: lastUnit ? daysBetween(lastUnit.start, current.start) : 0,
    pauseDay: daysBetween(current.start, day) + 1,
    nextPause,
  };
}

export function pillSequences(
  method: ScheduledMethod,
  anchors: Anchor[],
  until: string,
): { start: string; pause: { from: string; to: string } }[] {
  if (method.activeDays < 1 || method.pauseEvery < 1 || method.pauseDays < 1) {
    throw new Error("pillSequences requires activeDays >= 1, pauseEvery >= 1 and pauseDays >= 1");
  }
  const sorted = [...anchors].sort((a, b) => a.day.localeCompare(b.day));
  const sequences: { start: string; pause: { from: string; to: string } }[] = [];
  let start = method.sequenceStart;
  while (start <= until) {
    const seq = buildSequence(method, start, sorted);
    sequences.push({ start, pause: { from: seq.pauseStart, to: seq.pauseEnd } });
    start = addDays(seq.pauseEnd, 1);
  }
  return sequences;
}

export function bleedEvents(days: DayLog[]): Period[] {
  return groupDays(days.filter((d) => d.flow !== "none").map((d) => d.day));
}

export function continuousSummary(
  days: DayLog[],
  today: string,
): { lastBleed: { day: string; flow: CycleFlow } | null; daysSince: number | null; eventsLast180: number } {
  const bleeds = days.filter((d) => d.flow !== "none" && d.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  const last = bleeds.at(-1);
  const recent = bleeds.filter((d) => daysBetween(d.day, today) < 180).map((d) => d.day);
  return {
    lastBleed: last ? { day: last.day, flow: last.flow } : null,
    daysSince: last ? daysBetween(last.day, today) : null,
    eventsLast180: groupDays(recent).length,
  };
}
