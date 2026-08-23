import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import type { TodayPayload } from "@/lib/api-types";

import {
  consultaLabel,
  dateLabel,
  dayProgress,
  greetingLabel,
  monthShort,
  progressLabel,
  workoutLabel,
} from "./format";

function todayWith(over: Partial<TodayPayload> = {}): TodayPayload {
  return {
    name: "Dev",
    day: "2026-08-12",
    period: "evening",
    checkin: { mood: null },
    water: { totalMl: 0, goalMl: 2000, done: 0, target: 4 },
    meals: { done: 0, target: 3 },
    meds: { taken: 0, total: 4 },
    workout: { state: "suggested", id: "w1", name: "Quads" },
    nextAppointment: null,
    ...over,
  } as TodayPayload;
}

describe("dayProgress", () => {
  it("soma garrafas, refeições, remédios e o treino do dia", () => {
    const p = dayProgress(
      todayWith({
        water: { totalMl: 1000, goalMl: 2000, done: 2, target: 4 },
        meals: { done: 1, target: 3 },
        meds: { taken: 3, total: 4 },
      }),
    );
    // 2+1+3 feitos de 4+3+4 possíveis, +1 do treino ainda não concluído
    expect(p.done).toBe(6);
    expect(p.total).toBe(12);
    expect(p.ratio).toBeCloseTo(0.5);
  });

  it("conta o treino concluído como 1 feito", () => {
    const p = dayProgress(todayWith({ workout: { state: "done", name: "Quads" } }));
    expect(p.done).toBe(1);
    expect(p.total).toBe(12);
  });

  it("deixa fora do total o que não está cadastrado", () => {
    const p = dayProgress(todayWith({ meds: { taken: 0, total: 0 }, workout: { state: "none" } }));
    expect(p.total).toBe(7); // 4 garrafas + 3 refeições
  });

  it("não passa de 1 nem divide por zero", () => {
    const vazio = dayProgress(
      todayWith({
        water: { totalMl: 0, goalMl: 0, done: 0, target: 0 },
        meals: { done: 0, target: 0 },
        meds: { taken: 0, total: 0 },
        workout: { state: "none" },
      }),
    );
    expect(vazio.ratio).toBe(0);

    const excedido = dayProgress(
      todayWith({
        water: { totalMl: 4500, goalMl: 2000, done: 9, target: 4 },
        meals: { done: 0, target: 0 },
        meds: { taken: 0, total: 0 },
        workout: { state: "none" },
      }),
    );
    expect(excedido.ratio).toBe(1);
  });
});

describe("progressLabel", () => {
  it("muda o tom conforme o dia anda", () => {
    expect(progressLabel(0, 0)).toBe("Cadastre seus rituais pra acompanhar o dia");
    expect(progressLabel(0, 12)).toBe("Seu dia está começando");
    expect(progressLabel(2, 12)).toBe("Seu dia começou");
    expect(progressLabel(6, 12)).toBe("Você já passou da metade");
    expect(progressLabel(12, 12)).toBe("Dia completo, parabéns");
  });
});

describe("greetingLabel", () => {
  it("saúda pelo primeiro nome", () => {
    expect(greetingLabel("evening", "Larissa")).toBe("Boa noite, Larissa");
    expect(greetingLabel("morning", "Larissa")).toBe("Bom dia, Larissa");
    expect(greetingLabel("afternoon", "Larissa")).toBe("Boa tarde, Larissa");
  });
  it("sem nome, fica só a saudação", () => {
    expect(greetingLabel("evening", null)).toBe("Boa noite");
  });
});

describe("dateLabel", () => {
  it("dia útil sai sem '-feira'", () => {
    expect(dateLabel("2026-07-06")).toBe("Segunda, 6 de julho");
  });
  it("sábado e domingo", () => {
    expect(dateLabel("2026-07-11")).toBe("Sábado, 11 de julho");
    expect(dateLabel("2026-07-12")).toBe("Domingo, 12 de julho");
  });
});

describe("consultaLabel", () => {
  it("hora cheia vira '14h' e o dia vira 'qui, 9'", () => {
    // 17:00Z = 14:00 no BR; 2026-07-09 é quinta
    expect(consultaLabel("2026-07-09T17:00:00.000Z")).toEqual({ date: "qui, 9", time: "14h" });
  });
  it("hora quebrada mantém os minutos", () => {
    expect(consultaLabel("2026-07-09T17:30:00.000Z")).toEqual({ date: "qui, 9", time: "14h30" });
  });
});

describe("workoutLabel", () => {
  it("nenhum treino cadastrado convida a criar", () => {
    expect(workoutLabel({ state: "none" })).toEqual({
      subtitle: "Crie seu primeiro treino",
      action: { label: "Cadastrar", kind: "plus" },
    });
  });
  it("sessão aberta convida a continuar", () => {
    expect(workoutLabel({ state: "active", id: "a", name: "Peito e tríceps" })).toEqual({
      subtitle: "Peito e tríceps · em andamento",
      action: { label: "Continuar", kind: "play" },
    });
  });
  it("concluído celebra, sem pedir mais nada", () => {
    expect(workoutLabel({ state: "done", name: "Pernas" })).toEqual({
      subtitle: "Pernas",
      action: { label: "Treino concluído", kind: "check" },
    });
  });
  it("sugerido convida a iniciar", () => {
    expect(workoutLabel({ state: "suggested", id: "c", name: "Pernas" })).toEqual({
      subtitle: "Pernas",
      action: { label: "Iniciar", kind: "play" },
    });
  });
});

