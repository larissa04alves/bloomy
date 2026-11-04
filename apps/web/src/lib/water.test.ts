import { describe, expect, it, test } from "bun:test";

import { parseKg, recommendedWaterMl, waterSubtitle } from "./water";

describe("recommendedWaterMl", () => {
  test("35 ml por kg, arredondado de 100 em 100", () => {
    expect(recommendedWaterMl(62)).toBe(2200); // 2170
    expect(recommendedWaterMl(70)).toBe(2500); // 2450
  });

  test("respeita a faixa da meta de água", () => {
    expect(recommendedWaterMl(10)).toBe(500);
    expect(recommendedWaterMl(200)).toBe(5000);
  });
});

describe("parseKg", () => {
  it("aceita vírgula ou ponto com uma casa", () => {
    expect(parseKg("62,5")).toBe(62.5);
    expect(parseKg("62.5")).toBe(62.5);
    expect(parseKg(" 70 ")).toBe(70);
  });
  it("vazio ou inválido vira null", () => {
    expect(parseKg("")).toBeNull();
    expect(parseKg("abc")).toBeNull();
    expect(parseKg("62,55")).toBeNull();
  });
});

describe("waterSubtitle", () => {
  it("na recomendada, só avisa de onde veio", () => {
    expect(waterSubtitle(2200, 2200)).toEqual({
      text: "Recomendado para o seu peso.",
      restore: false,
    });
  });
  it("fora da recomendada, mostra o valor e oferece restaurar", () => {
    expect(waterSubtitle(2500, 2200)).toEqual({ text: "Recomendado: 2.200 ml", restore: true });
  });
  it("sem recomendação, fica o subtítulo de sempre", () => {
    expect(waterSubtitle(2000, null)).toEqual({
      text: "A gente conta as porções ao longo do dia.",
      restore: false,
    });
  });
});
