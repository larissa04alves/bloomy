import { describe, expect, it } from "bun:test";

import { garrafas } from "./garrafas";

describe("garrafas", () => {
  it("deriva garrafas feitas e alvo a partir de ml (500 ml/garrafa)", () => {
    expect(garrafas(1500, 2000)).toEqual({ done: 3, target: 4 });
  });
  it("nunca passa do alvo e arredonda", () => {
    expect(garrafas(2200, 2000)).toEqual({ done: 4, target: 4 });
  });
  it("alvo mínimo 1 mesmo com meta 0", () => {
    expect(garrafas(0, 0)).toEqual({ done: 0, target: 1 });
  });
});
