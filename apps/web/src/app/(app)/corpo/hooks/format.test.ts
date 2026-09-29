import { describe, expect, it } from "bun:test";

import { formatMealItems, toMealItems, waterLevel, waterShortcuts } from "./format";

describe("waterLevel", () => {
  it("é a fração da meta já bebida", () => {
    expect(waterLevel(600, 1500)).toBeCloseTo(0.4);
  });
  it("para em cheia quando passa da meta", () => {
    expect(waterLevel(2100, 1500)).toBe(1);
  });
  it("dia zerado ou meta inválida ficam vazios", () => {
    expect(waterLevel(0, 1500)).toBe(0);
    expect(waterLevel(500, 0)).toBe(0);
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

describe("formatMealItems", () => {
  it("junta os itens com · e mostra gramas só quando há", () => {
    expect(
      formatMealItems([
        { name: "Arroz", grams: 150 },
        { name: "Feijão", grams: null },
        { name: "Frango grelhado", grams: 120 },
      ]),
    ).toBe("Arroz 150 g · Feijão · Frango grelhado 120 g");
  });
});

describe("toMealItems", () => {
  it("apara nomes, descarta linha sem nome e trata gramas vazia ou zero como sem gramas", () => {
    expect(
      toMealItems([
        { name: " Arroz ", grams: "150" },
        { name: "", grams: "80" },
        { name: "Feijão", grams: "" },
        { name: "Ovo", grams: "0" },
      ]),
    ).toEqual([
      { name: "Arroz", grams: 150 },
      { name: "Feijão", grams: null },
      { name: "Ovo", grams: null },
    ]);
  });
});
