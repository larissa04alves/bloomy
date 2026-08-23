import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { ensureProfile, updateProfile } from "./service";

afterAll(cleanupTestDbs);

describe("waterPortionMl", () => {
  test("nasce com 500 ml", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const profile = await ensureProfile(db, userId);

    expect(profile.waterPortionMl).toBe(500);
  });

  test("update altera só a porção, sem tocar no descanso", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureProfile(db, userId);

    const updated = await updateProfile(db, userId, { waterPortionMl: 250 });

    expect(updated.waterPortionMl).toBe(250);
    expect(updated.restSeconds).toBe(45);
    expect(updated.autoRest).toBe(true);
  });
});
