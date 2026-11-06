import "server-only";

import type { Db } from "@bloomy/db";
import {
  cycleAnchor,
  cycleDay,
  cycleMethod,
  cyclePillIntake,
  cycleSettings,
  type CycleMethod,
} from "@bloomy/db/schema/cycle";
import { reminder, reminderDelivery } from "@bloomy/db/schema/reminder";
import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import type {
  CycleHistory,
  CycleHistorySection,
  CyclePayload,
  CycleState,
  DayEntry,
  DayRange,
  MethodInput,
  MethodUpdateInput,
} from "@/lib/api-types";
import { activeDaysFor, defaultPauseDays, methodMode, type CycleFlow, type CycleSymptom } from "@/lib/cycle";
import { CYCLE_REMINDER_DEFAULTS } from "@/server/reminders/service";
import { CYCLE_REMINDER_TYPES } from "@/server/reminders/slots";
import { addDays, dayFor, daysBetween } from "@/server/shared/day";
import {
  bleedEvents,
  continuousSummary,
  deducePeriods,
  naturalPrediction,
  pauseStartRange,
  pillPosition,
  pillSequences,
  type DayLog,
  type Period,
  type ScheduledMethod,
} from "./calc";

type AnchorKind = "pause_started" | "pack_extended";

const BLEEDING: CycleFlow[] = ["light", "medium", "heavy"];

function methodRow(method: MethodInput) {
  const empty = {
    pillActiveDays: null,
    pauseEvery: null,
    pauseDays: null,
    pillTime: null,
    sequenceStart: null,
    lastPeriodStart: null,
    usualLength: null,
  };
  switch (method.kind) {
    case "none":
    case "copper_iud":
    case "other":
      return { ...empty, kind: method.kind, lastPeriodStart: method.lastPeriodStart, usualLength: method.usualLength };
    case "hormonal_iud":
    case "implant":
    case "injection":
      return { ...empty, kind: method.kind };
    case "pill":
    case "ring":
    case "patch": {
      const pillActiveDays = method.kind === "pill" ? method.activeDays : null;
      const base = { ...empty, kind: method.kind, pillActiveDays, pillTime: method.kind === "pill" ? method.pillTime : null };
      const { pauseEvery, currentUnitStart, currentUnit } = method;
      if (pauseEvery === undefined) return base;
      if (currentUnitStart === undefined || currentUnit === undefined) {
        throw new Error(`${method.kind} with a pause requires currentUnitStart and currentUnit`);
      }
      return {
        ...base,
        pauseEvery,
        pauseDays: method.pauseDays ?? defaultPauseDays(method.kind),
        sequenceStart: addDays(currentUnitStart, -(currentUnit - 1) * activeDaysFor(method.kind, pillActiveDays)!),
      };
    }
  }
}

const modeOf = (method: CycleMethod) => methodMode(method.kind, method.pauseEvery !== null);

function inputMode(method: MethodUpdateInput) {
  return methodMode(method.kind, method.kind !== "pill" || method.pauseEvery !== undefined);
}

async function currentMethod(db: Db, userId: string): Promise<CycleMethod | null> {
  const [row] = await db
    .select()
    .from(cycleMethod)
    .where(and(eq(cycleMethod.userId, userId), isNull(cycleMethod.endedOn)))
    .limit(1);
  return row ?? null;
}

export async function isCycleEnabled(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabledAt: cycleSettings.enabledAt })
    .from(cycleSettings)
    .where(eq(cycleSettings.userId, userId));
  return row?.enabledAt != null;
}

