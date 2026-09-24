import { describe, expect, it } from "bun:test";

import { dropFill, waterShortcuts } from "./format";

describe("dropFill", () => {
  it("enche a gota em fração da porção", () => {
    // porção de 1 L, 200 ml registrados: 1/5 da primeira gota
    expect(dropFill(200, 1000, 0)).toBeCloseTo(0.2);
    expect(dropFill(200, 1000, 1)).toBe(0);
  });
  it("gotas anteriores ficam cheias e a seguinte recebe o resto", () => {
    expect(dropFill(1500, 1000, 0)).toBe(1);
    expect(dropFill(1500, 1000, 1)).toBeCloseTo(0.5);
    expect(dropFill(1500, 1000, 2)).toBe(0);
  });
  it("não passa de cheia quando o total estoura a meta", () => {
    expect(dropFill(9000, 1000, 3)).toBe(1);
  });
  it("porção inválida não vira NaN", () => {
    expect(dropFill(500, 0, 0)).toBe(1);
  });
});

describe("waterShortcuts", () => {
  it("oferece os tamanhos comuns até 1 L, em ordem", () => {
    expect(waterShortcuts(500)).toEqual([200, 250, 500, 750, 1000]);
  });
  it("não repete o chip quando a porção da meta já é um preset", () => {
    expect(waterShortcuts(750)).toEqual([200, 250, 500, 750, 1000]);
  });
  it("insere a porção da meta fora dos presets, na ordem", () => {
    expect(waterShortcuts(1200)).toEqual([200, 250, 500, 750, 1000, 1200]);
    expect(waterShortcuts(300)).toEqual([200, 250, 300, 500, 750, 1000]);
  });
  it("ignora porção zerada", () => {
    expect(waterShortcuts(0)).toEqual([200, 250, 500, 750, 1000]);
  });
});
