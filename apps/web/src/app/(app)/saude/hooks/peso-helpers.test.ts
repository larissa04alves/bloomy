import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import type { WeightLog } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

import {
  chartSeries,
  dayLabel,
  deltaBetween,
  filterPeriod,
  formatKg,
  fromDayString,
  groupByMonth,
  parseKgToGrams,
  toDayString,
} from "./peso-helpers";

/** Fixture: só os campos que os helpers leem. */
const w = (day: string, grams: number): WeightLog => ({
  id: day,
  day,
  grams,
  createdAt: `${day}T12:00:00.000Z`,
});

// Ordem desc, como vem da API.
const SERIE: WeightLog[] = [
  w("2026-08-03", 64200),
  w("2026-07-27", 65000),
  w("2026-07-20", 64800),
  w("2026-07-13", 64600),
  w("2026-07-05", 65000),
  w("2026-06-28", 65200),
];

describe("formatKg", () => {
  it("uma casa decimal com vírgula", () => {
    expect(formatKg(64200)).toBe("64,2");
  });
  it("mantém o zero à direita", () => {
    expect(formatKg(65000)).toBe("65,0");
  });
  it("arredonda para a casa mais próxima", () => {
    expect(formatKg(64250)).toBe("64,3");
  });
  it("formata diferenças pequenas", () => {
    expect(formatKg(800)).toBe("0,8");
  });
});

describe("deltaBetween", () => {
  it("sem pesagem anterior → null", () => {
    expect(deltaBetween(64200, undefined)).toBeNull();
  });
  it("perdeu peso → down com valor absoluto", () => {
    expect(deltaBetween(64200, 65000)).toEqual({ direction: "down", label: "0,8" });
  });
  it("ganhou peso → up com valor absoluto", () => {
    expect(deltaBetween(65000, 64800)).toEqual({ direction: "up", label: "0,2" });
  });
  it("mesmo peso → flat", () => {
    expect(deltaBetween(65000, 65000)).toEqual({ direction: "flat", label: "0,0" });
  });
});

