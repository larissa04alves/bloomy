import { describe, expect, test } from "bun:test";

import {
  bleedEvents,
  continuousSummary,
  deducePeriods,
  naturalPrediction,
  pauseStartRange,
  pillPosition,
  pillSequences,
  type ScheduledMethod,
} from "./calc";

describe("deducePeriods", () => {
  test("um dia sem sangramento no meio não separa a menstruação", () => {
    expect(
      deducePeriods([
        { day: "2026-10-28", flow: "medium" },
        { day: "2026-10-29", flow: "light" },
        { day: "2026-10-31", flow: "light" },
      ]),
    ).toEqual([{ start: "2026-10-28", end: "2026-10-31" }]);
  });

  test("dois dias sem sangramento separam em duas menstruações", () => {
    expect(
      deducePeriods([
        { day: "2026-11-04", flow: "light" },
        { day: "2026-11-01", flow: "light" },
      ]),
    ).toEqual([
      { start: "2026-11-01", end: "2026-11-01" },
      { start: "2026-11-04", end: "2026-11-04" },
    ]);
  });

  test("escape não conta como menstruação", () => {
    expect(deducePeriods([{ day: "2026-11-02", flow: "spotting" }])).toEqual([]);
  });

  test("dia sem fluxo não conta como menstruação", () => {
    expect(deducePeriods([{ day: "2026-11-02", flow: "none" }])).toEqual([]);
  });

  test("menstruação que cruza a virada do ano é uma só", () => {
    expect(
      deducePeriods([
        { day: "2026-12-30", flow: "heavy" },
        { day: "2026-12-31", flow: "medium" },
        { day: "2027-01-02", flow: "light" },
      ]),
    ).toEqual([{ start: "2026-12-30", end: "2027-01-02" }]);
  });
});

describe("naturalPrediction", () => {
  test("só o início informado usa a duração habitual e margem ±2", () => {
    const r = naturalPrediction({ starts: ["2026-10-28"], usualLength: 28, today: "2026-11-05" });
    expect(r.cycleDay).toBe(9);
    expect(r.avgLength).toBe(28);
    expect(r.window).toEqual({ from: "2026-11-23", to: "2026-11-27" });
    expect(r.lateDays).toBe(0);
    expect(r.avgPeriodLength).toBeNull();
  });

  const starts = ["2026-08-03", "2026-09-01", "2026-09-29", "2026-10-28"];

  test("com ciclos completos usa a média arredondada e margem pelo desvio padrão", () => {
    const r = naturalPrediction({ starts, usualLength: 28, today: "2026-11-05" });
    expect(r.avgLength).toBe(29);
    expect(r.window).toEqual({ from: "2026-11-25", to: "2026-11-27" });
    expect(r.lateDays).toBe(0);
  });

  test("atraso conta a partir do fim da janela", () => {
    expect(naturalPrediction({ starts, usualLength: 28, today: "2026-11-30" }).lateDays).toBe(3);
  });

  test("um único ciclo completo ainda usa a duração habitual", () => {
    const r = naturalPrediction({ starts: ["2026-09-29", "2026-10-28"], usualLength: 30, today: "2026-11-05" });
    expect(r.avgLength).toBe(30);
    expect(r.window).toEqual({ from: "2026-11-25", to: "2026-11-29" });
  });

  test("considera só os últimos 6 ciclos", () => {
    const r = naturalPrediction({
      starts: ["2026-01-01", "2026-03-02", "2026-03-30", "2026-04-27", "2026-05-25", "2026-06-22", "2026-07-20", "2026-08-17"],
      usualLength: 28,
      today: "2026-08-20",
    });
    expect(r.avgLength).toBe(28);
  });

  test("margem nunca passa de 4", () => {
    const r = naturalPrediction({
      starts: ["2026-06-01", "2026-06-21", "2026-07-31", "2026-08-20"],
      usualLength: 28,
      today: "2026-08-21",
    });
    expect(r.avgLength).toBe(27);
    expect(r.window).toEqual({ from: "2026-09-12", to: "2026-09-20" });
  });

  test("duração média da menstruação vem dos períodos informados", () => {
    const r = naturalPrediction({
      starts,
      usualLength: 28,
      today: "2026-11-05",
      periods: [
        { start: "2026-09-29", end: "2026-10-03" },
        { start: "2026-10-28", end: "2026-11-01" },
        { start: "2026-08-03", end: "2026-08-08" },
      ],
    });
    expect(r.avgPeriodLength).toBe(5);
  });
});

