import { afterAll, describe, expect, test } from "bun:test";

import { cycleAnchor, cycleDay, cycleMethod, cyclePillIntake, cycleSettings } from "@bloomy/db/schema/cycle";
import { reminder, reminderDelivery } from "@bloomy/db/schema/reminder";
import { eq } from "drizzle-orm";

import type { CycleFlow } from "@/lib/cycle";
import { addDays, dayFor } from "@/server/shared/day";
import { listReminders } from "@/server/reminders/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  activateCycle,
  addAnchor,
  deleteCycleData,
  getCycleHistory,
  getCyclePayload,
  getCycleState,
  getPillToday,
  isCycleEnabled,
  listDays,
  saveDay,
  setCycleEnabled,
  setHiddenSymptoms,
  setMethod,
  setPillTaken,
} from "./service";

afterAll(cleanupTestDbs);

const PILL = {
  kind: "pill",
  activeDays: 21,
  pauseEvery: 4,
  pillTime: "21:00",
  currentUnitStart: "2026-10-22",
  currentUnit: 3,
} as const;

describe("activateCycle + getCycleState", () => {
  test("natural: dia do ciclo e janela a partir da última menstruação", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2026-10-20", usualLength: 28 }, "2026-11-05");
    const state = await getCycleState(db, userId, "2026-11-05");

    expect(state?.mode).toBe("natural");
    expect(state?.natural?.cycleDay).toBe(17);
    expect(state?.natural?.window).toEqual({ from: "2026-11-15", to: "2026-11-19" });
    expect(state?.pill).toBeNull();
    expect(state?.today).toEqual({ flow: null, symptoms: [] });
    expect(state?.methodHistory).toEqual([{ kind: "none", startedOn: "2026-11-05", endedOn: null }]);
  });

  test("pílula 21 na 3ª cartela desde 22/10 → pílula 15 em 05/11, pausa default 7", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await activateCycle(db, userId, PILL, "2026-11-05");
    const state = await getCycleState(db, userId, "2026-11-05");

    expect(state?.mode).toBe("scheduled");
    expect(state?.scheduled).toMatchObject({ phase: "active", unit: 3, pill: 15 });
    expect(state?.method).toEqual({
      kind: "pill",
      activeDays: 21,
      pillTime: "21:00",
      startedOn: "2026-11-05",
      pauseEvery: 4,
      pauseDays: 7,
      usualLength: null,
      lastPeriodStart: null,
    });
    expect(state?.pill).toEqual({ due: true, taken: false, time: "21:00", takenDays: [] });
  });

  test("pill.due falso na pausa; âncora 'comecei a pausa' reancora", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");

    // Sequência começou em 10/09: 4×21 dias → pausa de 03/12 a 09/12.
    const inPause = await getCycleState(db, userId, "2026-12-05");
    expect(inPause?.scheduled?.phase).toBe("pause");
    expect(inPause?.pill?.due).toBe(false);

    expect(await addAnchor(db, userId, "pause_started", "2026-11-06")).toEqual({ ok: true });
    const anchored = await getCycleState(db, userId, "2026-11-06");
    expect(anchored?.scheduled?.phase).toBe("pause");
    expect(anchored?.pill?.due).toBe(false);
  });

  test("pílula sem pausa é contínua e sempre devida", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "pill", activeDays: 28, pillTime: "08:00" }, "2026-11-05");

    const state = await getCycleState(db, userId, "2026-11-05");
    expect(state?.mode).toBe("continuous");
    expect(state?.continuous).toEqual({ lastBleed: null, daysSince: null, eventsLast180: 0 });
    expect(state?.pill).toEqual({ due: true, taken: false, time: "08:00", takenDays: [] });
    expect(state?.method).toMatchObject({ activeDays: 28, pauseEvery: null, pauseDays: null });
  });

  test("pílula de 31 ativos, pausa a cada 4: comprimido 5 de 31 e pausa de 05/03 a 11/03", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(
      db,
      userId,
      { kind: "pill", activeDays: 31, pauseEvery: 4, pauseDays: 7, pillTime: "22:00", currentUnitStart: "2026-11-01", currentUnit: 1 },
      "2026-11-05",
    );

    const state = await getCycleState(db, userId, "2026-11-05");
    expect(state?.scheduled).toMatchObject({
      phase: "active",
      unit: 1,
      units: 4,
      pill: 5,
      nextPause: { from: "2027-03-05", to: "2027-03-11" },
    });
    expect(await getPillToday(db, userId, "2026-11-05")).toMatchObject({ label: "comprimido 5 de 31" });
    expect((await getCycleState(db, userId, "2027-03-04"))?.scheduled).toMatchObject({ phase: "active", unit: 4, pill: 31 });
    expect((await getCycleState(db, userId, "2027-03-11"))?.scheduled).toMatchObject({ phase: "pause", pauseDay: 7 });
    expect((await getCycleState(db, userId, "2027-03-12"))?.scheduled).toMatchObject({ phase: "active", unit: 1, pill: 1 });
  });

  test("âncora fora de método com cartela → not_scheduled", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "implant" }, "2026-11-05");

    expect(await addAnchor(db, userId, "pause_started", "2026-11-05")).toEqual({
      ok: false,
      reason: "not_scheduled",
    });
  });
});

