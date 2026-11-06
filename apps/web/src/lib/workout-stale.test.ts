import { describe, expect, test } from "bun:test";

import { isStale, lastActivityAt, STALE_AFTER_MS } from "./workout-stale";

const at = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00-03:00`);

describe("lastActivityAt", () => {
  test("sem série concluída, vale o início", () => {
    expect(lastActivityAt(at("18:00"), [null, null])).toEqual(at("18:00"));
  });

  test("a série concluída mais recente", () => {
    expect(lastActivityAt(at("18:00"), [at("18:20"), null, at("18:40"), at("18:30")])).toEqual(at("18:40"));
  });
});

describe("isStale", () => {
  test("parado a partir de 2 horas", () => {
    expect(STALE_AFTER_MS).toBe(2 * 60 * 60 * 1000);
    expect(isStale(at("18:40"), at("20:39"))).toBe(false);
    expect(isStale(at("18:40"), at("20:40"))).toBe(true);
  });
});