/** Método atual de quem tem o ciclo ligado; null com o ciclo desligado ou sem método. */
export async function activeCycleMethod(
  db: Db,
  userId: string,
): Promise<{ kind: CycleMethod["kind"]; mode: ReturnType<typeof methodMode> } | null> {
  if (!(await isCycleEnabled(db, userId))) return null;
  const method = await currentMethod(db, userId);
  return method && { kind: method.kind, mode: modeOf(method) };
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function replaceMethod(tx: Tx, userId: string, method: MethodInput, today: string): Promise<void> {
  const values = methodRow(method);
  await tx
    .update(cycleMethod)
    .set({ endedOn: today })
    .where(and(eq(cycleMethod.userId, userId), isNull(cycleMethod.endedOn)));
  await tx.insert(cycleMethod).values({ ...values, userId, startedOn: today });
}

function givenPosition(method: MethodUpdateInput): method is MethodInput {
  switch (method.kind) {
    case "none":
    case "copper_iud":
    case "other":
      return method.lastPeriodStart !== undefined;
    case "pill":
    case "ring":
    case "patch":
      return method.currentUnitStart !== undefined && method.currentUnit !== undefined;
    default:
      return false;
  }
}

function hasPosition(method: MethodUpdateInput): method is MethodInput {
  return inputMode(method) === "continuous" || givenPosition(method);
}

function pauseChanged(current: CycleMethod, method: MethodUpdateInput): boolean {
  if (method.kind !== "pill" && method.kind !== "ring" && method.kind !== "patch") return false;
  if (method.pauseEvery === undefined) return false;
  const pauseDays = method.pauseDays ?? defaultPauseDays(method.kind);
  return method.pauseEvery !== current.pauseEvery || pauseDays !== current.pauseDays;
}

/** Só o que não mexe na posição; a pausa muda a cartela e passa por replaceMethod. */
function configPatch(method: MethodUpdateInput) {
  switch (method.kind) {
    case "none":
    case "copper_iud":
    case "other":
      return { usualLength: method.usualLength };
    case "pill":
      return { pillTime: method.pillTime };
    default:
      return null;
  }
}

// Mesmo tipo (na pílula, mesmos comprimidos ativos e mesma presença de pausa) edita a linha atual:
// um método novo zeraria ciclos, médias e âncoras (filtradas por created_at). Mudar a pausa ou
// mandar a posição é regime novo a partir de hoje.
export async function setMethod(
  db: Db,
  userId: string,
  method: MethodUpdateInput,
  today: string,
): Promise<{ ok: true } | { ok: false; reason: "position_required" }> {
  const current = await currentMethod(db, userId);
  const sameKind =
    current?.kind === method.kind &&
    (method.kind !== "pill" ||
      (current.pillActiveDays === method.activeDays && modeOf(current) === inputMode(method)));
  if (current && sameKind && !givenPosition(method)) {
    if (pauseChanged(current, method)) return { ok: false, reason: "position_required" };
    const patch = configPatch(method);
    if (patch) await db.update(cycleMethod).set(patch).where(eq(cycleMethod.id, current.id));
    return { ok: true };
  }
  if (!hasPosition(method)) return { ok: false, reason: "position_required" };
  await db.transaction((tx) => replaceMethod(tx, userId, method, today));
  return { ok: true };
}

export async function activateCycle(db: Db, userId: string, method: MethodInput, today: string): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await replaceMethod(tx, userId, method, today);
    await tx
      .insert(cycleSettings)
      .values({ userId, enabledAt: now })
      .onConflictDoUpdate({ target: cycleSettings.userId, set: { enabledAt: now, updatedAt: now } });
  });
}

/** Ligar exige um método já configurado; devolve false sem ele. Desligar mantém os dados. */
export async function setCycleEnabled(db: Db, userId: string, enabled: boolean): Promise<boolean> {
  const now = new Date();
  if (enabled && !(await currentMethod(db, userId))) return false;
  await db
    .update(cycleSettings)
    .set({ enabledAt: enabled ? now : null, updatedAt: now })
    .where(eq(cycleSettings.userId, userId));
  return true;
}

export async function setHiddenSymptoms(db: Db, userId: string, ids: CycleSymptom[]): Promise<void> {
  await db
    .update(cycleSettings)
    .set({ hiddenSymptoms: [...new Set(ids)], updatedAt: new Date() })
    .where(eq(cycleSettings.userId, userId));
}

export async function deleteCycleData(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const cycleReminders = await tx
      .select({ id: reminder.id })
      .from(reminder)
      .where(and(eq(reminder.userId, userId), inArray(reminder.type, CYCLE_REMINDER_TYPES)));
    const ids = cycleReminders.map((r) => r.id);
    if (ids.length) await tx.delete(reminderDelivery).where(inArray(reminderDelivery.reminderId, ids));
    for (const d of CYCLE_REMINDER_DEFAULTS) {
      await tx
        .update(reminder)
        .set({ time: d.time, enabled: d.enabled, updatedAt: new Date() })
        .where(and(eq(reminder.userId, userId), eq(reminder.type, d.type)));
    }
    await tx.delete(cycleSettings).where(eq(cycleSettings.userId, userId));
    await tx.delete(cycleMethod).where(eq(cycleMethod.userId, userId));
    await tx.delete(cycleAnchor).where(eq(cycleAnchor.userId, userId));
    await tx.delete(cycleDay).where(eq(cycleDay.userId, userId));
    await tx.delete(cyclePillIntake).where(eq(cyclePillIntake.userId, userId));
  });
}

