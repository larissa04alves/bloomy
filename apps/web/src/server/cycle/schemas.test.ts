import { describe, expect, test } from "bun:test";

import { addDays, dayFor } from "@/server/shared/day";
import { DAY_BODY_SCHEMA, METHOD_SCHEMA, METHOD_UPDATE_SCHEMA } from "./schemas";

const ok = (v: unknown) => METHOD_SCHEMA.safeParse(v).success;
const pill = (extra: object) => ({
  kind: "pill",
  activeDays: 21,
  pauseEvery: 4,
  pillTime: "21:00",
  currentUnitStart: dayFor(),
  currentUnit: 3,
  ...extra,
});

describe("METHOD_SCHEMA", () => {
  test("recusa lastPeriodStart e currentUnitStart no futuro", () => {
    const tomorrow = addDays(dayFor(), 1);
    expect(ok({ kind: "none", lastPeriodStart: dayFor(), usualLength: 28 })).toBe(true);
    expect(ok({ kind: "none", lastPeriodStart: tomorrow, usualLength: 28 })).toBe(false);
    expect(ok(pill({}))).toBe(true);
    expect(ok(pill({ currentUnitStart: tomorrow }))).toBe(false);
    expect(
      ok({ kind: "ring", pauseEvery: 1, pauseDays: 7, currentUnitStart: tomorrow, currentUnit: 1 }),
    ).toBe(false);
  });

  test("pílula com pausa exige a posição na sequência; sem pausa não", () => {
    expect(ok(pill({ currentUnitStart: undefined }))).toBe(false);
    expect(ok(pill({ currentUnit: 5 }))).toBe(false);
    expect(ok({ kind: "pill", activeDays: 21, pillTime: "08:00" })).toBe(true);
  });

  test("pílula sem pausa recusa campos de pausa soltos", () => {
    const continuous = { kind: "pill", activeDays: 21, pillTime: "08:00" };
    expect(ok({ ...continuous, pauseDays: 7 })).toBe(false);
    expect(ok({ ...continuous, currentUnit: 1, currentUnitStart: dayFor() })).toBe(false);
    expect(METHOD_UPDATE_SCHEMA.safeParse({ ...continuous, pauseDays: 7 }).success).toBe(false);
  });

  test("comprimidos ativos por cartela: inteiro de 10 a 60", () => {
    expect(ok(pill({ activeDays: 10 }))).toBe(true);
    expect(ok(pill({ activeDays: 31, currentUnit: 1 }))).toBe(true);
    expect(ok(pill({ activeDays: 60 }))).toBe(true);
    expect(ok(pill({ activeDays: 9 }))).toBe(false);
    expect(ok(pill({ activeDays: 61 }))).toBe(false);
    expect(ok(pill({ activeDays: 21.5 }))).toBe(false);
    expect(ok(pill({ activeDays: undefined }))).toBe(false);
  });

  test("pausa de 0 dias é recusada", () => {
    expect(ok(pill({ pauseDays: 1 }))).toBe(true);
    expect(ok(pill({ pauseDays: 0 }))).toBe(false);
    expect(ok({ kind: "ring", pauseEvery: 1, pauseDays: 0, currentUnitStart: dayFor(), currentUnit: 1 })).toBe(false);
    expect(METHOD_UPDATE_SCHEMA.safeParse({ kind: "ring", pauseEvery: 1, pauseDays: 0 }).success).toBe(false);
  });
});

describe("METHOD_UPDATE_SCHEMA", () => {
  const okUpdate = (v: unknown) => METHOD_UPDATE_SCHEMA.safeParse(v).success;

  test("posição é opcional; configuração continua exigida", () => {
    expect(okUpdate({ kind: "none", usualLength: 28 })).toBe(true);
    expect(okUpdate({ kind: "none" })).toBe(false);
    expect(okUpdate(pill({ currentUnitStart: undefined, currentUnit: undefined }))).toBe(true);
    expect(okUpdate(pill({ pauseEvery: undefined, currentUnitStart: undefined, currentUnit: undefined }))).toBe(true);
    expect(okUpdate(pill({ activeDays: undefined, currentUnitStart: undefined, currentUnit: undefined }))).toBe(false);
    expect(okUpdate({ kind: "ring", pauseEvery: 1, pauseDays: 7 })).toBe(true);
    expect(okUpdate(pill({ currentUnitStart: addDays(dayFor(), 1) }))).toBe(false);
  });
});

test("sintomas validam ids, não rótulos", () => {
  expect(DAY_BODY_SCHEMA.safeParse({ flow: "light", symptoms: ["cramps"] }).success).toBe(true);
  expect(DAY_BODY_SCHEMA.safeParse({ flow: "light", symptoms: ["Cólica"] }).success).toBe(false);
});
