import { describe, expect, it } from "bun:test";

import type { CycleHistory, DayEntry } from "@/lib/api-types";

import { dayAriaLabel, historyItems, monthBounds, monthGrid, monthLabel, shiftMonth } from "./format";

const entry = (day: string, flow: DayEntry["flow"], symptoms: DayEntry["symptoms"] = []): DayEntry => ({
  day,
  flow,
  symptoms,
});

describe("monthGrid", () => {
  const days = [
    entry("2026-11-01", "medium", ["cramps"]),
    entry("2026-11-02", "none"),
    entry("2026-11-04", "none", ["headache"]),
    entry("2026-11-11", "spotting"),
  ];
  const grid = monthGrid("2026-11", days, { from: "2026-11-24", to: "2026-11-28" }, "2026-11-05");

  it("começa no domingo: 1/nov/2026 é domingo, sem células vazias antes", () => {
    expect(grid).toHaveLength(30);
    expect(grid[0]?.day).toBe("2026-11-01");
  });

  it("marca menstruação, escape, sintoma, hoje e prevista como no mockup", () => {
    expect(grid[0]).toEqual({
      day: "2026-11-01",
      date: 1,
      mark: "period",
      symptom: true,
      today: false,
      future: false,
    });
    expect(grid[3]).toMatchObject({ mark: null, symptom: true });
    expect(grid[4]).toMatchObject({ today: true, mark: null });
    expect(grid[10]).toMatchObject({ mark: "spotting" });
    expect(grid.slice(23, 28).map((c) => c?.mark)).toEqual(Array(5).fill("predicted"));
    expect(grid[23]?.future).toBe(true);
    expect(grid[28]?.mark).toBeNull();
  });

  it("'Nada' sem sintomas não aparece como registro", () => {
    expect(grid[1]).toMatchObject({ mark: null, symptom: false });
  });

  it("dezembro/2026 começa na terça: duas células vazias", () => {
    const dec = monthGrid("2026-12", [], null, "2026-11-05");
    expect(dec.slice(0, 3).map((c) => c?.day ?? null)).toEqual([null, null, "2026-12-01"]);
    expect(dec).toHaveLength(33);
  });

  it("prevista não cobre menstruação registrada nem dia que já passou", () => {
    const g = monthGrid("2026-11", [entry("2026-11-06", "heavy")], { from: "2026-11-03", to: "2026-11-07" }, "2026-11-05");
    expect(g.slice(2, 7).map((c) => c?.mark)).toEqual([null, null, "predicted", "period", "predicted"]);
  });
});