describe("filterPeriod", () => {
  it("30d pega só o último mês", () => {
    const rows = filterPeriod(SERIE, "30d", "2026-08-03");
    expect(rows.map((r) => r.day)).toEqual([
      "2026-08-03",
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
      "2026-07-05",
    ]);
  });
  it("3m pega tudo dessa série", () => {
    expect(filterPeriod(SERIE, "3m", "2026-08-03")).toHaveLength(6);
  });
  it("inclui o registro exatamente no limite do período", () => {
    const rows = filterPeriod([w("2026-07-04", 65000)], "30d", "2026-08-03");
    expect(rows).toHaveLength(1);
  });
  it("exclui o registro um dia além do limite", () => {
    const rows = filterPeriod([w("2026-07-03", 65000)], "30d", "2026-08-03");
    expect(rows).toEqual([]);
  });
  it("período sem pesagens → vazio, mesmo com histórico", () => {
    expect(filterPeriod([w("2025-01-10", 70000)], "30d", "2026-08-03")).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("agrupa em meses desc com rótulo por extenso", () => {
    const groups = groupByMonth(SERIE);
    expect(groups.map((g) => g.label)).toEqual(["Agosto 2026", "Julho 2026", "Junho 2026"]);
  });

  it("saldo do mês compara com a última pesagem do mês anterior", () => {
    const groups = groupByMonth(SERIE);
    // agosto: 64,2 (3 ago) vs 65,0 (27 jul, última de julho) → desceu 0,8
    expect(groups[0].balance).toEqual({ direction: "down", label: "0,8" });
    // julho: 65,0 (27 jul) vs 65,2 (28 jun) → desceu 0,2
    expect(groups[1].balance).toEqual({ direction: "down", label: "0,2" });
  });

  it("mês mais antigo não tem com o que comparar → balance null", () => {
    const groups = groupByMonth(SERIE);
    expect(groups[groups.length - 1].balance).toBeNull();
  });

  it("mantém os itens do mês em ordem desc", () => {
    const groups = groupByMonth(SERIE);
    expect(groups[1].items.map((i) => i.day)).toEqual([
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
      "2026-07-05",
    ]);
  });

  it("lista vazia → nenhum grupo", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("ordena antes de agrupar — entrada fora de ordem dá o mesmo resultado da série ordenada", () => {
    // Mesma SERIE, embaralhada: julho quebrado em dois blocos não-adjacentes,
    // com junho e agosto intercalados no meio. A implementação antiga (que só
    // olhava o último grupo criado) criaria um "Julho 2026" duplicado aqui.
    const EMBARALHADA: WeightLog[] = [
      w("2026-07-05", 65000),
      w("2026-08-03", 64200),
      w("2026-06-28", 65200),
      w("2026-07-27", 65000),
      w("2026-07-13", 64600),
      w("2026-07-20", 64800),
    ];
    const groups = groupByMonth(EMBARALHADA);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.label)).toEqual(["Agosto 2026", "Julho 2026", "Junho 2026"]);
    expect(groups[0].balance).toEqual({ direction: "down", label: "0,8" });
    expect(groups[1].balance).toEqual({ direction: "down", label: "0,2" });
    expect(groups[2].balance).toBeNull();
    expect(groups[1].items.map((i) => i.day)).toEqual([
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
      "2026-07-05",
    ]);
  });
});

describe("chartSeries", () => {
  it("inverte para ordem crescente e converte para kg", () => {
    const points = chartSeries([w("2026-08-03", 64200), w("2026-07-27", 65000)]);
    expect(points).toEqual([
      { day: "2026-07-27", kg: 65 },
      { day: "2026-08-03", kg: 64.2 },
    ]);
  });
});

describe("dayLabel", () => {
  it("data por extenso sem ano", () => {
    expect(dayLabel("2026-08-03")).toBe("3 de agosto");
  });
  it("não usa fuso do browser (dia não escorrega)", () => {
    expect(dayLabel("2026-01-01")).toBe("1 de janeiro");
  });
});

describe("parseKgToGrams", () => {
  it("vírgula decimal", () => {
    expect(parseKgToGrams("64,2")).toBe(64200);
  });
  it("ponto decimal também", () => {
    expect(parseKgToGrams("64.2")).toBe(64200);
  });
  it("tolera espaços em volta", () => {
    expect(parseKgToGrams("  64,2  ")).toBe(64200);
  });
  it("no máximo uma casa decimal — duas casas é rejeitado", () => {
    expect(parseKgToGrams("64,25")).toBeNull();
  });
  it("vazio → null", () => {
    expect(parseKgToGrams("")).toBeNull();
  });
  it("ponto sem casa decimal → null", () => {
    expect(parseKgToGrams("64.")).toBeNull();
  });
  it("negativo → null", () => {
    expect(parseKgToGrams("-5")).toBeNull();
  });
  it("não numérico → null", () => {
    expect(parseKgToGrams("abc")).toBeNull();
  });
  it("quatro dígitos inteiros → null (fora de qualquer faixa plausível)", () => {
    expect(parseKgToGrams("1234")).toBeNull();
  });
});

describe("fromDayString", () => {
  it("ida-e-volta com toDayString preserva o dia", () => {
    expect(toDayString(fromDayString("2026-08-03"))).toBe("2026-08-03");
    expect(toDayString(fromDayString("2026-01-01"))).toBe("2026-01-01");
    expect(toDayString(fromDayString("2026-12-31"))).toBe("2026-12-31");
  });
  it("cai ao meio-dia local (imune a horário de verão)", () => {
    const date = fromDayString("2026-08-03");
    expect(date.getHours()).toBe(12);
    expect(date.getMinutes()).toBe(0);
  });

  it("dayFor() → fromDayString → toDayString preserva o \"hoje\" de Brasília", () => {
    // Round-trip auto-consistente (mesma classe dos testes acima, não um
    // discriminador contra toISOString): não precisa fixar o fuso do processo.
    const today = dayFor(new Date("2026-08-03T12:00:00Z")); // tarde em SP, "2026-08-03"
    expect(toDayString(fromDayString(today))).toBe(today);
  });

  it("preserva o dia mesmo perto da virada BR (madrugada UTC)", () => {
    // Mesmo instante do teste de dayFor em day.test.ts: 02:59:59Z ainda é o dia
    // anterior em SP (ADR-0002). O round-trip precisa devolver esse dia, não o
    // dia UTC do instante.
    const near = dayFor(new Date("2026-07-06T02:59:59Z")); // "2026-07-05" em SP
    expect(near).toBe("2026-07-05");
    expect(toDayString(fromDayString(near))).toBe("2026-07-05");
  });
});

// Este describe MEXE no fuso do processo (`process.env.TZ`) e fica de propósito
// no fim do arquivo — ver o comentário logo abaixo antes de mover ou copiar este bloco.
describe("toDayString (America/Sao_Paulo, UTC-3)", () => {
  // `bun test` fixa TZ=UTC por um mecanismo interno do Bun que NÃO passa por
  // `process.env.TZ` (que já nasce `undefined` no processo de teste). Sob esse
  // UTC forçado, "local" e UTC coincidem, então não há divergência nenhuma pra
  // este teste flagrar — por isso fixamos `America/Sao_Paulo` (o fuso real do
  // app, ADR-0002) só para os dois testes abaixo, o suficiente pra expor a
  // divergência entre campos locais e `toISOString()` que `toDayString` existe
  // pra evitar.
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
  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo";
  });
  afterAll(() => {
    // Higiene parcial (devolve a variável), não garantia de voltar a TZ=UTC — ver acima.
    process.env.TZ = originalTz;
  });

  it("23h30 local não escorrega pro dia seguinte via toISOString", () => {
    // 3 de agosto, 23:30 local (UTC-3): toISOString empurraria pra 02:30 UTC do dia 4.
    const date = new Date(2026, 7, 3, 23, 30);
    expect(toDayString(date)).toBe("2026-08-03");
    // Confere que o teste de fato discrimina: a implementação ingênua daria outro dia.
    expect(date.toISOString().slice(0, 10)).not.toBe("2026-08-03");
  });
  it("meia-noite local é o dia que começa, não o anterior", () => {
    const date = new Date(2026, 0, 1, 0, 15);
    expect(toDayString(date)).toBe("2026-01-01");
  });
});
