import { describe, expect, it } from "bun:test";

import { formatDuration, mmss } from "./format";

describe("mmss", () => {
  it("formata segundos como M:SS", () => {
    expect(mmss(372)).toBe("6:12");
    expect(mmss(45)).toBe("0:45");
    expect(mmss(0)).toBe("0:00");
  });
  it("nunca fica negativo", () => {
    expect(mmss(-5)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("mostra minutos abaixo de 1h", () => {
    expect(formatDuration(1920)).toBe("32 min");
  });
  it("mostra horas e minutos acima de 1h", () => {
    expect(formatDuration(3900)).toBe("1h 05");
  });
});