describe("saveDay", () => {
  test("cria, atualiza, guarda 'none' sem sintomas e recusa dia futuro", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const today = dayFor();

    expect(await saveDay(db, userId, today, { flow: "light", symptoms: ["cramps"] })).toMatchObject({ ok: true });
    await saveDay(db, userId, today, { flow: "heavy", symptoms: ["cramps", "acne", "acne"] });

    let rows = await db.select().from(cycleDay).where(eq(cycleDay.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].flow).toBe("heavy");
    expect(rows[0].symptoms).toEqual(["cramps", "acne"]);

    expect(await saveDay(db, userId, today, { flow: "none", symptoms: [] })).toEqual({
      ok: true,
      entry: { day: today, flow: "none", symptoms: [] },
    });
    rows = await db.select().from(cycleDay).where(eq(cycleDay.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].flow).toBe("none");
    expect(rows[0].symptoms).toEqual([]);

    expect(await saveDay(db, userId, addDays(today, 1), { flow: "light", symptoms: [] })).toEqual({
      ok: false,
      reason: "future_day",
    });
  });

  test("'none' com sintomas mantém a linha e aparece no estado de hoje", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const today = dayFor();
    await activateCycle(db, userId, { kind: "hormonal_iud" }, today);

    await saveDay(db, userId, today, { flow: "none", symptoms: ["headache"] });
    const state = await getCycleState(db, userId, today);
    expect(state?.today).toEqual({ flow: "none", symptoms: ["headache"] });
  });

  test("registrar 'Nada' hoje aparece como flow none no estado", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const today = dayFor();
    await activateCycle(db, userId, { kind: "hormonal_iud" }, today);

    await saveDay(db, userId, today, { flow: "none", symptoms: [] });
    expect((await getCycleState(db, userId, today))?.today).toEqual({ flow: "none", symptoms: [] });
  });

  test("listDays devolve o intervalo em ordem", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await saveDay(db, userId, "2025-03-02", { flow: "medium", symptoms: [] });
    await saveDay(db, userId, "2025-03-01", { flow: "light", symptoms: ["fatigue"] });
    await saveDay(db, userId, "2025-04-01", { flow: "light", symptoms: [] });

    expect(await listDays(db, userId, "2025-03-01", "2025-03-31")).toEqual([
      { day: "2025-03-01", flow: "light", symptoms: ["fatigue"] },
      { day: "2025-03-02", flow: "medium", symptoms: [] },
    ]);
  });
});

