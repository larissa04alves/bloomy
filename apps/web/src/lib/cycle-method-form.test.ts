import { describe, expect, it } from "bun:test";

import type { CycleState } from "./api-types";
import {
  canFixPosition,
  EMPTY_METHOD_FORM,
  keepsPosition,
  type MethodForm,
  methodFormFromState,
  methodFormValid,
  toMethodInput,
} from "./cycle-method-form";

const TODAY = "2026-11-05";

const pill21: MethodForm = {
  ...EMPTY_METHOD_FORM,
  kind: "pill",
  activeDays: 21,
  pauses: true,
  pauseEvery: 4,
  pillTime: "21:00",
  currentUnitStart: "2026-10-22",
  currentUnit: 3,
};

describe("methodFormValid", () => {
  it("pílula 21 sem início da cartela atual é inválida", () => {
    expect(methodFormValid({ ...pill21, currentUnitStart: "" }, TODAY)).toBe(false);
  });

  it("pílula 21 completa é válida", () => {
    expect(methodFormValid(pill21, TODAY)).toBe(true);
  });

  it("pílula: horário precisa ser HH:MM", () => {
    expect(methodFormValid({ ...pill21, pillTime: "2:00" }, TODAY)).toBe(false);
    expect(methodFormValid({ ...pill21, pillTime: "24:00" }, TODAY)).toBe(false);
  });

  it("cartela da sequência não passa de pauseEvery", () => {
    expect(methodFormValid({ ...pill21, currentUnit: 5 }, TODAY)).toBe(false);
  });

  it("pílula sem pausa só pede horário", () => {
    expect(
      methodFormValid({ ...EMPTY_METHOD_FORM, kind: "pill", pauses: false, pillTime: "08:30" }, TODAY),
    ).toBe(true);
  });

  it("comprimidos ativos por cartela: 10 a 60", () => {
    expect(methodFormValid({ ...pill21, activeDays: 10 }, TODAY)).toBe(true);
    expect(methodFormValid({ ...pill21, activeDays: 60 }, TODAY)).toBe(true);
    expect(methodFormValid({ ...pill21, activeDays: 9 }, TODAY)).toBe(false);
    expect(methodFormValid({ ...pill21, activeDays: 61 }, TODAY)).toBe(false);
    expect(methodFormValid({ ...pill21, pauses: false, activeDays: 61 }, TODAY)).toBe(false);
    expect(methodFormValid({ ...pill21, activeDays: 21.5 }, TODAY)).toBe(false);
  });

  it("'Faz pausa? Não' não exige a posição", () => {
    const form = { ...pill21, pauses: false, currentUnitStart: "", currentUnit: 9 };
    expect(methodFormValid(form, TODAY)).toBe(true);
  });

  it("natural exige última menstruação até hoje e duração 21–45", () => {
    const natural: MethodForm = { ...EMPTY_METHOD_FORM, kind: "none", lastPeriodStart: TODAY, usualLength: 28 };
    expect(methodFormValid(natural, TODAY)).toBe(true);
    expect(methodFormValid({ ...natural, lastPeriodStart: "" }, TODAY)).toBe(false);
    expect(methodFormValid({ ...natural, lastPeriodStart: "2026-11-06" }, TODAY)).toBe(false);
    expect(methodFormValid({ ...natural, usualLength: 20 }, TODAY)).toBe(false);
    expect(methodFormValid({ ...natural, usualLength: 46 }, TODAY)).toBe(false);
  });

  it("anel exige início no passado", () => {
    const ring: MethodForm = { ...EMPTY_METHOD_FORM, kind: "ring", pauseEvery: 1, currentUnitStart: "2026-11-01" };
    expect(methodFormValid(ring, TODAY)).toBe(true);
    expect(methodFormValid({ ...ring, currentUnitStart: "2026-11-06" }, TODAY)).toBe(false);
  });

  it("pausa de 0 dias é inválida", () => {
    expect(methodFormValid({ ...pill21, pauseDays: 1 }, TODAY)).toBe(true);
    expect(methodFormValid({ ...pill21, pauseDays: 0 }, TODAY)).toBe(false);
  });

  it("DIU hormonal não pede mais nada", () => {
    expect(methodFormValid({ ...EMPTY_METHOD_FORM, kind: "hormonal_iud" }, TODAY)).toBe(true);
  });
});