describe("pillPosition", () => {
  const method: ScheduledMethod = { sequenceStart: "2026-09-10", activeDays: 21, pauseEvery: 4, pauseDays: 7 };

  test("caso dela: 3ª cartela, comprimido 15, pausa em dezembro", () => {
    expect(pillPosition(method, [], "2026-11-05")).toEqual({
      phase: "active",
      unit: 3,
      units: 4,
      pill: 15,
      pauseDay: null,
      nextPause: { from: "2026-12-03", to: "2026-12-09" },
    });
  });

  test("posição é pelo calendário: 3º dia da pausa", () => {
    const r = pillPosition(method, [], "2026-12-05");
    expect(r.phase).toBe("pause");
    expect(r.pauseDay).toBe(3);
    expect(r.unit).toBe(4);
    expect(r.pill).toBe(21);
  });

  test("a sequência seguinte começa no dia após a pausa", () => {
    const r = pillPosition(method, [], "2026-12-10");
    expect(r).toMatchObject({ phase: "active", unit: 1, pill: 1, nextPause: { from: "2027-03-04", to: "2027-03-10" } });
  });

  test("'comecei a pausa' reancora a pausa e a próxima sequência", () => {
    const anchors = [{ day: "2026-11-20", kind: "pause_started" as const }];
    const inPause = pillPosition(method, anchors, "2026-11-22");
    expect(inPause.phase).toBe("pause");
    expect(inPause.pauseDay).toBe(3);
    expect(inPause.nextPause).toEqual({ from: "2026-11-20", to: "2026-11-26" });

    expect(pillPosition(method, anchors, "2026-11-26").phase).toBe("pause");
    expect(pillPosition(method, anchors, "2026-11-27")).toMatchObject({ phase: "active", unit: 1, pill: 1 });
  });

  test("'emendar' antes da pausa acrescenta uma cartela", () => {
    const anchors = [{ day: "2026-12-01", kind: "pack_extended" as const }];
    const r = pillPosition(method, anchors, "2026-12-05");
    expect(r).toMatchObject({ phase: "active", unit: 5, units: 5, pill: 3 });
    expect(r.nextPause).toEqual({ from: "2026-12-24", to: "2026-12-30" });
  });

  test("'emendar' durante a pausa encerra a pausa e começa cartela nova no dia", () => {
    const anchors = [{ day: "2026-12-05", kind: "pack_extended" as const }];
    expect(pillPosition(method, anchors, "2026-12-04")).toMatchObject({ phase: "pause", pauseDay: 2 });
    const r = pillPosition(method, anchors, "2026-12-06");
    expect(r).toMatchObject({ phase: "active", unit: 5, units: 5, pill: 2 });
    expect(r.nextPause).toEqual({ from: "2026-12-26", to: "2027-01-01" });
  });

  test("antes do início da sequência responde como o primeiro dia", () => {
    expect(pillPosition(method, [], "2026-09-01")).toMatchObject({
      phase: "active",
      unit: 1,
      pill: 1,
      nextPause: { from: "2026-12-03", to: "2026-12-09" },
    });
  });

  test.each([
    ["activeDays 0", { ...method, activeDays: 0 }],
    ["pauseEvery 0", { ...method, pauseEvery: 0 }],
    ["pauseDays negativo", { ...method, pauseDays: -100 }],
  ])("configuração inválida (%s) lança erro em vez de travar", (_, invalid) => {
    expect(() => pillPosition(invalid, [], "2026-11-05")).toThrow();
  });

  test("pausa de 0 dias com 'comecei a pausa' no 1º dia de uma sequência lança erro em vez de travar", () => {
    const anchors = [{ day: "2026-12-03", kind: "pause_started" as const }];
    expect(() => pillPosition({ ...method, pauseDays: 0 }, anchors, "2026-12-10")).toThrow();
  });

  test("pausa de 1 dia com 'comecei a pausa' no 1º dia de uma sequência avança para a seguinte", () => {
    const oneDay = { ...method, pauseDays: 1 };
    const anchors = [{ day: "2026-12-04", kind: "pause_started" as const }];
    expect(pillPosition(oneDay, anchors, "2026-12-04")).toMatchObject({ phase: "pause", pauseDay: 1 });
    expect(pillPosition(oneDay, anchors, "2026-12-05")).toMatchObject({
      phase: "active",
      unit: 1,
      pill: 1,
      nextPause: { from: "2027-02-27", to: "2027-02-27" },
    });
  });
});

