import { describe, expect, it } from "bun:test";

import { dropSize, waterShortcuts } from "./format";

describe("dropSize", () => {
  it("gota grande quando a porção é grande (poucas gotas)", () => {
    expect(dropSize(1)).toBe(44);
    expect(dropSize(4)).toBe(44);
  });
  it("encolhe por faixa conforme a fileira cresce", () => {
    expect(dropSize(5)).toBe(40);
    expect(dropSize(6)).toBe(40);
    expect(dropSize(7)).toBe(34);
    expect(dropSize(8)).toBe(34);
  });
  it("para de encolher no piso de legibilidade", () => {
    expect(dropSize(9)).toBe(30);
    expect(dropSize(12)).toBe(30);
    expect(dropSize(40)).toBe(30);
  });
  it("nunca desce do maior tamanho com meta degenerada", () => {
    // `portions()` já garante alvo mínimo 1, mas a gota não deve depender disso.
    expect(dropSize(0)).toBe(44);
  });
});

describe("waterShortcuts", () => {
  it("oferece os tamanhos comuns até 1 L, em ordem", () => {
    expect(waterShortcuts(500)).toEqual([200, 250, 500, 750]);
  });
  it("não repete o chip quando a porção da meta já é um preset", () => {
    expect(waterShortcuts(750)).toEqual([200, 250, 500, 750]);
  });
  it("insere a porção da meta fora dos presets, na ordem", () => {
    expect(waterShortcuts(1200)).toEqual([200, 250, 500, 750, 1200]);
    expect(waterShortcuts(300)).toEqual([200, 250, 300, 500, 750]);
  });
  it("ignora porção zerada", () => {
    expect(waterShortcuts(0)).toEqual([200, 250, 500, 750]);
  });
});
