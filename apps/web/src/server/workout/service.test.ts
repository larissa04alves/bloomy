import { describe, expect, test } from "bun:test";

import { summarizeWorkouts } from "./service";

describe("summarizeWorkouts (streak de dias, pura)", () => {
  const now = new Date("2026-07-08T12:00:00Z"); // quarta; semana começa 2026-07-06 (seg)

  test("dias consecutivos terminando hoje", () => {
    const days = ["2026-07-06", "2026-07-07", "2026-07-08"];
    const r = summarizeWorkouts(days, now);
    expect(r.weekCount).toBe(3);
    expect(r.streak).toBe(3);
    expect(r.weekDays.filter(Boolean)).toHaveLength(3);
  });

  test("não treinou hoje, mas ontem sim: streak conta até ontem (dia em curso não quebra)", () => {
    const days = ["2026-07-06", "2026-07-07"]; // hoje (08) sem treino
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(2);
  });

  test("buraco na sequência quebra o streak", () => {
    const days = ["2026-07-04", "2026-07-06", "2026-07-07", "2026-07-08"]; // 05 faltou
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(3); // 06, 07, 08
  });

  test("sem treino recente: streak zero", () => {
    const days = ["2026-07-01"];
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(0);
  });
});
