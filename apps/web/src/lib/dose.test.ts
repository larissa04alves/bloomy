import { describe, expect, it } from "bun:test";

import {
  formatDose,
  formatQuantity,
  hasAtMostDecimals,
  parseQuantity,
  sanitizeQuantity,
} from "./dose";

describe("formatDose", () => {
  it("concorda a unidade com a quantidade", () => {
    expect(formatDose(1, "capsula")).toBe("1 cápsula");
    expect(formatDose(2, "capsula")).toBe("2 cápsulas");
    expect(formatDose(1, "scoop")).toBe("1 scoop");
    expect(formatDose(20, "gotas")).toBe("20 gotas");
    expect(formatDose(1, "gotas")).toBe("1 gota");
  });
  it("abreviação e medida não variam", () => {
    expect(formatDose(2, "comp")).toBe("2 comp.");
    expect(formatDose(5, "g")).toBe("5 g");
    expect(formatDose(500, "mg")).toBe("500 mg");
  });
  it("decimal com vírgula; fração abaixo de 2 fica no singular", () => {
    expect(formatDose(0.5, "comp")).toBe("0,5 comp.");
    expect(formatDose(2.5, "ml")).toBe("2,5 ml");
    expect(formatDose(1.5, "capsula")).toBe("1,5 cápsula");
  });
});

describe("formatQuantity", () => {
  it("usa vírgula e corta zeros", () => {
    expect(formatQuantity(9.5)).toBe("9,5");
    expect(formatQuantity(30)).toBe("30");
    expect(formatQuantity(0.25)).toBe("0,25");
  });
  it("sem separador de milhar: 1000 volta como 1000", () => {
    expect(formatQuantity(1000)).toBe("1000");
    expect(parseQuantity(formatQuantity(12500))).toBe(12500);
  });
  it("ida e volta pelo input não perde precisão (125 mcg = 0,125 mg)", () => {
    expect(parseQuantity(formatQuantity(0.125))).toBe(0.125);
  });
});

describe("parseQuantity / sanitizeQuantity", () => {
  it("aceita vírgula decimal", () => {
    expect(parseQuantity("2,5")).toBe(2.5);
    expect(parseQuantity("10")).toBe(10);
    expect(parseQuantity("")).toBeNull();
  });
  it("limpa o que não é número e mantém uma vírgula só", () => {
    expect(sanitizeQuantity("2.5")).toBe("2,5");
    expect(sanitizeQuantity("1,2,3")).toBe("1,23");
    expect(sanitizeQuantity("3 comp")).toBe("3");
    expect(sanitizeQuantity("0,1256")).toBe("0,125");
  });
});

describe("hasAtMostDecimals", () => {
  it("aceita até 3 casas, recusa mais", () => {
    expect(hasAtMostDecimals(0.125)).toBe(true);
    expect(hasAtMostDecimals(30)).toBe(true);
    expect(hasAtMostDecimals(0.00006)).toBe(false);
    expect(hasAtMostDecimals(0.1255)).toBe(false);
  });
});