describe("setMethod", () => {
  test("fecha o anterior e as médias só usam dias desde lastPeriodStart do novo método", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-05-28", usualLength: 28 }, "2025-06-01");

    // Menstruações do método antigo (5 e 3 dias, ciclos de 28) não podem entrar nas médias.
    for (const day of ["2025-06-10", "2025-06-11", "2025-06-12", "2025-06-13", "2025-06-14"]) {
      await saveDay(db, userId, day, { flow: "heavy", symptoms: [] });
    }
    for (const day of ["2025-07-08", "2025-07-09", "2025-07-10"]) {
      await saveDay(db, userId, day, { flow: "heavy", symptoms: [] });
    }
    await setMethod(db, userId, { kind: "copper_iud", lastPeriodStart: "2025-08-05", usualLength: 30 }, "2025-08-10");
    // De lastPeriodStart em diante tudo é do ciclo atual, mesmo antes da troca.
    for (const day of ["2025-08-05", "2025-08-06", "2025-09-02", "2025-09-03"]) {
      await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
    }

    const state = await getCycleState(db, userId, "2025-09-10");
    expect(state?.method.kind).toBe("copper_iud");
    expect(state?.natural?.cycleDay).toBe(9);
    expect(state?.natural?.avgLength).toBe(30);
    expect(state?.natural?.avgPeriodLength).toBe(2);
    expect(state?.methodHistory).toEqual([
      { kind: "none", startedOn: "2025-06-01", endedOn: "2025-08-10" },
      { kind: "copper_iud", startedOn: "2025-08-10", endedOn: null },
    ]);
  });
});

describe("menstruação que atravessa o started_on", () => {
  test("ativar menstruada e marcar o fluxo de hoje não cria início novo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-03");
    await saveDay(db, userId, "2025-01-03", { flow: "medium", symptoms: [] });

    const state = await getCycleState(db, userId, "2025-01-03");
    expect(state?.natural?.cycleDay).toBe(3);
    expect(state?.natural?.window).toEqual({ from: "2025-01-29", to: "2025-02-02" });
  });

  test("ciclos seguintes contam a partir de lastPeriodStart", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-03");
    for (const day of ["2025-01-03", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-26"]) {
      await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
    }

    // starts 01-01, 01-29, 02-26 → ciclos [28, 28]; com o início falso em 01-03 seriam [26, 28].
    const state = await getCycleState(db, userId, "2025-03-01");
    expect(state?.natural?.avgLength).toBe(28);
    expect(state?.natural?.cycleDay).toBe(4);
  });

  test("sem registrar a menstruação de lastPeriodStart, não inventa duração de 1 dia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-10");
    for (const day of ["2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01"]) {
      await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
    }

    expect((await getCycleState(db, userId, "2025-02-05"))?.natural?.avgPeriodLength).toBe(4);
  });
  test("sangramento do método antigo entre lastPeriodStart e started_on não vira início", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    for (const day of ["2025-05-10", "2025-05-11"]) {
      await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
    }
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-03-01", usualLength: 28 }, "2025-06-01");

    const state = await getCycleState(db, userId, "2025-06-01");
    expect(state?.natural?.cycleDay).toBe(93);
    expect(state?.natural?.avgPeriodLength).toBeNull();
  });
});

describe("âncoras e troca de método", () => {
  test("âncora gravada antes da troca no mesmo dia não vale para o método novo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    await db
      .insert(cycleAnchor)
      .values({ userId, day: "2026-11-06", kind: "pause_started", createdAt: new Date(Date.now() - 60_000) });
    await setMethod(db, userId, { ...PILL, activeDays: 24 }, "2026-11-06");

    expect((await getCycleState(db, userId, "2026-11-06"))?.scheduled?.phase).toBe("active");
  });
});

