import { describe, expect, it } from "bun:test";

import { portions } from "./units";

describe("portions", () => {
  it("deriva porções feitas e alvo a partir de ml", () => {
    expect(portions(1500, 2000, 500)).toEqual({ done: 3, target: 4 });
  });
  it("respeita porção diferente de 500", () => {
    expect(portions(1500, 2000, 250)).toEqual({ done: 6, target: 8 });
    expect(portions(600, 2000, 200)).toEqual({ done: 3, target: 10 });
  });
  it("nunca passa do alvo e arredonda", () => {
    expect(portions(2200, 2000, 500)).toEqual({ done: 4, target: 4 });
  });
  it("alvo mínimo 1 mesmo com meta 0", () => {
    expect(portions(0, 0, 500)).toEqual({ done: 0, target: 1 });
  });
  it("porção 0 cai no default em vez de virar Infinity", () => {
    expect(portions(1500, 2000, 0)).toEqual({ done: 3, target: 4 });
  });
});
