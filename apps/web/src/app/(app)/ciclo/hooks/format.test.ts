import { describe, expect, it } from "bun:test";

import type { CycleState } from "@/lib/api-types";

import {
  calendarHint,
  continuousLabel,
  extendEffect,
  flowTitle,
  lateLabel,
  nextPauseLabel,
  pauseLabel,
  pillDots,
  pillLabel,
  registroTitle,
  ringStops,
  showExtend,
  startPauseEffect,
  summaryLabel,
  todayEntry,
  windowLabel,
} from "./format";

type Position = NonNullable<CycleState["scheduled"]>;

// O caso dela em 05/11: cartela 3 começou em 22/out, pausa a cada 4 cartelas de 21.
const HER_CASE: Position = {
  phase: "active",
  unit: 3,
  units: 4,
  pill: 15,
  pauseDay: null,
  nextPause: { from: "2026-12-03", to: "2026-12-09" },
};

const PAUSE: Position = {
  phase: "pause",
  unit: 4,
  units: 4,
  pill: 21,
  pauseDay: 3,
  nextPause: { from: "2026-12-03", to: "2026-12-09" },
};

function state(over: Partial<CycleState>): CycleState {
  return {
    enabled: true,
    method: {
      kind: "pill",
      activeDays: 21,
      pillTime: "21:00",
      startedOn: "2025-01-10",
      pauseEvery: 4,
      pauseDays: 7,
      usualLength: null,
      lastPeriodStart: null,
    },
    mode: "scheduled",
    today: { flow: null, symptoms: [] },
    pill: null,
    hiddenSymptoms: [],
    methodHistory: [],
    ...over,
  };
}

describe("windowLabel", () => {
  it("faixa no mesmo mês põe o mês só no fim", () => {
    expect(windowLabel({ from: "2026-11-24", to: "2026-11-28" })).toBe("entre 24 e 28/nov");
  });
  it("faixa que cruza o mês mostra os dois meses", () => {
    expect(windowLabel({ from: "2026-11-30", to: "2026-12-02" })).toBe("entre 30/nov e 2/dez");
  });
});

describe("pillLabel", () => {
  it("pílula mostra a cartela da sequência e o comprimido", () => {
    expect(pillLabel(HER_CASE, "pill", 21)).toEqual({
      title: "Cartela 3 de 4",
      detail: "comprimido 15 de 21",
    });
  });
  it("anel troca o comprimido pela semana de uso", () => {
    expect(pillLabel({ ...HER_CASE, unit: 1, units: 1, pill: 8 }, "ring", 21)).toEqual({
      title: "Anel 1 de 1",
      detail: "semana 2 de 3",
    });
  });
});

describe("pauseLabel", () => {
  it("conta o dia da pausa e diz quando começa a próxima cartela", () => {
    expect(pauseLabel(PAUSE, "pill")).toEqual({
      title: "Pausa · dia 3 de 7",
      detail: "Próxima cartela na quinta-feira, 10 de dezembro",
    });
  });
  it("no anel fala do próximo anel", () => {
    expect(pauseLabel(PAUSE, "ring").detail).toBe("Próximo anel na quinta-feira, 10 de dezembro");
  });
});

describe("nextPauseLabel", () => {
  it("longe da pausa fala em semanas aproximadas", () => {
    expect(nextPauseLabel(HER_CASE, "2026-11-05")).toBe("Próxima pausa em ~4 semanas · 3 a 9/dez");
  });
  it("perto fala em dias e amanhã", () => {
    expect(nextPauseLabel(HER_CASE, "2026-11-28")).toBe("Próxima pausa em 5 dias · 3 a 9/dez");
    expect(nextPauseLabel(HER_CASE, "2026-12-02")).toBe("Próxima pausa amanhã · 3 a 9/dez");
  });
  it("pausa que cruza o mês mostra os dois meses", () => {
    const p = { ...HER_CASE, nextPause: { from: "2026-12-29", to: "2027-01-04" } };
    expect(nextPauseLabel(p, "2026-12-20")).toBe("Próxima pausa em 9 dias · 29/dez a 4/jan");
  });
});

describe("lateLabel", () => {
  it("atraso é neutro e convida a registrar", () => {
    expect(lateLabel(3)).toBe("Passou da previsão há 3 dias · registre quando vier");
    expect(lateLabel(1)).toBe("Passou da previsão há 1 dia · registre quando vier");
  });
});