describe("toMethodInput", () => {
  it("pílula 21 usa pausa padrão de 7 dias", () => {
    expect(toMethodInput(pill21)).toEqual({
      kind: "pill",
      activeDays: 21,
      pauseEvery: 4,
      pauseDays: 7,
      pillTime: "21:00",
      currentUnitStart: "2026-10-22",
      currentUnit: 3,
    });
  });

  it("pílula de 31 ativos manda o número informado", () => {
    expect(toMethodInput({ ...pill21, activeDays: 31, currentUnit: 1 })).toMatchObject({
      activeDays: 31,
      pauseEvery: 4,
      pauseDays: 7,
      currentUnit: 1,
    });
  });

  it("pausa escolhida vence o padrão", () => {
    expect(toMethodInput({ ...pill21, pauseDays: 5 })).toMatchObject({ pauseDays: 5 });
  });

  it("pílula sem pausa não manda campos de pausa nem posição", () => {
    expect(toMethodInput({ ...pill21, pauses: false })).toEqual({ kind: "pill", activeDays: 21, pillTime: "21:00" });
  });

  it("natural manda só última menstruação e duração", () => {
    expect(
      toMethodInput({ ...EMPTY_METHOD_FORM, kind: "copper_iud", lastPeriodStart: "2026-10-20", usualLength: 30 }),
    ).toEqual({ kind: "copper_iud", lastPeriodStart: "2026-10-20", usualLength: 30 });
  });

  it("DIU hormonal manda só o tipo", () => {
    expect(toMethodInput({ ...EMPTY_METHOD_FORM, kind: "hormonal_iud" })).toEqual({ kind: "hormonal_iud" });
  });
});

