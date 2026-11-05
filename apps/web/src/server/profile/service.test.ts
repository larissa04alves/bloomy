import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { ensureProfile, updateProfile, validProfileUpdate } from "./service";

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

describe("altura e nascimento", () => {
  test("update grava altura e nascimento sem tocar na porção", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureProfile(db, userId);

    const updated = await updateProfile(db, userId, { heightCm: 172, birthDate: "1996-03-12" });

    expect(updated.heightCm).toBe(172);
    expect(updated.birthDate).toBe("1996-03-12");
    expect(updated.waterPortionMl).toBe(500);
  });

  test("altura fora de 100–250 ou fracionada é inválida", () => {
    expect(validProfileUpdate({ heightCm: 99 })).toBe(false);
    expect(validProfileUpdate({ heightCm: 251 })).toBe(false);
    expect(validProfileUpdate({ heightCm: 170.5 })).toBe(false);
    expect(validProfileUpdate({ heightCm: 100 })).toBe(true);
    expect(validProfileUpdate({ heightCm: 250 })).toBe(true);
  });

  test("nascimento entre 1900-01-01 e hoje, com data existente", () => {
    expect(validProfileUpdate({ birthDate: "1899-12-31" }, "2026-11-05")).toBe(false);
    expect(validProfileUpdate({ birthDate: "2026-11-06" }, "2026-11-05")).toBe(false);
    expect(validProfileUpdate({ birthDate: "1990-02-31" }, "2026-11-05")).toBe(false);
    expect(validProfileUpdate({ birthDate: "2026-11-05" }, "2026-11-05")).toBe(true);
  });

  test("sem altura nem nascimento não há o que validar", () => {
    expect(validProfileUpdate({})).toBe(true);
  });
});
