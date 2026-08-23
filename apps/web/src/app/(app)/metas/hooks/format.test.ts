import { describe, expect, it } from "bun:test";

import { metaLabel, portionHint } from "./format";

describe("metaLabel", () => {
  it("hidratação fala em ml por dia", () => {
    expect(metaLabel("water", 2000)).toBe("2000 ml por dia");
  });
  it("refeições concordam em número", () => {
    expect(metaLabel("meals", 1)).toBe("1 refeição por dia");
    expect(metaLabel("meals", 3)).toBe("3 refeições por dia");
  });
  it("treino fala em dias por semana", () => {
    expect(metaLabel("workout", 1)).toBe("1 dia por semana");
    expect(metaLabel("workout", 4)).toBe("4 dias por semana");
  });
});

describe("portionHint", () => {
  it("divide a meta pela porção", () => {
    expect(portionHint(2000, 500)).toBe("≈ 4 porções por dia");
    expect(portionHint(2000, 250)).toBe("≈ 8 porções por dia");
  });
  it("usa o singular quando a meta cabe numa porção", () => {
    expect(portionHint(500, 500)).toBe("≈ 1 porção por dia");
  });
  it("nunca desce de 1 porção", () => {
    expect(portionHint(100, 1000)).toBe("≈ 1 porção por dia");
  });
});
