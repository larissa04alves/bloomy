import { describe, expect, test } from "bun:test";

import { isStale, lastActivityAt, STALE_AFTER_MS, staleChoiceCopy } from "./workout-stale";

const at = (hhmm: string) => new Date(`2026-11-06T${hhmm}:00-03:00`);

describe("lastActivityAt", () => {
  test("sem série concluída, vale o início", () => {
    expect(lastActivityAt(at("18:00"), [null, null])).toEqual(at("18:00"));
  });

  test("a série concluída mais recente", () => {
    expect(lastActivityAt(at("18:00"), [at("18:20"), null, at("18:40"), at("18:30")])).toEqual(at("18:40"));
  });
});

describe("isStale", () => {
  test("parado a partir de 2 horas", () => {
    expect(STALE_AFTER_MS).toBe(2 * 60 * 60 * 1000);
    expect(isStale(at("18:40"), at("20:39"))).toBe(false);
    expect(isStale(at("18:40"), at("20:40"))).toBe(true);
  });
});

describe("staleChoiceCopy", () => {
  test("mesmo dia: só o horário", () => {
    expect(staleChoiceCopy(at("18:40"), at("21:10"))).toEqual({
      title: "Treino parado desde 18:40",
      endLabel: "Concluir às 18:40",
      body: "Nenhuma série foi concluída depois das 18:40. Concluir nesse horário deixa a duração do treino sem as horas paradas.",
    });
  });

  test("ontem e dias antes levam o dia", () => {
    const yesterday = new Date("2026-11-05T18:40:00-03:00");
    expect(staleChoiceCopy(yesterday, at("09:00"))).toMatchObject({
      title: "Treino parado desde ontem, 18:40",
      endLabel: "Concluir ontem às 18:40",
    });
    const older = new Date("2026-11-03T07:05:00-03:00");
    expect(staleChoiceCopy(older, at("09:00"))).toMatchObject({
      title: "Treino parado desde 3/11, 07:05",
      endLabel: "Concluir em 3/11 às 07:05",
    });
  });
});
