import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { medication } from "@bloomy/db/schema/body";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  createMedication,
  deriveIntakes,
  getIntakesDay,
  markIntake,
  unmarkIntake,
  updateMedication,
} from "./service";

afterAll(cleanupTestDbs);

describe("deriveIntakes (pura)", () => {
  const meds = [
    { id: "m1", name: "Vitamina D", doseAmount: 1, doseUnit: "capsula" as const, times: ["09:00"] },
    { id: "m2", name: "Magnésio", doseAmount: 1, doseUnit: "comp" as const, times: ["09:00", "21:00"] },
  ];

  test("expande cadastro × horários, ordenado por hora", () => {
    const slots = deriveIntakes(meds, []);
    expect(slots.map((s) => `${s.time} ${s.name}`)).toEqual([
      "09:00 Magnésio",
      "09:00 Vitamina D",
      "21:00 Magnésio",
    ]);
    expect(slots.every((s) => !s.taken)).toBe(true);
  });

  test("marca taken só no slot confirmado", () => {
    const slots = deriveIntakes(meds, [{ medicationId: "m2", time: "21:00" }]);
    expect(slots.find((s) => s.medicationId === "m2" && s.time === "21:00")?.taken).toBe(true);
    expect(slots.filter((s) => s.taken)).toHaveLength(1);
  });
});

describe("markIntake / unmarkIntake (db em memória)", () => {
  test("marcar decrementa estoque; duplicar dá duplicate; desmarcar devolve", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Vitamina D",
      stock: 10,
      times: ["09:00"],
    });
    const input = { medicationId: med.id, time: "09:00", day: "2026-07-06" };

    expect(await markIntake(db, userId, input)).toBe("ok");
    let [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(9);

    expect(await markIntake(db, userId, input)).toBe("duplicate");
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(9);

    expect(await unmarkIntake(db, userId, input)).toBe(true);
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(10);

    const slots = await getIntakesDay(db, userId, "2026-07-06");
    expect(slots).toHaveLength(1);
    expect(slots[0].taken).toBe(false);
  });

  test("estoque não fica negativo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Magnésio",
      stock: 0,
      times: ["09:00"],
    });

    expect(await markIntake(db, userId, { medicationId: med.id, time: "09:00", day: "2026-07-06" })).toBe("ok");
    let [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(0);

    // desmarcar uma toma que não descontou não pode criar unidade fantasma
    expect(await unmarkIntake(db, userId, { medicationId: med.id, time: "09:00", day: "2026-07-06" })).toBe(true);
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(0);
  });

  test("toma desconta a quantidade da dose e desmarcar devolve", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Creatina",
      doseAmount: 2,
      doseUnit: "scoop",
      stock: 30,
      times: ["09:00"],
    });
    const input = { medicationId: med.id, time: "09:00", day: "2026-07-06" };

    expect(await markIntake(db, userId, input)).toBe("ok");
    let [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(28);

    expect(await unmarkIntake(db, userId, input)).toBe(true);
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(30);
  });

  test("dose fracionada desconta decimal", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Rivotril",
      doseAmount: 0.5,
      doseUnit: "comp",
      stock: 10,
      times: ["21:00"],
    });

    expect(await markIntake(db, userId, { medicationId: med.id, time: "21:00", day: "2026-07-06" })).toBe("ok");
    const [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(9.5);
  });

  test("estoque menor que a dose zera e o desmarcar devolve só o que saiu", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Xarope",
      doseAmount: 5,
      doseUnit: "ml",
      stock: 3,
      times: ["09:00"],
    });
    const input = { medicationId: med.id, time: "09:00", day: "2026-07-06" };

    expect(await markIntake(db, userId, input)).toBe("ok");
    let [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(0);

    // mesmo com a dose editada depois, devolve o que a toma tirou
    await updateMedication(db, userId, med.id, { doseAmount: 10 });
    expect(await unmarkIntake(db, userId, input)).toBe(true);
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(3);
  });

  test("doses decimais repetidas não acumulam resíduo de float", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Gotas",
      doseAmount: 0.1,
      doseUnit: "ml",
      stock: 1,
      times: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"],
    });
    for (const time of med.times) {
      await markIntake(db, userId, { medicationId: med.id, time, day: "2026-07-06" });
    }
    const [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(0.4);
  });

  test("remédio inexistente: mark retorna not_found e unmark false", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const input = { medicationId: "nao-existe", time: "09:00", day: "2026-07-06" };

    expect(await markIntake(db, userId, input)).toBe("not_found");
    expect(await unmarkIntake(db, userId, input)).toBe(false);
  });
});
