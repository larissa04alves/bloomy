import { describe, expect, test } from "bun:test";

import { dayFor } from "./day";

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