describe("editar o método sem trocar o tipo", () => {
  const { currentUnitStart: _s, currentUnit: _u, ...PILL_CONFIG } = PILL;

  test("horário da pílula depois de 'comecei a pausa': mantém âncora, posição e histórico", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    await addAnchor(db, userId, "pause_started", "2026-11-06");
    const before = await getCycleState(db, userId, "2026-11-07");

    expect(await setMethod(db, userId, { ...PILL_CONFIG, pillTime: "08:00" }, "2026-11-07")).toEqual({ ok: true });

    const after = await getCycleState(db, userId, "2026-11-07");
    expect(after?.scheduled).toEqual(before!.scheduled);
    expect(after?.scheduled?.phase).toBe("pause");
    expect(after?.pill?.time).toBe("08:00");
    expect(after?.method.startedOn).toBe("2026-11-05");
    expect(after?.methodHistory).toHaveLength(1);
  });

  test("horário da pílula depois de emendar: a sequência continua com a cartela extra", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    await addAnchor(db, userId, "pack_extended", "2026-11-05");
    const before = await getCycleState(db, userId, "2026-11-20");

    await setMethod(db, userId, { ...PILL_CONFIG, pillTime: "08:00" }, "2026-11-20");

    const after = await getCycleState(db, userId, "2026-11-20");
    expect(before?.scheduled?.units).toBe(5);
    expect(after?.scheduled).toEqual(before!.scheduled);
    expect(after?.methodHistory).toHaveLength(1);
  });

  test("duração habitual no natural: mantém início declarado e ciclos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-03");
    for (const day of ["2025-01-29", "2025-01-30", "2025-02-26", "2025-02-27"]) {
      await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
    }
    const before = await getCycleState(db, userId, "2025-03-05");

    await setMethod(db, userId, { kind: "none", usualLength: 32 }, "2025-03-05");

    const after = await getCycleState(db, userId, "2025-03-05");
    expect(after?.natural).toEqual(before!.natural);
    expect(after?.natural?.avgLength).toBe(28);
    expect(after?.method).toMatchObject({ usualLength: 32, lastPeriodStart: "2025-01-01", startedOn: "2025-01-03" });
    expect(after?.methodHistory).toHaveLength(1);
  });

  test("mudar 'pausa a cada' sem posição recusa e não recalcula a cartela", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    const before = await getCycleState(db, userId, "2026-11-05");

    expect(await setMethod(db, userId, { ...PILL_CONFIG, pauseEvery: 2 }, "2026-11-05")).toEqual({
      ok: false,
      reason: "position_required",
    });
    expect(await setMethod(db, userId, { ...PILL_CONFIG, pauseDays: 5 }, "2026-11-05")).toEqual({
      ok: false,
      reason: "position_required",
    });
    expect((await getCycleState(db, userId, "2026-11-05"))?.scheduled).toEqual(before!.scheduled);
  });

  test("mudar a pausa com a posição troca o método a partir de hoje", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-01");

    const result = await setMethod(
      db,
      userId,
      { ...PILL_CONFIG, pauseEvery: 2, currentUnitStart: "2026-10-22", currentUnit: 1 },
      "2026-11-05",
    );
    expect(result).toEqual({ ok: true });

    const state = await getCycleState(db, userId, "2026-11-05");
    expect(state?.method).toMatchObject({ pauseEvery: 2, startedOn: "2026-11-05" });
    expect(state?.scheduled).toMatchObject({ unit: 1, pill: 15 });
    expect(state?.methodHistory).toHaveLength(2);
  });

  test("corrigir a cartela atual com a mesma configuração troca o método", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-01");

    expect(await setMethod(db, userId, { ...PILL, currentUnit: 2 }, "2026-11-05")).toEqual({ ok: true });

    const state = await getCycleState(db, userId, "2026-11-05");
    expect(state?.scheduled).toMatchObject({ unit: 2, pill: 15 });
    expect(state?.method.startedOn).toBe("2026-11-05");
    expect(state?.methodHistory).toHaveLength(2);
  });

  test("anel: mudar a duração da pausa pede a posição", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const ring = { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-11-01", currentUnit: 1 } as const;
    await activateCycle(db, userId, ring, "2026-11-01");

    expect(await setMethod(db, userId, { kind: "ring", pauseEvery: 1, pauseDays: 7 }, "2026-11-05")).toEqual({ ok: true });
    expect(await setMethod(db, userId, { kind: "ring", pauseEvery: 1, pauseDays: 5 }, "2026-11-05")).toEqual({
      ok: false,
      reason: "position_required",
    });
    expect((await getCycleState(db, userId, "2026-11-05"))?.methodHistory).toHaveLength(1);
  });

  test("corrigir a última menstruação no natural troca o método", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-03");

    await setMethod(db, userId, { kind: "none", lastPeriodStart: "2025-01-10", usualLength: 30 }, "2025-01-20");

    const state = await getCycleState(db, userId, "2025-01-20");
    expect(state?.method).toMatchObject({ lastPeriodStart: "2025-01-10", startedOn: "2025-01-20" });
    expect(state?.natural?.cycleDay).toBe(11);
  });

  test("mudar os comprimidos ativos fecha e abre; sem posição recusa", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");

    expect(await setMethod(db, userId, { ...PILL_CONFIG, activeDays: 24 }, "2026-11-06")).toEqual({
      ok: false,
      reason: "position_required",
    });
    expect(await setMethod(db, userId, { kind: "none", usualLength: 28 }, "2026-11-06")).toEqual({
      ok: false,
      reason: "position_required",
    });
    expect(await setMethod(db, userId, { ...PILL, activeDays: 24 }, "2026-11-06")).toEqual({ ok: true });

    const state = await getCycleState(db, userId, "2026-11-06");
    expect(state?.method).toMatchObject({ activeDays: 24, startedOn: "2026-11-06", pauseDays: 7 });
    expect(state?.methodHistory).toHaveLength(2);
  });

  test("ligar a pausa pede a posição; desligar troca o método sem posição", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const continuous = { kind: "pill", activeDays: 21, pillTime: "21:00" } as const;
    await activateCycle(db, userId, continuous, "2026-11-01");

    expect(await setMethod(db, userId, { ...continuous, pillTime: "08:00" }, "2026-11-02")).toEqual({ ok: true });
    expect((await getCycleState(db, userId, "2026-11-02"))?.methodHistory).toHaveLength(1);

    expect(await setMethod(db, userId, PILL_CONFIG, "2026-11-05")).toEqual({ ok: false, reason: "position_required" });
    expect(await setMethod(db, userId, PILL, "2026-11-05")).toEqual({ ok: true });
    expect((await getCycleState(db, userId, "2026-11-05"))?.mode).toBe("scheduled");

    expect(await setMethod(db, userId, continuous, "2026-11-06")).toEqual({ ok: true });
    const state = await getCycleState(db, userId, "2026-11-06");
    expect(state?.mode).toBe("continuous");
    expect(state?.method).toMatchObject({ pauseEvery: null, startedOn: "2026-11-06" });
    expect(state?.methodHistory).toHaveLength(3);
  });
});

