import { describe, expect, it } from "bun:test";

import {
  latestWeightKg,
  metaLabel,
  typedWeightGrams,
  waterRecommendation,
  weightFieldError,
} from "./format";

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

describe("latestWeightKg", () => {
  it("sem pesagem não há peso", () => {
    expect(latestWeightKg([])).toBeNull();
  });
  it("usa a pesagem do dia mais recente, em kg", () => {
    expect(
      latestWeightKg([
        { day: "2026-10-01", grams: 64_000 },
        { day: "2026-11-02", grams: 62_000 },
      ]),
    ).toBe(62);
  });
});

describe("typedWeightGrams", () => {
  it("converte o peso digitado para gramas", () => {
    expect(typedWeightGrams("62,5")).toBe(62_500);
  });
  it("vazio, inválido ou fora da faixa não vale", () => {
    expect(typedWeightGrams("")).toBeNull();
    expect(typedWeightGrams("abc")).toBeNull();
    expect(typedWeightGrams("19")).toBeNull();
    expect(typedWeightGrams("301")).toBeNull();
  });
});

describe("waterRecommendation", () => {
  it("com pesagem, recomenda pela última", () => {
    expect(waterRecommendation(70, "")).toBe(2500);
  });
  it("sem pesagem, recomenda pelo peso digitado", () => {
    expect(waterRecommendation(null, "62")).toBe(2200);
  });
  it("sem nenhum peso válido, não recomenda", () => {
    expect(waterRecommendation(null, "")).toBeNull();
    expect(waterRecommendation(null, "5")).toBeNull();
  });
});

describe("weightFieldError", () => {
  it("enquanto digita não acusa erro", () => {
    expect(weightFieldError("6", false)).toBeUndefined();
  });
  it("depois de sair do campo, acusa peso fora da faixa", () => {
    expect(weightFieldError("6", true)).toBe("Peso entre 20 e 300 kg");
  });
  it("vazio ou válido nunca é erro", () => {
    expect(weightFieldError("", true)).toBeUndefined();
    expect(weightFieldError("62,5", true)).toBeUndefined();
  });
});
