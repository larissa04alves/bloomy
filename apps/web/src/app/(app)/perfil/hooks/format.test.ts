import { describe, expect, it } from "bun:test";

import {
  ageFrom,
  birthIso,
  birthPill,
  heightPill,
  isDeletePhrase,
  parseCm,
  revertPatch,
} from "./format";

describe("ageFrom", () => {
  it("conta os anos completos", () => {
    expect(ageFrom("1996-03-12", "2026-11-05")).toBe(30);
  });
  it("antes do aniversário do ano, ainda não fez", () => {
    expect(ageFrom("1996-11-06", "2026-11-05")).toBe(29);
  });
  it("no dia do aniversário já fez", () => {
    expect(ageFrom("1996-11-05", "2026-11-05")).toBe(30);
  });
});

describe("pills", () => {
  it("altura em cm ou convite a adicionar", () => {
    expect(heightPill(165)).toBe("165 cm");
    expect(heightPill(null)).toBe("Adicionar");
  });
  it("nascimento em dd/mm/aaaa ou convite a adicionar", () => {
    expect(birthPill("1996-03-12")).toBe("12/03/1996");
    expect(birthPill(null)).toBe("Adicionar");
  });
});

describe("parseCm", () => {
  it("aceita só inteiro", () => {
    expect(parseCm(" 172 ")).toBe(172);
    expect(parseCm("170,5")).toBeNull();
    expect(parseCm("")).toBeNull();
  });
});

describe("birthIso", () => {
  it("dd/mm/aaaa válida vira AAAA-MM-DD", () => {
    expect(birthIso("12/03/1996", "2026-11-05")).toBe("1996-03-12");
    expect(birthIso("05/11/2026", "2026-11-05")).toBe("2026-11-05");
  });
  it("incompleta, inexistente ou fora da faixa vira null", () => {
    expect(birthIso("12/03", "2026-11-05")).toBeNull();
    expect(birthIso("31/02/1990", "2026-11-05")).toBeNull();
    expect(birthIso("31/12/1899", "2026-11-05")).toBeNull();
    expect(birthIso("06/11/2026", "2026-11-05")).toBeNull();
  });
});

describe("revertPatch", () => {
  it("volta só as chaves do patch que falhou, mantendo outro save em voo", () => {
    const before = { heightCm: 160, autoRest: true, restAlert: true };
    const latest = { heightCm: 170, autoRest: false, restAlert: true };
    expect(revertPatch(latest, { heightCm: 170 }, before)).toEqual({
      heightCm: 160,
      autoRest: false,
      restAlert: true,
    });
  });
  it("não muta o estado recebido", () => {
    const latest = { autoRest: false };
    revertPatch(latest, { autoRest: false }, { autoRest: true });
    expect(latest).toEqual({ autoRest: false });
  });
});

describe("isDeletePhrase", () => {
  it("aceita a frase com espaço nas pontas e qualquer caixa", () => {
    expect(isDeletePhrase("aceito excluir minha conta")).toBe(true);
    expect(isDeletePhrase("  Aceito Excluir Minha Conta ")).toBe(true);
  });
  it("recusa frase incompleta, vazia ou com espaço duplo no meio", () => {
    expect(isDeletePhrase("aceito excluir")).toBe(false);
    expect(isDeletePhrase("")).toBe(false);
    expect(isDeletePhrase("aceito  excluir minha conta")).toBe(false);
  });
});
