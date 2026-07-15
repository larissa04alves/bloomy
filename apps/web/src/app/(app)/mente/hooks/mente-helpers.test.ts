import { describe, expect, it } from "bun:test";

import type { Checkin } from "@/lib/api-types";

import { MOOD_ORDER, mergeCheckin, notesOnly, relativeDay } from "./mente-helpers";

function mk(day: string, over: Partial<Checkin> = {}): Checkin {
  return {
    id: day,
    day,
    mood: "good",
    anxiety: 30,
    note: "nota",
    createdAt: `${day}T12:00:00.000Z`,
    updatedAt: `${day}T12:00:00.000Z`,
    ...over,
  };
}

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
    // 2026-07-11 é um sábado
    expect(relativeDay("2026-07-11", "2026-07-15")).toBe("Sábado");
  });
  it("≥7 dias atrás → data curta 'dd mês'", () => {
    expect(relativeDay("2026-07-02", "2026-07-15")).toBe("2 jul");
  });
});

describe("notesOnly", () => {
  it("mantém só entradas com nota não-vazia (trim)", () => {
    const list = [mk("2026-07-15"), mk("2026-07-14", { note: "   " }), mk("2026-07-13", { note: null })];
    expect(notesOnly(list).map((c) => c.day)).toEqual(["2026-07-15"]);
  });
});

describe("mergeCheckin", () => {
  it("substitui a entrada do mesmo dia", () => {
    const list = [mk("2026-07-15", { note: "antiga" })];
    const merged = mergeCheckin(list, mk("2026-07-15", { note: "nova" }));
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe("nova");
  });
  it("insere no topo (desc) quando o dia é novo", () => {
    const list = [mk("2026-07-14")];
    const merged = mergeCheckin(list, mk("2026-07-15"));
    expect(merged.map((c) => c.day)).toEqual(["2026-07-15", "2026-07-14"]);
  });
});
