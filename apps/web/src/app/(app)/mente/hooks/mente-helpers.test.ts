import { describe, expect, it } from "bun:test";

import { MOOD_ORDER, relativeDay, timeOf } from "./mente-helpers";

describe("MOOD_ORDER", () => {
  it("vai do pior ao melhor humor, 5 valores", () => {
    expect(MOOD_ORDER).toEqual(["sad", "meh", "neutral", "good", "great"]);
  });
});

describe("relativeDay", () => {
  it("hoje → 'Hoje'", () => {
    expect(relativeDay("2026-07-15", "2026-07-15")).toBe("Hoje");
  });
  it("ontem → 'Ontem'", () => {
    expect(relativeDay("2026-07-14", "2026-07-15")).toBe("Ontem");
  });
  it("2–6 dias atrás → dia da semana capitalizado", () => {
    expect(relativeDay("2026-07-11", "2026-07-15")).toBe("Sábado");
  });
  it("≥7 dias atrás → data curta 'dd mês'", () => {
    expect(relativeDay("2026-07-02", "2026-07-15")).toBe("2 jul");
  });
});

describe("timeOf", () => {
  it("converte ISO UTC para HH:mm no fuso BR (UTC-3)", () => {
    expect(timeOf("2026-07-15T17:32:00.000Z")).toBe("14:32");
  });
});
