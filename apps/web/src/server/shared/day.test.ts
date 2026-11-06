import { describe, expect, it, test } from "bun:test";

import { addDays, dayFor, daysBetween, weekDays } from "./day";

describe("dayFor (America/Sao_Paulo, UTC-3)", () => {
  test("02:59Z ainda é o dia anterior em SP", () => {
    expect(dayFor(new Date("2026-07-06T02:59:59Z"))).toBe("2026-07-05");
  });

  test("03:00Z já é o dia seguinte em SP", () => {
    expect(dayFor(new Date("2026-07-06T03:00:00Z"))).toBe("2026-07-06");
  });

  test("meio-dia UTC é o mesmo dia", () => {
    expect(dayFor(new Date("2026-07-06T12:00:00Z"))).toBe("2026-07-06");
  });

  test("virada de ano", () => {
    expect(dayFor(new Date("2026-01-01T01:00:00Z"))).toBe("2025-12-31");
  });
});

describe("weekDays (seg→dom)", () => {
  it("quarta 2026-07-15 → seg..dom da semana", () => {
    expect(weekDays("2026-07-15")).toEqual([
      "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19",
    ]);
  });
  it("domingo pertence à semana da segunda anterior", () => {
    expect(weekDays("2026-07-19")[0]).toBe("2026-07-13");
    expect(weekDays("2026-07-19")[6]).toBe("2026-07-19");
  });
  it("segunda é o primeiro dia", () => {
    expect(weekDays("2026-07-13")[0]).toBe("2026-07-13");
  });
});

describe("addDays / daysBetween", () => {
  test("addDays atravessa a virada de ano", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  test("addDays negativo volta para o fim de fevereiro", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  test("daysBetween conta to - from em dias", () => {
    expect(daysBetween("2026-10-28", "2026-11-05")).toBe(8);
    expect(daysBetween("2026-11-05", "2026-10-28")).toBe(-8);
  });
});
