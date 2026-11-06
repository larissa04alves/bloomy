import { afterAll, describe, expect, test } from "bun:test";

import { reminder } from "@bloomy/db/schema/reminder";
import { setLog, workoutSession } from "@bloomy/db/schema/workout";
import { eq } from "drizzle-orm";

import { activateCycle, saveDay, setPillTaken } from "@/server/cycle/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { createWorkout } from "@/server/workout/service";
import { startSession } from "@/server/workout/session";
import { claimStaleSessions, loadCycle, loadReminderRows, SEND_OPTIONS } from "./dispatch";
import { TOLERANCE_MINUTES } from "./slots";

afterAll(cleanupTestDbs);

describe("opções de envio", () => {
  test("urgência alta: o Android segura push normal enquanto o celular dorme", () => {
    expect(SEND_OPTIONS.urgency).toBe("high");
  });

  test("TTL igual à tolerância: lembrete atrasado além dela é descartado no push service", () => {
    expect(SEND_OPTIONS.TTL).toBe(TOLERANCE_MINUTES * 60);
  });
});

async function setup() {
  const db = await createTestDb();
  const userId = await createTestUser(db);
  return { db, userId };
}

const bleed = async (db: Awaited<ReturnType<typeof setup>>["db"], userId: string, days: string[]) => {
  for (const day of days) await saveDay(db, userId, day, { flow: "medium", symptoms: [] });
};

const ON = { periodCheck: true };

describe("loadCycle", () => {
  test("ciclo nunca ativado → null", async () => {
    const { db, userId } = await setup();
    expect(await loadCycle(db, userId, "2026-10-20", ON)).toBeNull();
  });

  test("natural: ciclo chegando 2 dias antes do início da faixa", async () => {
    const { db, userId } = await setup();
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2026-10-01", usualLength: 28 }, "2026-10-01");

    // Faixa 27–31/10 (centro 29, margem 2).
    expect(await loadCycle(db, userId, "2026-10-20", ON)).toEqual({
      pill: null,
      soonDay: "2026-10-25",
      soonKind: "period",
      periodCheck: false,
    });
  });

  test("anel: ciclo chegando 2 dias antes da pausa, sem pílula", async () => {
    const { db, userId } = await setup();
    await activateCycle(
      db,
      userId,
      { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-10-01", currentUnit: 1 },
      "2026-10-01",
    );

    expect(await loadCycle(db, userId, "2026-10-10", ON)).toMatchObject({
      pill: null,
      soonDay: "2026-10-20",
      soonKind: "pause",
    });
  });

  test("já na pausa não há ciclo chegando", async () => {
    const { db, userId } = await setup();
    await activateCycle(
      db,
      userId,
      { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-10-01", currentUnit: 1 },
      "2026-10-01",
    );

    expect(await loadCycle(db, userId, "2026-10-23", ON)).toMatchObject({ soonDay: null, soonKind: null });
  });

  test("pílula 21 devida traz horário, rótulo e se foi tomada", async () => {
    const { db, userId } = await setup();
    await activateCycle(
      db,
      userId,
      { kind: "pill", activeDays: 21, pauseEvery: 1, pillTime: "21:00", currentUnitStart: "2026-10-01", currentUnit: 1 },
      "2026-10-01",
    );

    expect((await loadCycle(db, userId, "2026-10-10", ON))?.pill).toEqual({
      time: "21:00",
      taken: false,
      label: "comprimido 10 de 21",
    });
    expect((await loadCycle(db, userId, "2026-10-23", ON))?.pill).toBeNull();
  });

  test("pílula marcada como tomada", async () => {
    const { db, userId } = await setup();
    await activateCycle(db, userId, { kind: "pill", activeDays: 28, pillTime: "08:00" }, "2026-10-01");
    await setPillTaken(db, userId, "2026-10-10", true);

    expect(await loadCycle(db, userId, "2026-10-10", ON)).toEqual({
      pill: { time: "08:00", taken: true, label: "pílula contínua" },
      soonDay: null,
      soonKind: null,
      periodCheck: false,
    });
  });

  describe("ainda menstruada", () => {
    const activate = async () => {
      const ctx = await setup();
      await activateCycle(
        ctx.db,
        ctx.userId,
        { kind: "none", lastPeriodStart: "2026-09-20", usualLength: 28 },
        "2026-09-20",
      );
      return ctx;
    };

    test("5º dia sem registro hoje → verdadeiro", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
      expect((await loadCycle(db, userId, "2026-10-20", ON))?.periodCheck).toBe(true);
    });

    test("já registrou hoje → falso", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
      await saveDay(db, userId, "2026-10-20", { flow: "none", symptoms: ["cramps"] });
      expect((await loadCycle(db, userId, "2026-10-20", ON))?.periodCheck).toBe(false);
    });

    test("registrou 'Nada' hoje, sem sintomas → falso", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
      await saveDay(db, userId, "2026-10-20", { flow: "none", symptoms: [] });
      expect((await loadCycle(db, userId, "2026-10-20", ON))?.periodCheck).toBe(false);
    });

    test("lembrete desligado → falso, sem precisar ler os dias", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
      expect((await loadCycle(db, userId, "2026-10-20", { periodCheck: false }))?.periodCheck).toBe(false);
    });

    test("só no 4º dia → falso", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-17", "2026-10-18", "2026-10-19"]);
      expect((await loadCycle(db, userId, "2026-10-20", ON))?.periodCheck).toBe(false);
    });

    test("menstruação que parou antes de ontem → falso", async () => {
      const { db, userId } = await activate();
      await bleed(db, userId, ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
      expect((await loadCycle(db, userId, "2026-10-20", ON))?.periodCheck).toBe(false);
    });
  });
});

