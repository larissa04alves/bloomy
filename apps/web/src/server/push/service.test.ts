import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import type { Db } from "@bloomy/db";
import { reminder } from "@bloomy/db/schema/reminder";
import { eq } from "drizzle-orm";

import { listReminders, updateReminder } from "@/server/reminders/service";
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

describe("saveSubscription", () => {
  test("cria os lembretes default de quem nunca abriu /notificacoes", async () => {
    await saveSubscription(db, userId, DEVICE);

    const rows = await db.select().from(reminder).where(eq(reminder.userId, userId));
    expect(rows).toHaveLength(5);
    expect(await listSubscriptions(db, userId)).toHaveLength(1);
  });

  test("não guarda o aparelho quando todos os lembretes estão desligados", async () => {
    for (const r of await listReminders(db, userId)) {
      await updateReminder(db, userId, r.id, { enabled: false });
    }

    expect(await saveSubscription(db, userId, DEVICE)).toBeNull();
    expect(await listSubscriptions(db, userId)).toHaveLength(0);
  });
});
