import { describe, expect, test } from "bun:test";

import { moodCheckin } from "@bloomy/db/schema/mind";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { dayFor } from "@/server/shared/day";
import { getCheckin, upsertCheckin } from "./service";

describe("upsertCheckin (1 por dia)", () => {
  test("não duplica no mesmo dia e atualização parcial preserva campos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await upsertCheckin(db, userId, { mood: "good", anxiety: 20 });
    await upsertCheckin(db, userId, { note: "dia tranquilo" });

    const checkin = await getCheckin(db, userId, dayFor());
    expect(checkin).not.toBeNull();
    expect(checkin!.mood).toBe("good");
    expect(checkin!.anxiety).toBe(20);
    expect(checkin!.note).toBe("dia tranquilo");

    const all = await db.select().from(moodCheckin);
    expect(all).toHaveLength(1);
  });
});
