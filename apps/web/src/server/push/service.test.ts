import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import type { Db } from "@bloomy/db";
import { reminder } from "@bloomy/db/schema/reminder";
import { eq } from "drizzle-orm";

import { updateProfile } from "@/server/profile/service";
import { activateCycle } from "@/server/cycle/service";
import { listReminders, REMINDER_TYPES, updateReminder } from "@/server/reminders/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { listSubscriptions, saveSubscription } from "./service";

let db: Db;
let userId: string;

const DEVICE = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  p256dh: "p256dh-key",
  auth: "auth-secret",
};

beforeEach(async () => {
  db = await createTestDb();
  userId = await createTestUser(db);
});

afterAll(cleanupTestDbs);

async function turnOffReminders(user: string, keep: string[] = []) {
  for (const r of await listReminders(db, user)) {
    if (!keep.includes(r.type)) await updateReminder(db, user, r.id, { enabled: false });
  }
}

describe("saveSubscription", () => {
  test("cria os lembretes default de quem nunca abriu /notificacoes", async () => {
    await saveSubscription(db, userId, DEVICE);

    const rows = await db.select().from(reminder).where(eq(reminder.userId, userId));
    expect(rows).toHaveLength(REMINDER_TYPES.length);
    expect(await listSubscriptions(db, userId)).toHaveLength(1);
  });

  test("guarda o aparelho só pelo aviso de fim do descanso, mesmo com lembretes desligados", async () => {
    await turnOffReminders(userId);

    expect(await saveSubscription(db, userId, DEVICE)).not.toBeNull();
    expect(await listSubscriptions(db, userId)).toHaveLength(1);
  });

  test("não guarda o aparelho com lembretes e aviso de descanso desligados", async () => {
    await turnOffReminders(userId);
    await updateProfile(db, userId, { restAlert: false });

    expect(await saveSubscription(db, userId, DEVICE)).toBeNull();
    expect(await listSubscriptions(db, userId)).toHaveLength(0);
  });

  test("lembretes do ciclo ligados não seguram o aparelho com o ciclo desativado", async () => {
    await turnOffReminders(userId, ["pill", "cycle_soon"]);
    await updateProfile(db, userId, { restAlert: false });

    expect(await saveSubscription(db, userId, DEVICE)).toBeNull();
  });

  test("com o ciclo ativo, ciclo chegando ligado basta para guardar o aparelho", async () => {
    await turnOffReminders(userId, ["cycle_soon"]);
    await updateProfile(db, userId, { restAlert: false });
    await activateCycle(db, userId, { kind: "none", lastPeriodStart: "2026-09-20", usualLength: 28 }, "2026-10-01");

    expect(await saveSubscription(db, userId, DEVICE)).not.toBeNull();
  });

  test("ciclo chegando não segura o aparelho em método contínuo", async () => {
    await turnOffReminders(userId, ["cycle_soon"]);
    await updateProfile(db, userId, { restAlert: false });
    await activateCycle(db, userId, { kind: "implant" }, "2026-10-01");

    expect(await saveSubscription(db, userId, DEVICE)).toBeNull();
  });

  test("pílula ligada só segura o aparelho de quem usa pílula", async () => {
    await turnOffReminders(userId, ["pill"]);
    await updateProfile(db, userId, { restAlert: false });
    const ring = { kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: "2026-10-01", currentUnit: 1 } as const;
    await activateCycle(db, userId, ring, "2026-10-01");
    expect(await saveSubscription(db, userId, DEVICE)).toBeNull();

    await activateCycle(db, userId, { kind: "pill", activeDays: 28, pillTime: "08:00" }, "2026-10-02");
    expect(await saveSubscription(db, userId, DEVICE)).not.toBeNull();
  });

  test("com tudo desligado, apaga o registro que o aparelho tinha de outra conta", async () => {
    const anterior = await createTestUser(db, "anterior");
    await saveSubscription(db, anterior, DEVICE);
    await turnOffReminders(userId);
    await updateProfile(db, userId, { restAlert: false });

    await saveSubscription(db, userId, DEVICE);
    expect(await listSubscriptions(db, anterior)).toHaveLength(0);
  });
});