export async function saveDay(
  db: Db,
  userId: string,
  day: string,
  input: { flow: CycleFlow; symptoms: CycleSymptom[] },
): Promise<{ ok: true; entry: DayEntry } | { ok: false; reason: "future_day" }> {
  if (day > dayFor()) return { ok: false, reason: "future_day" };

  // "Nada" sem sintomas também vira linha: é o que separa "registrou que parou" de
  // "não registrou" (lembrete "Ainda menstruada?").
  const symptoms = [...new Set(input.symptoms)];

  await db
    .insert(cycleDay)
    .values({ userId, day, flow: input.flow, symptoms })
    .onConflictDoUpdate({
      target: [cycleDay.userId, cycleDay.day],
      set: { flow: input.flow, symptoms, updatedAt: new Date() },
    });
  return { ok: true, entry: { day, flow: input.flow, symptoms } };
}

export async function listDays(db: Db, userId: string, from: string, to: string): Promise<DayEntry[]> {
  const rows = await db
    .select({ day: cycleDay.day, flow: cycleDay.flow, symptoms: cycleDay.symptoms })
    .from(cycleDay)
    .where(and(eq(cycleDay.userId, userId), gte(cycleDay.day, from), lte(cycleDay.day, to)))
    .orderBy(asc(cycleDay.day));
  return rows.map((r) => ({ ...r, symptoms: r.symptoms as CycleSymptom[] }));
}

export async function addAnchor(
  db: Db,
  userId: string,
  kind: AnchorKind,
  today: string,
  day: string = today,
): Promise<{ ok: true } | { ok: false; reason: "not_scheduled" | "day_out_of_range" }> {
  const method = await currentMethod(db, userId);
  if (!method || modeOf(method) !== "scheduled") {
    return { ok: false, reason: "not_scheduled" };
  }
  if (kind === "pack_extended") {
    await db.insert(cycleAnchor).values({ userId, day: today, kind });
    return { ok: true };
  }

  const { min, max } = (await scheduledPosition(db, userId, method, today)).pauseStartRange;
  if (day < min || day > max) return { ok: false, reason: "day_out_of_range" };
  // Uma pausa já marcada no intervalo é a mesma pausa: marcar de novo corrige o dia.
  await db.transaction(async (tx) => {
    await tx
      .delete(cycleAnchor)
      .where(
        and(
          eq(cycleAnchor.userId, userId),
          eq(cycleAnchor.kind, "pause_started"),
          gte(cycleAnchor.day, min),
          lte(cycleAnchor.day, today),
          gte(cycleAnchor.createdAt, method.createdAt),
        ),
      );
    await tx.insert(cycleAnchor).values({ userId, day, kind });
  });
  return { ok: true };
}

export async function setPillTaken(
  db: Db,
  userId: string,
  today: string,
  taken: boolean,
): Promise<{ ok: true } | { ok: false; reason: "not_pill" }> {
  const method = await currentMethod(db, userId);
  if (method?.kind !== "pill") return { ok: false, reason: "not_pill" };

  if (taken) {
    await db.insert(cyclePillIntake).values({ userId, day: today }).onConflictDoNothing();
  } else {
    await db
      .delete(cyclePillIntake)
      .where(and(eq(cyclePillIntake.userId, userId), eq(cyclePillIntake.day, today)));
  }
  return { ok: true };
}

const naturalLogsFrom = (method: CycleMethod) =>
  method.lastPeriodStart! < method.startedOn ? method.lastPeriodStart! : method.startedOn;

function naturalPeriods(method: CycleMethod, logs: DayLog[]): { merged: Period[]; periods: Period[] } {
  const lastPeriodStart = method.lastPeriodStart!;
  // O sangramento sintético em lastPeriodStart junta a ela a menstruação que estava em curso na
  // troca; outros blocos entre lastPeriodStart e started_on são do método antigo (ex.: privação).
  const merged = deducePeriods([{ day: lastPeriodStart, flow: "medium" }, ...logs]).filter(
    (p) => !(p.start > lastPeriodStart && p.start < method.startedOn),
  );
  const logged = deducePeriods(logs);
  // Só o dia sintético não diz quanto a menstruação durou.
  const periods = merged.filter((p) => logged.some((l) => l.start <= p.end && l.end >= p.start));
  return { merged, periods };
}