describe("ativação", () => {
  test("desativar devolve null e mantém os dados; reativar devolve o estado", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    await saveDay(db, userId, "2025-01-10", { flow: "spotting", symptoms: [] });
    await setHiddenSymptoms(db, userId, ["acne"]);

    await setCycleEnabled(db, userId, false);
    expect(await isCycleEnabled(db, userId)).toBe(false);
    expect(await getCycleState(db, userId, "2026-11-05")).toBeNull();
    expect(await db.select().from(cycleDay)).toHaveLength(1);
    expect(await db.select().from(cycleMethod)).toHaveLength(1);

    expect(await setCycleEnabled(db, userId, true)).toBe(true);
    const state = await getCycleState(db, userId, "2026-11-05");
    expect(state?.scheduled?.pill).toBe(15);
    expect(state?.hiddenSymptoms).toEqual(["acne"]);
  });

  test("getCyclePayload: configured separa 'nunca ativou' de 'desativou'", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    expect(await getCyclePayload(db, userId, "2026-11-05")).toEqual({ cycle: null, configured: false });

    await activateCycle(db, userId, PILL, "2026-11-05");
    const on = await getCyclePayload(db, userId, "2026-11-05");
    expect(on.configured).toBe(true);
    expect(on.cycle?.scheduled?.pill).toBe(15);

    await setCycleEnabled(db, userId, false);
    expect(await getCyclePayload(db, userId, "2026-11-05")).toEqual({ cycle: null, configured: true });

    await deleteCycleData(db, userId);
    expect(await getCyclePayload(db, userId, "2026-11-05")).toEqual({ cycle: null, configured: false });
  });

  test("reativar sem método configurado não liga", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await setCycleEnabled(db, userId, true)).toBe(false);
    expect(await isCycleEnabled(db, userId)).toBe(false);
  });

  test("deleteCycleData apaga só as linhas desta pessoa", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const otherId = await createTestUser(db, "user-other");
    const today = dayFor();

    for (const id of [userId, otherId]) {
      await activateCycle(db, id, { ...PILL, currentUnitStart: today, currentUnit: 1 }, today);
      await saveDay(db, id, today, { flow: "light", symptoms: [] });
      await addAnchor(db, id, "pack_extended", today);
      await setPillTaken(db, id, today, true);
    }

    await deleteCycleData(db, userId);

    expect(await getCycleState(db, userId, today)).toBeNull();
    for (const table of [cycleSettings, cycleMethod, cycleAnchor, cycleDay, cyclePillIntake]) {
      const rows = await db.select().from(table);
      expect(rows.map((r) => r.userId)).toEqual([otherId]);
    }
    expect((await getCycleState(db, otherId, today))?.pill?.taken).toBe(true);
  });
});

