import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { deleteWeight, listWeights, updateWeight, upsertWeight } from "./weight";

describe("upsertWeight", () => {
  test("cria o primeiro registro do dia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const row = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    expect(row.grams).toBe(64200);
    expect(row.day).toBe("2026-08-03");
  });

  test("registrar de novo no mesmo dia substitui, não duplica", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, userId, { day: "2026-08-03", grams: 64500 });

    const all = await listWeights(db, userId);
    expect(all).toHaveLength(1);
    expect(all[0].grams).toBe(64500);
  });

  test("usuários diferentes podem ter peso no mesmo dia", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");

    await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, b, { day: "2026-08-03", grams: 71000 });

    expect(await listWeights(db, a)).toHaveLength(1);
    expect(await listWeights(db, b)).toHaveLength(1);
  });
});

describe("listWeights", () => {
  test("ordena por dia desc e isola por usuário", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");

    await upsertWeight(db, a, { day: "2026-07-20", grams: 64800 });
    await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, a, { day: "2026-07-27", grams: 65000 });
    await upsertWeight(db, b, { day: "2026-08-01", grams: 71000 });

    const rows = await listWeights(db, a);

    expect(rows.map((r) => r.day)).toEqual(["2026-08-03", "2026-07-27", "2026-07-20"]);
  });

  test("sem registros → lista vazia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await listWeights(db, userId)).toEqual([]);
  });
});

describe("updateWeight", () => {
  test("altera o valor mantendo o dia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const updated = await updateWeight(db, userId, created.id, { grams: 63900 });

    expect(updated).not.toBeNull();
    expect(updated).not.toBe("day_taken");
    if (updated && updated !== "day_taken") {
      expect(updated.grams).toBe(63900);
      expect(updated.day).toBe("2026-08-03");
    }
  });

  test("move para um dia livre", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const updated = await updateWeight(db, userId, created.id, { day: "2026-08-02" });

    expect(updated).not.toBe("day_taken");
    if (updated && updated !== "day_taken") expect(updated.day).toBe("2026-08-02");
  });

  test("mover para um dia já ocupado devolve 'day_taken' e não apaga o outro", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await upsertWeight(db, userId, { day: "2026-08-02", grams: 65000 });
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const result = await updateWeight(db, userId, created.id, { day: "2026-08-02" });

    expect(result).toBe("day_taken");
    const all = await listWeights(db, userId);
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.day === "2026-08-02")?.grams).toBe(65000);
  });

  test("id inexistente → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await updateWeight(db, userId, "nope", { grams: 60000 })).toBeNull();
  });

  test("registro de outro usuário → null, sem alterar nada", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");
    const created = await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });

    expect(await updateWeight(db, b, created.id, { grams: 50000 })).toBeNull();
    expect((await listWeights(db, a))[0].grams).toBe(64200);
  });
});

describe("deleteWeight", () => {
  test("remove o registro do próprio usuário", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    expect(await deleteWeight(db, userId, created.id)).toBe(true);
    expect(await listWeights(db, userId)).toEqual([]);
  });

  test("registro de outro usuário não é removido", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");
    const created = await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });

    expect(await deleteWeight(db, b, created.id)).toBe(false);
    expect(await listWeights(db, a)).toHaveLength(1);
  });
});
