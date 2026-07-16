import { describe, expect, it } from "bun:test";

import { MOOD_ORDER, relativeDay, timeOf, weekSentence } from "./mente-helpers";

describe("MOOD_ORDER", () => {
  it("vai do pior ao melhor humor, 5 valores", () => {
    expect(MOOD_ORDER).toEqual(["sad", "meh", "neutral", "good", "great"]);
  });
});

describe("relativeDay", () => {
  it("hoje → 'Hoje'", () => {
    expect(relativeDay("2026-07-15", "2026-07-15")).toBe("Hoje");
  });
  it("ontem → 'Ontem'", () => {
    expect(relativeDay("2026-07-14", "2026-07-15")).toBe("Ontem");
  });
  it("2–6 dias atrás → dia da semana capitalizado", () => {
    expect(relativeDay("2026-07-11", "2026-07-15")).toBe("Sábado");
  });
  it("≥7 dias atrás → data curta 'dd mês'", () => {
    expect(relativeDay("2026-07-02", "2026-07-15")).toBe("2 jul");
  });
});

describe("timeOf", () => {
  it("converte ISO UTC para HH:mm no fuso BR (UTC-3)", () => {
    expect(timeOf("2026-07-15T17:32:00.000Z")).toBe("14:32");
  });
});

describe("weekSentence", () => {
  const wk = (moods: (string | null)[]) =>
    moods.map((m, i) => ({ day: `2026-07-1${i}`, mood: m })) as any;
  it("sem humor → convite", () => {
    expect(weekSentence(wk([null, null, null, null, null, null, null]))).toContain("aparecer aqui");
  });
  it("um dia só → começando", () => {
    expect(weekSentence(wk(["good", null, null, null, null, null, null]))).toContain("no seu ritmo");
  });
  it("mais leves que pesados", () => {
    expect(weekSentence(wk(["good", "great", "good", "sad", null, null, null]))).toContain("leves que pesados");
  });
  it("mais pesados → acolhe", () => {
    expect(weekSentence(wk(["sad", "meh", "sad", "good", null, null, null]))).toContain("tá tudo bem");
  });
  it("empate → altos e baixos", () => {
    expect(weekSentence(wk(["good", "sad", "neutral", null, null, null, null]))).toContain("altos e baixos");
  });
});