describe("deleteCycleData e lembretes do ciclo", () => {
  test("apaga as entregas do ciclo e volta os 3 lembretes ao default; resto e outra pessoa intactos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const otherId = await createTestUser(db, "user-other");
    const today = dayFor();

    for (const id of [userId, otherId]) {
      await activateCycle(db, id, PILL, today);
      const rows = await listReminders(db, id);
      for (const r of rows) {
        if (r.type === "pill" || r.type === "cycle_soon" || r.type === "period_check" || r.type === "water") {
          await db.update(reminder).set({ enabled: r.type === "period_check" }).where(eq(reminder.id, r.id));
          await db.insert(reminderDelivery).values({ userId: id, reminderId: r.id, day: today, slot: "09:00", status: "sent" });
        }
      }
    }

    await deleteCycleData(db, userId);

    const mine = await db.select().from(reminder).where(eq(reminder.userId, userId));
    const enabledOf = (type: string) => mine.find((r) => r.type === type)?.enabled;
    expect(enabledOf("pill")).toBe(true);
    expect(enabledOf("cycle_soon")).toBe(true);
    expect(enabledOf("period_check")).toBe(false);
    expect(enabledOf("water")).toBe(false);

    const deliveries = await db
      .select({ userId: reminderDelivery.userId, type: reminder.type })
      .from(reminderDelivery)
      .innerJoin(reminder, eq(reminder.id, reminderDelivery.reminderId));
    expect(deliveries.filter((d) => d.userId === userId).map((d) => d.type)).toEqual(["water"]);
    expect(deliveries.filter((d) => d.userId === otherId)).toHaveLength(4);

    const theirs = await db.select().from(reminder).where(eq(reminder.userId, otherId));
    expect(theirs.find((r) => r.type === "pill")?.enabled).toBe(false);
    expect(theirs.find((r) => r.type === "period_check")?.enabled).toBe(true);
  });
});

describe("setPillTaken", () => {
  test("idempotente nos dois sentidos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");

    expect(await setPillTaken(db, userId, "2026-11-05", true)).toEqual({ ok: true });
    await setPillTaken(db, userId, "2026-11-05", true);
    expect(await db.select().from(cyclePillIntake)).toHaveLength(1);
    expect((await getCycleState(db, userId, "2026-11-05"))?.pill?.taken).toBe(true);

    await setPillTaken(db, userId, "2026-11-05", false);
    await setPillTaken(db, userId, "2026-11-05", false);
    expect(await db.select().from(cyclePillIntake)).toHaveLength(0);
  });

  test("takenDays: tomas da cartela atual até hoje", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const otherId = await createTestUser(db, "user-other");
    await activateCycle(db, userId, PILL, "2026-11-05");
    await activateCycle(db, otherId, PILL, "2026-11-05");

    // Cartela 3 começou em 22/10: 21/10 é da cartela anterior.
    for (const day of ["2026-10-21", "2026-11-06", "2026-11-08"]) await setPillTaken(db, userId, day, true);
    await setPillTaken(db, otherId, "2026-11-07", true);

    const state = await getCycleState(db, userId, "2026-11-08");
    expect(state?.pill?.takenDays).toEqual(["2026-11-06", "2026-11-08"]);
  });

  test("sem pílula → not_pill", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-11-01", currentUnit: 1 }, "2026-11-05");

    expect(await setPillTaken(db, userId, "2026-11-05", true)).toEqual({ ok: false, reason: "not_pill" });
  });
});