const scheduledOf = (method: CycleMethod): ScheduledMethod => ({
  sequenceStart: method.sequenceStart!,
  activeDays: activeDaysFor(method.kind, method.pillActiveDays)!,
  pauseEvery: method.pauseEvery!,
  pauseDays: method.pauseDays!,
});

async function scheduledPosition(db: Db, userId: string, method: CycleMethod, today: string) {
  // Ordem de gravação dentro do mesmo dia: pillPosition faz sort estável por dia.
  const anchors = await db
    .select({ day: cycleAnchor.day, kind: cycleAnchor.kind })
    .from(cycleAnchor)
    .where(and(eq(cycleAnchor.userId, userId), gte(cycleAnchor.createdAt, method.createdAt)))
    .orderBy(asc(cycleAnchor.day), asc(cycleAnchor.id));
  const position = pillPosition(scheduledOf(method), anchors, today);
  return { ...position, pauseStartRange: pauseStartRange(position, today, method.sequenceStart!) };
}

export async function getCycleState(db: Db, userId: string, today: string): Promise<CycleState | null> {
  const [settings] = await db.select().from(cycleSettings).where(eq(cycleSettings.userId, userId));
  if (!settings?.enabledAt) return null;

  const methods = await db
    .select()
    .from(cycleMethod)
    .where(eq(cycleMethod.userId, userId))
    .orderBy(asc(cycleMethod.startedOn), asc(cycleMethod.createdAt));
  const method = methods.find((m) => m.endedOn === null);
  if (!method) return null;

  const logsFrom = async (from: string) =>
    (await listDays(db, userId, from, today)).map(({ day, flow }) => ({ day, flow }));
  const yesterdayDay = addDays(today, -1);
  const recent = await listDays(db, userId, yesterdayDay, today);
  const entryOn = (day: string) => {
    const row = recent.find((r) => r.day === day);
    return { flow: row?.flow ?? null, symptoms: row?.symptoms ?? [] };
  };
  const mode = modeOf(method);

  let natural: CycleState["natural"];
  let scheduled: CycleState["scheduled"];
  let continuous: CycleState["continuous"];

  if (mode === "natural") {
    const { merged, periods } = naturalPeriods(method, await logsFrom(naturalLogsFrom(method)));
    natural = naturalPrediction({
      starts: merged.map((p) => p.start),
      usualLength: method.usualLength!,
      today,
      periods,
    });
  } else if (mode === "scheduled") {
    scheduled = await scheduledPosition(db, userId, method, today);
  } else {
    continuous = continuousSummary(await logsFrom(method.startedOn), today);
  }

  let pill: CycleState["pill"] = null;
  if (method.kind === "pill") {
    const active = scheduled?.phase === "active";
    const from = active ? addDays(today, -(scheduled!.pill - 1)) : today;
    const days = (
      await db
        .select({ day: cyclePillIntake.day })
        .from(cyclePillIntake)
        .where(and(eq(cyclePillIntake.userId, userId), gte(cyclePillIntake.day, from), lte(cyclePillIntake.day, today)))
        .orderBy(asc(cyclePillIntake.day))
    ).map((r) => r.day);
    pill = {
      due: mode === "continuous" || active,
      taken: days.includes(today),
      time: method.pillTime ?? "",
      takenDays: active ? days : [],
    };
  }

  return {
    enabled: true,
    method: {
      kind: method.kind,
      activeDays: method.pillActiveDays,
      pillTime: method.pillTime,
      startedOn: method.startedOn,
      pauseEvery: method.pauseEvery,
      pauseDays: method.pauseDays,
      usualLength: method.usualLength,
      lastPeriodStart: method.lastPeriodStart,
    },
    mode,
    ...(natural && { natural }),
    ...(scheduled && { scheduled }),
    ...(continuous && { continuous }),
    today: entryOn(today),
    yesterday: entryOn(yesterdayDay),
    pill,
    hiddenSymptoms: settings.hiddenSymptoms as CycleSymptom[],
    methodHistory: methods.map((m) => ({ kind: m.kind, startedOn: m.startedOn, endedOn: m.endedOn })),
  };
}

/** `configured` separa quem nunca ativou de quem desativou: só este vê "Apagar dados do ciclo". */
export async function getCyclePayload(
  db: Db,
  userId: string,
  today: string,
): Promise<CyclePayload> {
  const [settings] = await db
    .select({ userId: cycleSettings.userId })
    .from(cycleSettings)
    .where(eq(cycleSettings.userId, userId));
  const configured = Boolean(settings) || (await currentMethod(db, userId)) !== null;
  return { cycle: await getCycleState(db, userId, today), configured };
}

