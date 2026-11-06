import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import type { Db } from "@bloomy/db";
import { reminder, reminderDelivery } from "@bloomy/db/schema/reminder";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { listReminders, updateReminder } from "./service";

let db: Db;
let userId: string;

beforeEach(async () => {
  db = await createTestDb();
  userId = await createTestUser(db);
});

afterAll(cleanupTestDbs);

describe("lazy seed", () => {
  test("primeiro GET cria as oito linhas na ordem da tela", async () => {
    const rows = await listReminders(db, userId);
    expect(rows.map((r) => r.type)).toEqual([
      "water",
      "meds",
      "workout",
      "mind",
      "appointments",
      "pill",
      "cycle_soon",
      "period_check",
    ]);
  });

  test("defaults ligados, com horário só onde é editável", async () => {
    const rows = await listReminders(db, userId);
    const byType = Object.fromEntries(rows.map((r) => [r.type, r]));

    expect(rows.filter((r) => r.type !== "period_check").every((r) => r.enabled)).toBe(true);
    expect(byType.workout.time).toBe("18:00");
    expect(byType.mind.time).toBe("21:00");
    expect(byType.water.time).toBeNull();
    expect(byType.meds.time).toBeNull();
    expect(byType.appointments.time).toBeNull();
  });

  test("lembretes do ciclo: pílula e ciclo chegando ligados, ainda menstruada desligado", async () => {
    const rows = await listReminders(db, userId);
    const byType = Object.fromEntries(rows.map((r) => [r.type, r]));

    expect(byType.pill.enabled).toBe(true);
    expect(byType.cycle_soon.enabled).toBe(true);
    expect(byType.period_check.enabled).toBe(false);
    expect(byType.pill.time).toBeNull();
  });

  test("quem já tinha as cinco linhas antigas ganha só as três do ciclo", async () => {
    await db.insert(reminder).values(
      (["water", "meds", "workout", "mind", "appointments"] as const).map((type) => ({
        userId,
        type,
        enabled: false,
      })),
    );

    const rows = await listReminders(db, userId);
    expect(rows).toHaveLength(8);
    expect(rows.filter((r) => !r.enabled).map((r) => r.type)).toEqual([
      "water",
      "meds",
      "workout",
      "mind",
      "appointments",
      "period_check",
    ]);
  });

  test("segundo GET não duplica nem ressuscita o que foi desligado", async () => {
    const first = await listReminders(db, userId);
    const water = first.find((r) => r.type === "water")!;
    await updateReminder(db, userId, water.id, { enabled: false });

    const second = await listReminders(db, userId);
    expect(second).toHaveLength(8);
    expect(second.find((r) => r.type === "water")!.enabled).toBe(false);
    expect(second.find((r) => r.type === "water")!.id).toBe(water.id);
  });
});

describe("updateReminder", () => {
  test("aceita horário em treino e mente", async () => {
    const rows = await listReminders(db, userId);
    const workout = rows.find((r) => r.type === "workout")!;

    const result = await updateReminder(db, userId, workout.id, { time: "07:30" });
    expect(result.ok).toBe(true);
    expect(result.ok && result.reminder.time).toBe("07:30");
  });

  test("pílula não aceita horário: ele é editado no método", async () => {
    const rows = await listReminders(db, userId);
    const pill = rows.find((r) => r.type === "pill")!;

    const result = await updateReminder(db, userId, pill.id, { time: "07:30" });
    expect(result).toEqual({ ok: false, reason: "time_not_allowed" });
  });

  test("recusa horário em tipo derivado", async () => {
    const rows = await listReminders(db, userId);
    const water = rows.find((r) => r.type === "water")!;

    const result = await updateReminder(db, userId, water.id, { time: "07:30" });
    expect(result).toEqual({ ok: false, reason: "time_not_allowed" });
  });

  test("lembrete de outro usuário responde not_found", async () => {
    const rows = await listReminders(db, userId);
    const other = await createTestUser(db, "user-outro");

    const result = await updateReminder(db, other, rows[0].id, { enabled: false });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("idempotência de reminder_delivery", () => {
  const claim = (db: Db, userId: string, reminderId: string, refId = "") =>
    db
      .insert(reminderDelivery)
      .values({ userId, reminderId, day: "2026-07-06", slot: "09:00", refId, status: "sent" })
      .onConflictDoNothing()
      .returning({ id: reminderDelivery.id });

  test("duas varreduras no mesmo slot rendem um envio só", async () => {
    const rows = await listReminders(db, userId);
    const water = rows.find((r) => r.type === "water")!;

    expect(await claim(db, userId, water.id)).toHaveLength(1);
    expect(await claim(db, userId, water.id)).toHaveLength(0);
  });

  test("refId diferente é outro slot — duas consultas na mesma hora avisam as duas", async () => {
    const rows = await listReminders(db, userId);
    const appointments = rows.find((r) => r.type === "appointments")!;

    expect(await claim(db, userId, appointments.id, "appt:a1:1h")).toHaveLength(1);
    expect(await claim(db, userId, appointments.id, "appt:a2:1h")).toHaveLength(1);
    expect(await claim(db, userId, appointments.id, "appt:a1:1h")).toHaveLength(0);
  });
});