describe("mês", () => {
  it("rótulo por extenso", () => {
    expect(monthLabel("2026-11")).toBe("novembro 2026");
  });
  it("navega atravessando o ano", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
  it("limites do mês", () => {
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
});

describe("historyItems", () => {
  const today = "2026-11-05";

  it("natural: em andamento, ciclos fechados com barra de menstruação e troca de método", () => {
    const history: CycleHistory = {
      sections: [
        {
          kind: "none",
          startedOn: "2026-08-03",
          endedOn: null,
          mode: "natural",
          cycles: [
            { start: "2026-10-28", end: today, length: 9, periodDays: 5, status: "current" },
            { start: "2026-09-29", end: "2026-10-27", length: 29, periodDays: 5, status: "done" },
            { start: "2026-09-01", end: "2026-09-28", length: 28, periodDays: null, status: "done" },
          ],
        },
        { kind: "pill", startedOn: "2026-01-10", endedOn: "2026-08-03", mode: "scheduled", sequences: [] },
      ],
    };
    expect(historyItems(history, today)).toEqual([
      { kind: "row", key: "none-2026-08-03-2026-10-28", title: "28/out → hoje", detail: "em andamento · dia 9", bar: null },
      {
        kind: "row",
        key: "none-2026-08-03-2026-09-29",
        title: "29/set → 27/out",
        detail: "29 dias · 5 de menstruação",
        bar: 17,
      },
      { kind: "row", key: "none-2026-08-03-2026-09-01", title: "1/set → 28/set", detail: "28 dias", bar: null },
      {
        kind: "switch",
        key: "switch-2026-08-03",
        text: "Desde 3/ago sem método · antes, pílula (fora da média)",
      },
    ]);
  });

  it("pílula: uma linha por sequência com o sangramento da pausa", () => {
    const history: CycleHistory = {
      sections: [
        {
          kind: "pill",
          startedOn: "2026-07-16",
          endedOn: null,
          mode: "scheduled",
          sequences: [
            {
              start: "2026-10-15",
              pause: { from: "2026-11-05", to: "2026-11-11" },
              bleed: null,
              status: "current",
            },
            {
              start: "2026-09-17",
              pause: { from: "2026-10-08", to: "2026-10-14" },
              bleed: { from: "2026-10-10", to: "2026-10-10" },
              status: "done",
            },
            {
              start: "2026-07-16",
              pause: { from: "2026-08-06", to: "2026-08-12" },
              bleed: { from: "2026-08-08", to: "2026-08-11" },
              status: "done",
            },
            { start: "2026-06-01", pause: { from: "2026-08-20", to: "2026-08-26" }, bleed: null, status: "done" },
          ],
        },
      ],
    };
    expect(historyItems(history, today).map((i) => (i.kind === "row" ? [i.title, i.detail] : i.text))).toEqual([
      ["15/out → 11/nov", "pausa 5 a 11/nov · em andamento"],
      ["17/set → 14/out", "pausa 8 a 14/out · sangrou em 10/out"],
      ["16/jul → 12/ago", "pausa 6 a 12/ago · sangrou 8 a 11/ago"],
      ["1/jun → 26/ago", "pausa 20 a 26/ago · sem sangramento"],
    ]);
  });

  it("pílula: pausa em curso mostra o sangramento parcial", () => {
    const history: CycleHistory = {
      sections: [
        {
          kind: "pill",
          startedOn: "2026-07-16",
          endedOn: null,
          mode: "scheduled",
          sequences: [
            {
              start: "2026-10-12",
              pause: { from: "2026-11-02", to: "2026-11-08" },
              bleed: { from: "2026-11-04", to: "2026-11-05" },
              status: "current",
            },
          ],
        },
      ],
    };
    expect(historyItems(history, today).map((i) => (i.kind === "row" ? i.detail : i.text))).toEqual([
      "pausa 2 a 8/nov · em andamento · sangrou 4 a 5/nov",
    ]);
  });

  it("pílula: sequência em curso antes da pausa e sequência cortada pela troca", () => {
    const history: CycleHistory = {
      sections: [
        {
          kind: "ring",
          startedOn: "2026-10-01",
          endedOn: null,
          mode: "scheduled",
          sequences: [
            { start: "2026-10-30", pause: { from: "2026-11-20", to: "2026-11-26" }, bleed: null, status: "current" },
          ],
        },
        {
          kind: "pill",
          startedOn: "2026-09-01",
          endedOn: "2026-10-01",
          mode: "scheduled",
          sequences: [
            { start: "2026-09-29", pause: { from: "2026-10-20", to: "2026-10-26" }, bleed: null, status: "cut" },
          ],
        },
      ],
    };
    expect(historyItems(history, today).map((i) => (i.kind === "row" ? [i.title, i.detail] : i.text))).toEqual([
      ["30/out → hoje", "em andamento · pausa prevista 20 a 26/nov"],
      "Desde 1/out com anel · antes, pílula",
      ["29/set → 30/set", "até a troca de método"],
    ]);
  });

  it("contínuo: episódios de sangramento", () => {
    const history: CycleHistory = {
      sections: [
        {
          kind: "hormonal_iud",
          startedOn: "2026-01-10",
          endedOn: null,
          mode: "continuous",
          events: [
            { from: "2026-10-03", to: "2026-10-05" },
            { from: "2026-09-01", to: "2026-09-01" },
          ],
        },
      ],
    };
    expect(historyItems(history, today).map((i) => (i.kind === "row" ? [i.title, i.detail] : i.text))).toEqual([
      ["3 a 5/out", "3 dias de sangramento"],
      ["1/set", "1 dia de sangramento"],
    ]);
  });

  it("contínuo sem registro diz isso", () => {
    const history: CycleHistory = {
      sections: [{ kind: "implant", startedOn: "2026-01-10", endedOn: null, mode: "continuous", events: [] }],
    };
    expect(historyItems(history, today)).toEqual([
      { kind: "row", key: "implant-2026-01-10-empty", title: "Nenhum sangramento registrado", detail: "desde 10/jan", bar: null },
    ]);
  });
});

describe("dayAriaLabel", () => {
  const cell = { day: "2026-11-05", date: 5, mark: null, symptom: false, today: false, future: false } as const;

  it("data por extenso, sem ISO", () => {
    expect(dayAriaLabel(cell, true)).toBe("5 de novembro");
  });

  it("junta hoje, marca e sintoma", () => {
    expect(dayAriaLabel({ ...cell, mark: "period", symptom: true }, true)).toBe("5 de novembro, menstruação, com sintoma");
    expect(dayAriaLabel({ ...cell, today: true, mark: "spotting" }, true)).toBe("5 de novembro, hoje, escape");
    expect(dayAriaLabel({ ...cell, day: "2026-12-01", date: 1, mark: "predicted" }, true)).toBe(
      "1 de dezembro, menstruação prevista",
    );
  });

  it("com método hormonal fala em sangramento e pausa, como a legenda", () => {
    expect(dayAriaLabel({ ...cell, mark: "period" }, false)).toBe("5 de novembro, sangramento");
    expect(dayAriaLabel({ ...cell, mark: "predicted" }, false)).toBe("5 de novembro, pausa prevista");
  });
});
