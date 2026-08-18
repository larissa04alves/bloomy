import { describe, expect, it } from "bun:test";

import { firstName, periodFor } from "./greeting";

describe("periodFor (fuso America/Sao_Paulo)", () => {
  it("09:00 BR é manhã", () => {
    expect(periodFor(new Date("2026-08-04T12:00:00.000Z"))).toBe("morning");
  });
  it("05:00 BR já é manhã (fronteira de baixo)", () => {
    expect(periodFor(new Date("2026-08-04T08:00:00.000Z"))).toBe("morning");
  });
  it("11:00 BR ainda é manhã (fronteira de cima)", () => {
    expect(periodFor(new Date("2026-08-04T14:00:00.000Z"))).toBe("morning");
  });
  it("15:30 BR é tarde", () => {
    expect(periodFor(new Date("2026-08-04T18:30:00.000Z"))).toBe("afternoon");
  });
  it("12:00 BR é tarde (fronteira de baixo)", () => {
    expect(periodFor(new Date("2026-08-04T15:00:00.000Z"))).toBe("afternoon");
  });
  it("17:00 BR ainda é tarde (fronteira de cima)", () => {
    expect(periodFor(new Date("2026-08-04T20:00:00.000Z"))).toBe("afternoon");
  });
  it("18:00 BR já é noite (fronteira de baixo)", () => {
    expect(periodFor(new Date("2026-08-04T21:00:00.000Z"))).toBe("evening");
  });
  it("20:00 BR é noite", () => {
    expect(periodFor(new Date("2026-08-04T23:00:00.000Z"))).toBe("evening");
  });
  it("02:00 BR (madrugada) ainda é noite", () => {
    expect(periodFor(new Date("2026-08-04T05:00:00.000Z"))).toBe("evening");
  });
  it("04:00 BR é o último instante da noite antes da manhã", () => {
    expect(periodFor(new Date("2026-08-04T07:00:00.000Z"))).toBe("evening");
  });
  it("meia-noite BR é noite (um hourCycle devolvendo '24' quebraria isso)", () => {
    expect(periodFor(new Date("2026-08-04T03:00:00.000Z"))).toBe("evening");
  });
  it("não usa o fuso do processo: 23:00 BR do dia anterior", () => {
    // 2026-08-05T02:00Z = 23:00 de 04/08 no BR
    expect(periodFor(new Date("2026-08-05T02:00:00.000Z"))).toBe("evening");
  });
});

describe("firstName", () => {
  it("pega só o primeiro nome", () => {
    expect(firstName("Larissa Silva Alves")).toBe("Larissa");
  });
  it("nome único", () => {
    expect(firstName("Larissa")).toBe("Larissa");
  });
  it("ignora espaço sobrando", () => {
    expect(firstName("  Larissa  Silva ")).toBe("Larissa");
  });
  it("vazio, só espaço, null e undefined viram null", () => {
    expect(firstName("")).toBeNull();
    expect(firstName("   ")).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
});