describe("monthShort", () => {
  it("mês abreviado em pt-BR, minúsculo e sem ponto", () => {
    expect(monthShort("2026-07-09T17:00:00.000Z")).toBe("jul");
    expect(monthShort("2026-08-04T12:00:00.000Z")).toBe("ago");
  });
  it("fixado no fuso BR: instante de virada de mês em UTC ainda é o mês anterior no BR", () => {
    // 2026-09-01T02:00:00Z é 2026-08-31 23:00 em America/Sao_Paulo (UTC-3) — ainda agosto.
    expect(monthShort("2026-09-01T02:00:00.000Z")).toBe("ago");
  });
});

// Este describe MEXE no fuso do processo (`process.env.TZ`) e fica de propósito
// no fim do arquivo — ver o comentário logo abaixo antes de mover ou copiar este bloco.
describe("dateLabel (America/Sao_Paulo, UTC-3)", () => {
  // `bun test` fixa TZ=UTC por um mecanismo interno do Bun que NÃO passa por
  // `process.env.TZ` (que já nasce `undefined` no processo de teste). Sob esse
  // UTC forçado, "local" e UTC coincidem, então `parseDay` (que constrói a data
  // a partir de componentes locais) e o bug ingênuo que ela evita (`new
  // Date(day)`, meia-noite UTC) produzem o mesmo resultado — o teste não
  // discriminaria nada. Por isso fixamos `America/Sao_Paulo` (o fuso real do
  // app, ADR-0002) só para o teste abaixo, o suficiente pra expor o shift.
  //
  // Diferença extra em relação ao padrão de `peso-helpers.test.ts`: lá,
  // `toDayString`/`fromDayString` usam getters crus de `Date` (`getMonth`,
  // `getDate`...), que sempre consultam o fuso ambiente NO MOMENTO da chamada
  // — então fixar `process.env.TZ` num `beforeAll` já é suficiente. Aqui,
  // `dateLabel` usa `Intl.DateTimeFormat` de módulo (`WEEKDAY_FMT`,
  // `DAY_MONTH_FMT`, sem `timeZone` explícito) que resolvem e CONGELAM o fuso
  // na primeira construção — e essa construção já aconteceu no import estático
  // deste arquivo (topo do arquivo), antes de qualquer `beforeAll` rodar, sob o
  // UTC forçado pelo bun test. Fixar `TZ` depois não muda esses formatters já
  // congelados: confirmado empiricamente — ver task-7-report.md, seção da
  // "hollowness experiment", onde chamar `dateLabel` (import estático) sob TZ
  // pinado ainda dava o mesmo resultado certo ou errado (não discriminava).
  // Por isso reimportamos `format.ts` DINAMICAMENTE aqui dentro, com um
  // query-string único (`?tz-pin=...`) pra forçar o Bun a reavaliar o módulo
  // do zero — já com `America/Sao_Paulo` ativo — e assim seus formatters
  // resolvem o fuso certo. A importação estática do topo do arquivo continua
  // intacta e servindo os outros `describe`s; esta é uma cópia isolada só
  // para este teste.
  //
  // IMPORTANTE — o `afterAll` NÃO restaura UTC. Ele devolve `process.env.TZ` ao
  // valor original (`undefined`), mas o mecanismo que fixa UTC no Bun não é
  // reversível por essa via: assim que a variável é tocada, o runtime passa a
  // resolver o fuso real do sistema operacional (que também é America/Sao_Paulo
  // neste container — então nada aqui *parece* quebrado, mas o fuso deixou de
  // ser UTC). Por isso este `describe` é o ÚLTIMO do arquivo: nada roda depois
  // dele, então o efeito colateral não alcança nenhum outro teste. Não mova
  // este bloco pra cima sem entender essa restrição.
  const originalTz = process.env.TZ;
  let pinnedDateLabel: (day: string) => string;

  beforeAll(async () => {
    process.env.TZ = "America/Sao_Paulo";
    const fresh = await import(`./format.ts?tz-pin=${Date.now()}`);
    pinnedDateLabel = fresh.dateLabel;
  });
  afterAll(() => {
    // Higiene parcial (devolve a variável), não garantia de voltar a TZ=UTC — ver acima.
    process.env.TZ = originalTz;
  });

  it("não desloca o dia por UTC", () => {
    // "2026-01-01" ingênuo (`new Date(day)`) é meia-noite UTC, que em
    // America/Sao_Paulo é 2025-12-31 21:00 — uma implementação quebrada
    // renderizaria "31 de dezembro". `parseDay` deve devolver "1 de janeiro".
    expect(pinnedDateLabel("2026-01-01")).toBe("Quinta, 1 de janeiro");
  });
});