describe("getPillToday", () => {
  test("pílula 21 ativa → comprimido K de 21; tomada reflete a toma", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");

    expect(await getPillToday(db, userId, "2026-11-05")).toEqual({
      time: "21:00",
      taken: false,
      label: "comprimido 15 de 21",
    });
    await setPillTaken(db, userId, "2026-11-05", true);
    expect((await getPillToday(db, userId, "2026-11-05"))?.taken).toBe(true);
  });

  test("pílula sem pausa → pílula contínua", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "pill", activeDays: 28, pillTime: "08:00" }, "2026-11-05");

    expect(await getPillToday(db, userId, "2026-11-05")).toEqual({
      time: "08:00",
      taken: false,
      label: "pílula contínua",
    });
  });

  test("pausa, ciclo desativado e anel → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL, "2026-11-05");
    expect(await getPillToday(db, userId, "2026-12-05")).toBeNull();

    await setCycleEnabled(db, userId, false);
    expect(await getPillToday(db, userId, "2026-11-05")).toBeNull();

    const ringUser = await createTestUser(db, "user-ring");
    await activateCycle(
      db,
      ringUser,
      { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-11-01", currentUnit: 1 },
      "2026-11-05",
    );
    expect(await getPillToday(db, ringUser, "2026-11-05")).toBeNull();
  });
});

