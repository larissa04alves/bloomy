import { describe, expect, it } from "bun:test";

import {
  commitDraft,
  formatDuration,
  formatFocuses,
  mmss,
  numberDraft,
  parseDraft,
  previewSummary,
  settleDraft,
} from "./format";

describe("previewSummary", () => {
  it("soma exercícios e séries do treino", () => {
    expect(previewSummary([{ targetSets: 4 }, { targetSets: 3 }])).toBe("2 exercícios · 7 séries");
  });
  it("concorda no singular", () => {
    expect(previewSummary([{ targetSets: 1 }])).toBe("1 exercício · 1 série");
  });
});

describe("mmss", () => {
  it("formata segundos como M:SS", () => {
    expect(mmss(372)).toBe("6:12");
    expect(mmss(45)).toBe("0:45");
    expect(mmss(0)).toBe("0:00");
  });
  it("nunca fica negativo", () => {
    expect(mmss(-5)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("mostra minutos abaixo de 1h", () => {
    expect(formatDuration(1920)).toBe("32 min");
  });
  it("mostra horas e minutos acima de 1h", () => {
    expect(formatDuration(3900)).toBe("1h 05");
  });
});

describe("numberDraft", () => {
  it("tira zero à esquerda e caracteres não numéricos", () => {
    expect(numberDraft("030")).toBe("30");
    expect(numberDraft("")).toBe("");
    expect(numberDraft("0")).toBe("0");
    expect(numberDraft("3a")).toBe("3");
  });
  it("aceita uma vírgula/ponto no modo decimal", () => {
    expect(numberDraft("07,5", true)).toBe("7,5");
    expect(numberDraft("0,5", true)).toBe("0,5");
    // inteiro: a parte depois da vírgula é descartada, nunca colada aos dígitos
    expect(numberDraft("7,5", false)).toBe("7");
    expect(numberDraft("12.9")).toBe("12");
  });
});

describe("parseDraft", () => {
  it("vazio vira null; vírgula decimal vira número", () => {
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("7,5")).toBe(7.5);
    expect(parseDraft("12")).toBe(12);
  });
});

describe("commitDraft", () => {
  it("vazio cai no mínimo; fora da faixa é limitado", () => {
    expect(commitDraft("", 1, 20)).toBe(1);
    expect(commitDraft("35", 1, 20)).toBe(20);
    expect(commitDraft("30", 0, 600)).toBe(30);
  });
});

describe("settleDraft", () => {
  it("vazio ou inválido vira 0 ao sair do campo; decimal não arredonda", () => {
    expect(settleDraft("")).toBe(0);
    expect(settleDraft(",")).toBe(0);
    expect(settleDraft("7,5")).toBe(7.5);
    expect(settleDraft("12")).toBe(12);
  });
});

describe("formatFocuses", () => {
  it("junta os rótulos PT com ponto médio", () => {
    expect(formatFocuses(["chest", "arms"])).toBe("Peito · Braços");
  });
});