describe("pauseStartRange", () => {
  const method: ScheduledMethod = { sequenceStart: "2026-09-10", activeDays: 21, pauseEvery: 4, pauseDays: 7 };

  test("fase ativa: do início da cartela atual até hoje", () => {
    const position = pillPosition(method, [], "2026-11-05");
    expect(pauseStartRange(position, "2026-11-05", method.sequenceStart)).toEqual({
      min: "2026-10-22",
      max: "2026-11-05",
    });
  });

  test("fase de pausa: do início da cartela que a pausa encerrou até hoje", () => {
    const position = pillPosition(method, [], "2026-12-05");
    expect(pauseStartRange(position, "2026-12-05", method.sequenceStart)).toEqual({
      min: "2026-11-12",
      max: "2026-12-05",
    });
  });

  test("pausa reancorada no meio da 4ª cartela: começa no início dessa cartela", () => {
    const anchors = [{ day: "2026-11-20", kind: "pause_started" as const }];
    const position = pillPosition(method, anchors, "2026-11-22");
    expect(pauseStartRange(position, "2026-11-22", method.sequenceStart)).toEqual({
      min: "2026-11-12",
      max: "2026-11-22",
    });
  });

  test("não recua antes do início da sequência", () => {
    expect(
      pauseStartRange({ phase: "active", pill: 5, pauseDay: null }, "2026-09-12", method.sequenceStart),
    ).toEqual({ min: "2026-09-10", max: "2026-09-12" });
  });
});

describe("continuousSummary", () => {
  test("escape conta como último sangramento", () => {
    const r = continuousSummary(
      [
        { day: "2026-10-01", flow: "light" },
        { day: "2026-10-13", flow: "spotting" },
        { day: "2026-10-20", flow: "none" },
      ],
      "2026-11-05",
    );
    expect(r.daysSince).toBe(23);
    expect(r.lastBleed).toEqual({ day: "2026-10-13", flow: "spotting" });
    expect(r.eventsLast180).toBe(2);
  });

  test("sem registros de sangramento", () => {
    expect(continuousSummary([{ day: "2026-10-20", flow: "none" }], "2026-11-05")).toEqual({
      lastBleed: null,
      daysSince: null,
      eventsLast180: 0,
    });
  });

  test("eventos juntam falha de 1 dia e ignoram o que passou de 180 dias", () => {
    const r = continuousSummary(
      [
        { day: "2026-04-01", flow: "light" },
        { day: "2026-10-01", flow: "spotting" },
        { day: "2026-10-03", flow: "light" },
        { day: "2026-10-06", flow: "spotting" },
      ],
      "2026-11-05",
    );
    expect(r.eventsLast180).toBe(2);
  });
});

describe("pillSequences", () => {
  const method: ScheduledMethod = { sequenceStart: "2026-07-16", activeDays: 21, pauseEvery: 1, pauseDays: 7 };

  test("uma linha por sequência até a data limite, com a pausa de cada uma", () => {
    expect(pillSequences(method, [], "2026-09-01")).toEqual([
      { start: "2026-07-16", pause: { from: "2026-08-06", to: "2026-08-12" } },
      { start: "2026-08-13", pause: { from: "2026-09-03", to: "2026-09-09" } },
    ]);
  });

  test("'comecei a pausa' antecipa a pausa e a sequência seguinte", () => {
    const seqs = pillSequences(method, [{ day: "2026-08-04", kind: "pause_started" }], "2026-08-20");
    expect(seqs).toEqual([
      { start: "2026-07-16", pause: { from: "2026-08-04", to: "2026-08-10" } },
      { start: "2026-08-11", pause: { from: "2026-09-01", to: "2026-09-07" } },
    ]);
  });

  test("'emendar' empurra a pausa uma cartela", () => {
    const [first] = pillSequences(method, [{ day: "2026-08-01", kind: "pack_extended" }], "2026-08-01");
    expect(first.pause).toEqual({ from: "2026-08-27", to: "2026-09-02" });
  });

  test("limite antes do início não devolve nada", () => {
    expect(pillSequences(method, [], "2026-07-01")).toEqual([]);
  });
});

describe("bleedEvents", () => {
  test("agrupa qualquer sangramento (escape incluso) e ignora 'Nada'", () => {
    expect(
      bleedEvents([
        { day: "2026-10-01", flow: "spotting" },
        { day: "2026-10-02", flow: "light" },
        { day: "2026-10-03", flow: "none" },
        { day: "2026-10-20", flow: "medium" },
      ]),
    ).toEqual([
      { start: "2026-10-01", end: "2026-10-02" },
      { start: "2026-10-20", end: "2026-10-20" },
    ]);
  });
});