describe("showExtend", () => {
  it("escondido com a pausa a mais de 3 dias", () => {
    expect(showExtend(HER_CASE, "2026-11-05")).toBe(false);
    expect(showExtend(HER_CASE, "2026-11-29")).toBe(false);
  });
  it("aparece com a pausa a 3 dias ou menos", () => {
    expect(showExtend(HER_CASE, "2026-11-30")).toBe(true);
    expect(showExtend(HER_CASE, "2026-12-02")).toBe(true);
  });
  it("aparece com a pausa em curso", () => {
    expect(showExtend(PAUSE, "2026-12-05")).toBe(true);
  });
});

describe("summaryLabel", () => {
  it("pílula com pausa diz a cada quantas cartelas", () => {
    expect(summaryLabel(state({}))).toBe("Pílula · pausa a cada 4 cartelas");
    expect(
      summaryLabel(state({ method: { ...state({}).method, pauseEvery: 1 } })),
    ).toBe("Pílula · pausa a cada cartela");
  });
  it("anel e adesivo falam em semanas", () => {
    const ring = state({ method: { ...state({}).method, kind: "ring", activeDays: null, pauseEvery: 1 } });
    expect(summaryLabel(ring)).toBe("Anel · pausa a cada 3 semanas");
  });
  it("sem método", () => {
    const none = state({ mode: "natural", method: { ...state({}).method, kind: "none", activeDays: null } });
    expect(summaryLabel(none)).toBe("Sem método hormonal");
  });
  it("contínuo e não hormonal dizem desde quando", () => {
    const iud = state({
      mode: "continuous",
      method: { ...state({}).method, kind: "hormonal_iud", activeDays: null, startedOn: "2025-01-10" },
    });
    expect(summaryLabel(iud)).toBe("DIU hormonal · desde jan/2025");
    const continuousPill = state({ mode: "continuous", method: { ...state({}).method, pauseEvery: null, pauseDays: null } });
    expect(summaryLabel(continuousPill)).toBe("Pílula contínua · desde jan/2025");
  });
});

describe("calendarHint", () => {
  it("natural mostra o ciclo médio", () => {
    const natural = state({
      mode: "natural",
      natural: {
        cycleDay: 9,
        avgLength: 29,
        avgPeriodLength: 5,
        window: { from: "2026-11-24", to: "2026-11-28" },
        lateDays: 0,
      },
    });
    expect(calendarHint(natural)).toBe("ciclo médio 29 dias");
  });
  it("contínuo conta os sangramentos de 6 meses", () => {
    const c = (n: number) =>
      calendarHint(
        state({
          mode: "continuous",
          continuous: { lastBleed: null, daysSince: null, eventsLast180: n },
        }),
      );
    expect(c(3)).toBe("3 sangramentos nos últimos 6 meses");
    expect(c(1)).toBe("1 sangramento nos últimos 6 meses");
    expect(c(0)).toBe("nenhum sangramento nos últimos 6 meses");
  });
});

describe("continuousLabel", () => {
  const iud = (continuous: NonNullable<CycleState["continuous"]>) =>
    continuousLabel(
      state({
        mode: "continuous",
        method: { ...state({}).method, kind: "hormonal_iud", activeDays: null },
        continuous,
      }),
    );
  it("conta os dias desde o último sangramento", () => {
    expect(
      iud({ lastBleed: { day: "2026-10-13", flow: "light" }, daysSince: 23, eventsLast180: 1 }),
    ).toMatchObject({ title: "Último sangramento há 23 dias", detail: "fluxo leve em 13/out" });
  });
  it("nomeia o escape quando foi escape", () => {
    expect(
      iud({ lastBleed: { day: "2026-11-04", flow: "spotting" }, daysSince: 1, eventsLast180: 1 }),
    ).toMatchObject({ title: "Último escape ontem", detail: "escape em 4/nov" });
  });
  it("sem registro não inventa data", () => {
    expect(iud({ lastBleed: null, daysSince: null, eventsLast180: 0 }).title).toBe(
      "Nenhum sangramento registrado",
    );
  });
  it("explica por que não há previsão", () => {
    expect(
      iud({ lastBleed: null, daysSince: null, eventsLast180: 0 }).note,
    ).toBe(
      "Com DIU hormonal o sangramento costuma ser irregular, então não fazemos previsão — só guardamos o que você registrar.",
    );
  });
});