describe("getCycleHistory", () => {
  const PILL_1 = {
    kind: "pill",
    activeDays: 21,
    pauseEvery: 1,
    pillTime: "21:00",
    currentUnitStart: "2025-07-16",
    currentUnit: 1,
  } as const;
  const bleed = async (db: Awaited<ReturnType<typeof createTestDb>>, userId: string, days: string[], flow: CycleFlow = "medium") => {
    for (const day of days) await saveDay(db, userId, day, { flow, symptoms: [] });
  };

  test("natural: ciclos do mais novo ao mais antigo, com duração e dias de menstruação", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2025-01-01", usualLength: 30 }, "2025-01-03");
    await bleed(db, userId, ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04"]);
    await bleed(db, userId, ["2025-01-29", "2025-01-30", "2025-01-31", "2025-02-26"]);
    await saveDay(db, userId, "2025-02-10", { flow: "none", symptoms: ["acne"] });

    const { sections } = await getCycleHistory(db, userId, "2025-03-01");
    expect(sections).toEqual([
      {
        kind: "none",
        startedOn: "2025-01-03",
        endedOn: null,
        mode: "natural",
        cycles: [
          { start: "2025-02-26", end: "2025-03-01", length: 4, periodDays: 1, status: "current" },
          { start: "2025-01-29", end: "2025-02-25", length: 28, periodDays: 3, status: "done" },
          { start: "2025-01-01", end: "2025-01-28", length: 28, periodDays: 4, status: "done" },
        ],
      },
    ]);
  });

  test("pílula → natural: sequências do método antigo com o sangramento de cada pausa", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(
      db,
      userId,
      { kind: "pill", activeDays: 21, pauseEvery: 1, pillTime: "21:00", currentUnitStart: "2025-07-16", currentUnit: 1 },
      "2025-07-16",
    );
    await bleed(db, userId, ["2025-08-08", "2025-08-09", "2025-08-10", "2025-08-11"], "light");
    await setMethod(db, userId, { kind: "none", lastPeriodStart: "2025-09-04", usualLength: 28 }, "2025-09-20");

    const { sections } = await getCycleHistory(db, userId, "2025-10-01");
    expect(sections.map((s) => s.mode)).toEqual(["natural", "scheduled"]);
    expect(sections[0]).toMatchObject({
      cycles: [{ start: "2025-09-04", end: "2025-10-01", length: 28, periodDays: null, status: "current" }],
    });
    expect(sections[1]).toEqual({
      kind: "pill",
      startedOn: "2025-07-16",
      endedOn: "2025-09-20",
      mode: "scheduled",
      sequences: [
        { start: "2025-09-10", pause: { from: "2025-10-01", to: "2025-10-07" }, bleed: null, status: "cut" },
        { start: "2025-08-13", pause: { from: "2025-09-03", to: "2025-09-09" }, bleed: null, status: "done" },
        {
          start: "2025-07-16",
          pause: { from: "2025-08-06", to: "2025-08-12" },
          bleed: { from: "2025-08-08", to: "2025-08-11" },
          status: "done",
        },
      ],
    });
  });

  test("pausa que começou antes da troca termina na véspera da troca", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL_1, "2025-07-16");
    await bleed(db, userId, ["2025-08-07", "2025-08-08"], "light");
    await setMethod(db, userId, { kind: "none", lastPeriodStart: "2025-08-07", usualLength: 28 }, "2025-08-09");

    const { sections } = await getCycleHistory(db, userId, "2025-08-20");
    expect(sections[1]).toMatchObject({
      sequences: [
        {
          start: "2025-07-16",
          pause: { from: "2025-08-06", to: "2025-08-08" },
          bleed: { from: "2025-08-07", to: "2025-08-08" },
          status: "done",
        },
      ],
    });
  });

  test("escape na pausa não conta como sangramento da pausa", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL_1, "2025-07-16");
    await bleed(db, userId, ["2025-08-06", "2025-08-07"], "spotting");
    await bleed(db, userId, ["2025-08-08", "2025-08-09"], "light");
    await bleed(db, userId, ["2025-09-03", "2025-09-04"], "spotting");

    const { sections } = await getCycleHistory(db, userId, "2025-09-20");
    expect(sections[0]).toMatchObject({
      sequences: [
        { start: "2025-09-10", bleed: null },
        { start: "2025-08-13", pause: { from: "2025-09-03", to: "2025-09-09" }, bleed: null },
        { start: "2025-07-16", bleed: { from: "2025-08-08", to: "2025-08-09" } },
      ],
    });
  });

  test("pausa em curso do método atual vem inteira", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL_1, "2025-07-16");

    const { sections } = await getCycleHistory(db, userId, "2025-08-08");
    expect(sections[0]).toMatchObject({
      sequences: [{ start: "2025-07-16", pause: { from: "2025-08-06", to: "2025-08-12" }, status: "current" }],
    });
  });

  test("âncora de um método de duração zero não vale para o método anterior", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, PILL_1, "2025-07-16");
    await new Promise((r) => setTimeout(r, 5));
    await setMethod(db, userId, { ...PILL_1, activeDays: 24 }, "2025-08-01");
    await new Promise((r) => setTimeout(r, 5));
    await addAnchor(db, userId, "pause_started", "2025-07-20");
    await new Promise((r) => setTimeout(r, 5));
    await setMethod(db, userId, { kind: "none", lastPeriodStart: "2025-07-25", usualLength: 28 }, "2025-08-01");

    const { sections } = await getCycleHistory(db, userId, "2025-08-10");
    expect(sections.map((s) => s.kind)).toEqual(["none", "pill"]);
    expect(sections[1]).toMatchObject({
      sequences: [{ start: "2025-07-16", pause: { from: "2025-08-06", to: "2025-08-12" }, status: "cut" }],
    });
  });

  test("pílula atual: âncora do método reancora a pausa; sequência em curso vem como current", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(
      db,
      userId,
      { kind: "pill", activeDays: 21, pauseEvery: 1, pillTime: "21:00", currentUnitStart: "2025-07-16", currentUnit: 1 },
      "2025-07-16",
    );
    await addAnchor(db, userId, "pause_started", "2025-08-04");

    const { sections } = await getCycleHistory(db, userId, "2025-08-20");
    expect(sections[0]).toMatchObject({
      sequences: [
        { start: "2025-08-11", pause: { from: "2025-09-01", to: "2025-09-07" }, status: "current" },
        { start: "2025-07-16", pause: { from: "2025-08-04", to: "2025-08-10" }, status: "done" },
      ],
    });
  });

  test("contínuo: só os episódios de sangramento, escape incluso", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await activateCycle(db, userId, { kind: "hormonal_iud" }, "2025-01-10");
    await bleed(db, userId, ["2025-02-01", "2025-02-02"], "spotting");
    await bleed(db, userId, ["2025-03-10"]);

    const { sections } = await getCycleHistory(db, userId, "2025-04-01");
    expect(sections).toEqual([
      {
        kind: "hormonal_iud",
        startedOn: "2025-01-10",
        endedOn: null,
        mode: "continuous",
        events: [
          { from: "2025-03-10", to: "2025-03-10" },
          { from: "2025-02-01", to: "2025-02-02" },
        ],
      },
    ]);
  });
});