// A troca grava ended_on = started_on do método novo: o dia da troca já é do método novo.
export async function getCycleHistory(db: Db, userId: string, today: string): Promise<CycleHistory> {
  const allMethods = await db
    .select()
    .from(cycleMethod)
    .where(eq(cycleMethod.userId, userId))
    .orderBy(asc(cycleMethod.startedOn), asc(cycleMethod.createdAt));
  const methods = allMethods.filter((m) => m.endedOn !== m.startedOn);
  if (!methods.length) return { sections: [] };

  const from = methods
    .map((m) => (m.lastPeriodStart && m.lastPeriodStart < m.startedOn ? m.lastPeriodStart : m.startedOn))
    .sort()[0];
  const logs = (await listDays(db, userId, from, today)).map(({ day, flow }) => ({ day, flow }));
  const anchors = await db
    .select({ day: cycleAnchor.day, kind: cycleAnchor.kind, createdAt: cycleAnchor.createdAt })
    .from(cycleAnchor)
    .where(eq(cycleAnchor.userId, userId))
    .orderBy(asc(cycleAnchor.day), asc(cycleAnchor.id));

  const sections = methods.map((method): CycleHistorySection => {
    const current = method.endedOn === null;
    const until = current ? today : addDays(method.endedOn!, -1);
    const head = { kind: method.kind, startedOn: method.startedOn, endedOn: method.endedOn };
    const lastStatus = current ? ("current" as const) : ("cut" as const);
    const mode = modeOf(method);

    if (mode === "natural") {
      const own = logs.filter((l) => l.day >= naturalLogsFrom(method) && l.day <= until);
      const { merged, periods } = naturalPeriods(method, own);
      const starts = merged.map((p) => p.start);
      const cycles = starts.map((start, j) => {
        const next = starts[j + 1];
        const period = periods.find((p) => p.start === start);
        const end = next ? addDays(next, -1) : until;
        return {
          start,
          end,
          length: daysBetween(start, end) + 1,
          periodDays: period ? daysBetween(period.start, period.end) + 1 : null,
          status: next ? ("done" as const) : lastStatus,
        };
      });
      return { ...head, mode, cycles: cycles.reverse() };
    }

    if (mode === "scheduled") {
      // O sucessor vem da lista completa: âncoras de um método de duração zero são dele.
      const createdUntil = allMethods[allMethods.indexOf(method) + 1]?.createdAt;
      const own = anchors.filter((a) => a.createdAt >= method.createdAt && (!createdUntil || a.createdAt < createdUntil));
      const seqs = pillSequences(scheduledOf(method), own, until);
      const sequences = seqs.map((seq, j) => {
        const pause =
          !current && seq.pause.from <= until && seq.pause.to > until ? { ...seq.pause, to: until } : seq.pause;
        const bled = logs.filter((l) => BLEEDING.includes(l.flow) && l.day >= pause.from && l.day <= pause.to && l.day <= until);
        const bleed: DayRange | null = bled.length ? { from: bled[0].day, to: bled.at(-1)!.day } : null;
        const last = j === seqs.length - 1;
        const status = current
          ? last
            ? ("current" as const)
            : ("done" as const)
          : last && seq.pause.from >= method.endedOn!
            ? ("cut" as const)
            : ("done" as const);
        return { start: seq.start, pause, bleed, status };
      });
      return { ...head, mode, sequences: sequences.reverse() };
    }

    const own = logs.filter((l) => l.day >= method.startedOn && l.day <= until);
    return { ...head, mode, events: bleedEvents(own).map((p) => ({ from: p.start, to: p.end })).reverse() };
  });

  return { sections: sections.reverse() };
}

export async function getPillToday(
  db: Db,
  userId: string,
  day: string,
): Promise<{ time: string; taken: boolean; label: string } | null> {
  return pillTodayFrom(await getCycleState(db, userId, day));
}

export function pillTodayFrom(
  state: CycleState | null,
): { time: string; taken: boolean; label: string } | null {
  if (!state?.pill?.due) return null;

  const activeDays = activeDaysFor(state.method.kind, state.method.activeDays);
  const label =
    state.scheduled && activeDays !== null
      ? `comprimido ${state.scheduled.pill} de ${activeDays}`
      : "pílula contínua";
  return { time: state.pill.time, taken: state.pill.taken, label };
}