describe("flowTitle", () => {
  it("rótulo do fluxo no card de hoje", () => {
    expect(flowTitle("medium")).toBe("Fluxo médio");
    expect(flowTitle("spotting")).toBe("Escape");
    expect(flowTitle("none")).toBe("Sem sangramento");
  });
});

describe("registroTitle", () => {
  it("hoje, ontem e outro dia", () => {
    expect(registroTitle("2026-11-05", "2026-11-05")).toBe("Hoje, qui 5/nov");
    expect(registroTitle("2026-11-04", "2026-11-05")).toBe("Ontem, qua 4/nov");
    expect(registroTitle("2026-10-30", "2026-11-05")).toBe("sex, 30/out");
  });
});

describe("ringStops", () => {
  it("marca a menstruação no começo e a faixa prevista no fim do anel", () => {
    const stops = ringStops({
      cycleDay: 9,
      avgLength: 28,
      avgPeriodLength: 5,
      window: { from: "2026-11-24", to: "2026-11-28" },
      lateDays: 0,
    }, "2026-11-05");
    // início em 28/out; faixa = dias 28 a 32 de um anel de 33 (sobra 1 dia de folga no fim)
    expect(stops).toEqual({ period: 15.2, from: 81.8, to: 97 });
  });
});

describe("startPauseEffect", () => {
  it("diz quando começa a próxima cartela contando a pausa a partir de hoje", () => {
    expect(startPauseEffect("2026-12-03", 7, "pill")).toBe(
      "Sua próxima cartela começa na quinta-feira, 10 de dezembro.",
    );
  });
  it("no anel e no adesivo fala do próximo anel ou adesivo", () => {
    expect(startPauseEffect("2026-11-06", 4, "ring")).toBe(
      "Seu próximo anel entra na terça-feira, 10 de novembro.",
    );
    expect(startPauseEffect("2026-11-06", 1, "patch")).toBe(
      "Seu próximo adesivo entra no sábado, 7 de novembro.",
    );
  });
});

describe("extendEffect", () => {
  it("antes da pausa, empurra a pausa planejada em uma cartela", () => {
    expect(extendEffect(HER_CASE, "2026-11-30", 21)).toBe("A pausa passa para 24 a 30/dez");
  });
  it("durante a pausa, a cartela nova começa hoje e a pausa vem depois dela", () => {
    expect(extendEffect(PAUSE, "2026-12-05", 21)).toBe("A pausa passa para 26/dez a 1/jan");
  });
});

describe("todayEntry", () => {
  it("'Nada' sozinho mostra 'Sem sangramento'", () => {
    expect(todayEntry({ flow: "none", symptoms: [] })).toEqual({ flow: "Sem sangramento", symptoms: [] });
  });
  it("só sintomas (flow none) mostra só os chips", () => {
    expect(todayEntry({ flow: "none", symptoms: ["cramps"] })).toEqual({ flow: null, symptoms: ["Cólica"] });
  });
  it("fluxo vira título", () => {
    expect(todayEntry({ flow: "medium", symptoms: [] })).toEqual({ flow: "Fluxo médio", symptoms: [] });
  });
  it("dia sem registro fica vazio", () => {
    expect(todayEntry({ flow: null, symptoms: [] })).toBeNull();
  });
});

describe("pillDots", () => {
  // Cartela de 7 com hoje no comprimido 5 (06/11): 02/11 a 05/11 ficaram para trás.
  const base = {
    length: 7,
    current: 5,
    today: "2026-11-06",
    startedOn: "2026-11-04",
    takenDays: ["2026-11-05"],
    takenToday: false,
  };

  it("dia antes do início do acompanhamento fica cheio", () => {
    expect(pillDots(base).slice(0, 2)).toEqual(["taken", "taken"]);
  });
  it("dia passado sem toma vira missed", () => {
    expect(pillDots(base)[2]).toBe("missed");
  });
  it("dia passado com toma fica taken", () => {
    expect(pillDots(base)[3]).toBe("taken");
  });
  it("hoje marcado fica taken", () => {
    expect(pillDots({ ...base, takenToday: true })[4]).toBe("taken");
  });
  it("hoje não marcado fica current", () => {
    expect(pillDots(base)[4]).toBe("current");
  });
  it("futuro fica left", () => {
    expect(pillDots(base).slice(5)).toEqual(["left", "left"]);
  });
});