describe("loadReminderRows", () => {
  test("quem só tem as linhas antigas ganha as do ciclo na varredura", async () => {
    const { db, userId } = await setup();
    await db
      .insert(reminder)
      .values((["water", "meds", "workout", "mind", "appointments"] as const).map((type) => ({ userId, type })));

    const rows = await loadReminderRows(db, userId);
    expect(rows.map((r) => [r.type, r.enabled])).toEqual([
      ["water", true],
      ["meds", true],
      ["workout", true],
      ["mind", true],
      ["appointments", true],
      ["pill", true],
      ["cycle_soon", true],
      ["period_check", false],
    ]);
  });

  test("quem nunca teve lembrete continua sem nenhum", async () => {
    const { db, userId } = await setup();
    expect(await loadReminderRows(db, userId)).toEqual([]);
  });
});

describe("claimStaleSessions", () => {
  const HOUR = 60 * 60 * 1000;
  const now = new Date("2026-11-06T21:00:00-03:00");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  async function openSession(startedAgo: number, lastSetAgo: number | null) {
    const { db, userId } = await setup();
    const w = await createWorkout(db, userId, {
      name: "Pernas",
      focuses: ["legs"],
      exercises: [{ name: "Agachamento", targetSets: 1, targetReps: 10, restSeconds: 60, position: 0 }],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    await db.update(workoutSession).set({ startedAt: ago(startedAgo) }).where(eq(workoutSession.id, s.session.id));
    if (lastSetAgo !== null) {
      await db
        .update(setLog)
        .set({ done: true, doneAt: ago(lastSetAgo) })
        .where(eq(setLog.id, s.exercises[0].sets[0].id));
    }
    return { db, userId, sessionId: s.session.id };
  }

  test("parado há 2 horas desde a última série: avisa uma vez só", async () => {
    const { db, userId } = await openSession(3 * HOUR, 2 * HOUR);
    expect(await claimStaleSessions(db, now)).toEqual([{ userId, workoutName: "Pernas" }]);
    expect(await claimStaleSessions(db, now)).toEqual([]);
  });

  test("série concluída há menos de 2 horas não avisa, mesmo com o início antigo", async () => {
    const { db } = await openSession(3 * HOUR, HOUR);
    expect(await claimStaleSessions(db, now)).toEqual([]);
  });

  test("voltou a treinar depois do aviso e parou de novo: avisa outra vez", async () => {
    const { db, userId, sessionId } = await openSession(6 * HOUR, 5 * HOUR);
    // Aviso às 18h (parado desde 16h); série nova às 18h30; às 21h está parado há 2h30.
    expect(await claimStaleSessions(db, ago(3 * HOUR))).toHaveLength(1);
    await db.insert(setLog).values({
      sessionId,
      userId,
      exerciseName: "Agachamento",
      setIndex: 1,
      done: true,
      doneAt: ago(2.5 * HOUR),
    });
    expect(await claimStaleSessions(db, now)).toEqual([{ userId, workoutName: "Pernas" }]);
  });

  test("treino aberto há mais de um dia não avisa (esquecido de vez, não de agora)", async () => {
    const { db } = await openSession(30 * HOUR, null);
    expect(await claimStaleSessions(db, now)).toEqual([]);
  });

  test("treino concluído não avisa", async () => {
    const { db, sessionId } = await openSession(3 * HOUR, null);
    await db.update(workoutSession).set({ completedAt: ago(HOUR) }).where(eq(workoutSession.id, sessionId));
    expect(await claimStaleSessions(db, now)).toEqual([]);
  });
});
