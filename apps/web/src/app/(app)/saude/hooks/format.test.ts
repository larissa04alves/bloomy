import { describe, expect, test } from "bun:test";

import {
  byCompletedDesc,
  dayMonth,
  examStatusTone,
  frequencyLabel,
  hourLabel,
  monthShort,
  relativeDays,
  sortByWhen,
  weekdayDay,
} from "./format";

const NOW = new Date("2026-07-16T12:00:00");

describe("relativeDays", () => {
  test("hoje", () => {
    expect(relativeDays("2026-07-16T20:00:00", NOW)).toBe("hoje");
  });
  test("passado vira hoje (não negativo)", () => {
    expect(relativeDays("2026-07-10T20:00:00", NOW)).toBe("hoje");
  });
  test("amanhã", () => {
    expect(relativeDays("2026-07-17T09:00:00", NOW)).toBe("amanhã");
  });
  test("em N dias", () => {
    expect(relativeDays("2026-07-19T09:00:00", NOW)).toBe("em 3 dias");
  });
  test("em N semanas a partir de 14 dias", () => {
    expect(relativeDays("2026-08-06T09:00:00", NOW)).toBe("em 3 semanas");
  });
});

test("monthShort", () => {
  expect(monthShort("2026-07-16T00:00:00")).toBe("jul");
  expect(monthShort("2026-01-02T00:00:00")).toBe("jan");
});

test("weekdayDay", () => {
  // 2026-07-16 é quinta
  expect(weekdayDay("2026-07-16T00:00:00")).toBe("qui, 16");
});

test("hourLabel", () => {
  expect(hourLabel("2026-07-16T14:00:00")).toBe("14h");
  expect(hourLabel("2026-07-16T14:30:00")).toBe("14h30");
});

test("dayMonth", () => {
  expect(dayMonth("2026-07-05T00:00:00")).toBe("05/07");
});

test("frequencyLabel", () => {
  expect(frequencyLabel(["09:00"])).toBe("1x ao dia · 09:00");
  expect(frequencyLabel(["08:00", "20:00"])).toBe("2x ao dia · 08:00, 20:00");
});

test("examStatusTone", () => {
  expect(examStatusTone("to_schedule")).toBe("text-coral");
  expect(examStatusTone("scheduled")).toBe("text-lilac-deep");
  expect(examStatusTone("result_available")).toBe("text-green-deep");
  expect(examStatusTone("completed")).toBe("text-ink-read");
});

test("sortByWhen: to_schedule (null scheduledAt) vai pro fim, usa suggestedAt", () => {
  const items = [
    { id: "a", scheduledAt: null, suggestedAt: "2026-08-01T00:00:00" },
    { id: "b", scheduledAt: "2026-07-20T00:00:00", suggestedAt: null },
    { id: "c", scheduledAt: "2026-07-18T00:00:00", suggestedAt: null },
  ];
  expect(sortByWhen(items).map((x) => x.id)).toEqual(["c", "b", "a"]);
});

test("byCompletedDesc: mais recente primeiro", () => {
  const items = [
    { id: "a", completedAt: "2026-07-01T00:00:00" },
    { id: "b", completedAt: "2026-07-10T00:00:00" },
    { id: "c", completedAt: null },
  ];
  expect(byCompletedDesc(items).map((x) => x.id)).toEqual(["b", "a", "c"]);
});