describe("edição sem trocar o tipo", () => {
  const current: MethodForm = { ...pill21, currentUnitStart: "", currentUnit: 1 };

  it("mesma pílula não pede a posição e não a manda", () => {
    const form = { ...current, pillTime: "08:00" };
    expect(keepsPosition(form, current)).toBe(true);
    expect(methodFormValid(form, TODAY, current)).toBe(true);
    expect(toMethodInput(form, current)).toEqual({
      kind: "pill",
      activeDays: 21,
      pauseEvery: 4,
      pauseDays: 7,
      pillTime: "08:00",
    });
  });

  it("mudar os comprimidos ativos ou ligar a pausa volta a pedir a posição", () => {
    const form = { ...current, activeDays: 24 };
    expect(keepsPosition(form, current)).toBe(false);
    expect(methodFormValid(form, TODAY, current)).toBe(false);
    expect(methodFormValid({ ...form, currentUnitStart: "2026-11-01" }, TODAY, current)).toBe(true);
    expect(keepsPosition(current, { ...current, pauses: false })).toBe(false);
    expect(methodFormValid(current, TODAY, { ...current, pauses: false })).toBe(false);
  });

  it("natural do mesmo tipo manda só a duração", () => {
    const natural: MethodForm = { ...EMPTY_METHOD_FORM, kind: "none", usualLength: 30 };
    expect(methodFormValid(natural, TODAY, natural)).toBe(true);
    expect(toMethodInput(natural, natural)).toEqual({ kind: "none", usualLength: 30 });
  });

  it("mudar 'pausa a cada' ou a duração da pausa pede a posição e a manda", () => {
    for (const form of [{ ...current, pauseEvery: 2 }, { ...current, pauseDays: 5 }]) {
      expect(keepsPosition(form, current)).toBe(false);
      expect(methodFormValid(form, TODAY, current)).toBe(false);
    }
    const form = { ...current, pauseEvery: 2, currentUnitStart: "2026-11-01", currentUnit: 2 };
    expect(methodFormValid(form, TODAY, current)).toBe(true);
    expect(toMethodInput(form, current)).toMatchObject({ pauseEvery: 2, currentUnitStart: "2026-11-01", currentUnit: 2 });
  });

  it("corrigir a cartela atual pede e manda a posição sem mudar a configuração", () => {
    const form = { ...current, fixPosition: true };
    expect(keepsPosition(form, current)).toBe(false);
    expect(methodFormValid(form, TODAY, current)).toBe(false);
    expect(toMethodInput({ ...form, currentUnitStart: "2026-10-22", currentUnit: 3 }, current)).toEqual({
      kind: "pill",
      activeDays: 21,
      pauseEvery: 4,
      pauseDays: 7,
      pillTime: "21:00",
      currentUnitStart: "2026-10-22",
      currentUnit: 3,
    });
  });

  it("corrigir a última menstruação manda a data", () => {
    const natural: MethodForm = { ...EMPTY_METHOD_FORM, kind: "none", usualLength: 30 };
    const form = { ...natural, fixPosition: true, lastPeriodStart: "2026-10-30" };
    expect(methodFormValid(form, TODAY, natural)).toBe(true);
    expect(toMethodInput(form, natural)).toEqual({ kind: "none", lastPeriodStart: "2026-10-30", usualLength: 30 });
  });

  it("a ação de corrigir só aparece no mesmo tipo com posição", () => {
    expect(canFixPosition(current, current)).toBe(true);
    const natural: MethodForm = { ...EMPTY_METHOD_FORM, kind: "copper_iud" };
    expect(canFixPosition(natural, natural)).toBe(true);
    const continuous: MethodForm = { ...current, pauses: false };
    expect(canFixPosition(continuous, continuous)).toBe(false);
    const iud: MethodForm = { ...EMPTY_METHOD_FORM, kind: "hormonal_iud" };
    expect(canFixPosition(iud, iud)).toBe(false);
    expect(canFixPosition({ ...current, kind: "ring" }, current)).toBe(false);
    expect(canFixPosition(current, undefined)).toBe(false);
    expect(canFixPosition({ ...current, fixPosition: true }, current)).toBe(false);
  });

  it("pílula → natural pede a última menstruação", () => {
    const form = { ...current, kind: "none" as const };
    expect(methodFormValid(form, TODAY, current)).toBe(false);
  });
});

describe("methodFormFromState", () => {
  it("usa a configuração declarada e deixa a posição vazia", () => {
    const state = {
      method: {
        kind: "pill",
        activeDays: 31,
        pillTime: "21:00",
        startedOn: "2026-10-01",
        pauseEvery: 4,
        pauseDays: 7,
        usualLength: null,
        lastPeriodStart: null,
      },
    } as unknown as CycleState;
    expect(methodFormFromState(state)).toEqual({
      ...EMPTY_METHOD_FORM,
      kind: "pill",
      activeDays: 31,
      pauses: true,
      pauseEvery: 4,
      pauseDays: 7,
      pillTime: "21:00",
    });
  });

  it("pílula sem pausa volta com 'Faz pausa? Não'", () => {
    const state = {
      method: {
        kind: "pill",
        activeDays: 28,
        pillTime: "08:00",
        startedOn: "2026-10-01",
        pauseEvery: null,
        pauseDays: null,
        usualLength: null,
        lastPeriodStart: null,
      },
    } as unknown as CycleState;
    expect(methodFormFromState(state)).toMatchObject({ kind: "pill", activeDays: 28, pauses: false, pauseDays: 7 });
  });

  it("natural: duração habitual declarada, não a média", () => {
    const state = {
      method: {
        kind: "none",
        activeDays: null,
        pillTime: null,
        startedOn: "2026-10-01",
        pauseEvery: null,
        pauseDays: null,
        usualLength: 32,
        lastPeriodStart: "2026-09-01",
      },
      natural: { cycleDay: 17, avgLength: 29 },
    } as unknown as CycleState;
    expect(methodFormFromState(state)).toMatchObject({ kind: "none", usualLength: 32, lastPeriodStart: "" });
  });
});
