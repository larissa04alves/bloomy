import { describe, expect, it } from "bun:test";

import type { CycleState } from "@/lib/api-types";

import {
  ageFrom,
  birthIso,
  birthPill,
  heightPill,
  isDeletePhrase,
  parseCm,
  packChanges,
  packCountRange,
  packDraftFrom,
  patchPackDraft,
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
  it("não desfaz um save mais novo da mesma chave", () => {
    const before = { heightCm: 160 };
    const latest = { heightCm: 180 };
    expect(revertPatch(latest, { heightCm: 170 }, before)).toEqual({ heightCm: 180 });
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

describe("cartela atual", () => {
  const cycle = (over: {
    kind?: CycleState["method"]["kind"];
    startedOn?: string;
    pauseEvery?: number;
    scheduled: Partial<NonNullable<CycleState["scheduled"]>>;
    takenDays?: string[];
  }) =>
    ({
      method: {
        kind: over.kind ?? "pill",
        activeDays: 21,
        pauseEvery: over.pauseEvery ?? 4,
        startedOn: over.startedOn ?? "2026-10-01",
      },
      scheduled: { phase: "active", unit: 3, units: 4, pill: 1, pauseDay: null, ...over.scheduled },
      pill: { due: true, taken: false, time: "21:00", takenDays: over.takenDays ?? [] },
    }) as unknown as CycleState;

  describe("packDraftFrom", () => {
    it("fase ativa: início = hoje − (pílula − 1) e conta as marcadas", () => {
      const c = cycle({ scheduled: { pill: 18 }, takenDays: ["2026-10-22", "2026-11-08"] });
      expect(packDraftFrom(c, "2026-11-08")).toEqual({ start: "2026-10-22", unit: 3, count: 2 });
    });

    it("pausa: início = início da pausa − pílulas da cartela; contagem 0", () => {
      const c = cycle({ scheduled: { phase: "pause", pill: 21, pauseDay: 3 } });
      expect(packDraftFrom(c, "2026-11-14")).toEqual({ start: "2026-10-22", unit: 3, count: 0 });
    });

    it("dias antes de startedOn contam como tomados", () => {
      const c = cycle({ startedOn: "2026-11-05", scheduled: { pill: 18 }, takenDays: ["2026-11-06", "2026-11-08"] });
      expect(packDraftFrom(c, "2026-11-08").count).toBe(16);
    });

    it("cartela emendada: unidade limitada à sequência (o servidor recusa unit > pauseEvery)", () => {
      const c = cycle({ pauseEvery: 1, scheduled: { unit: 2, units: 2, pill: 3 } });
      expect(packDraftFrom(c, "2026-11-08").unit).toBe(1);
    });
  });

  describe("packCountRange", () => {
    const initial = { start: "2026-10-22", unit: 3, count: 0 };

    it("data igual: máximo do servidor; mínimo = dias antes de startedOn", () => {
      const c = cycle({ startedOn: "2026-11-05", scheduled: { pill: 18 } });
      expect(packCountRange(initial, initial, c, "2026-11-08")).toEqual({ min: 14, max: 18 });
    });

    it("data igual na pausa adiantada → null, mesmo com hoje − início + 1 ≤ ativos", () => {
      const c = cycle({ scheduled: { phase: "pause", pill: 14, pauseDay: 2 } });
      expect(packCountRange(initial, initial, c, "2026-11-06")).toBeNull();
    });

    it("data alterada: conta pelos dias desde o novo início; antes de hoje vira presumido", () => {
      const c = cycle({ scheduled: { pill: 18 } });
      expect(packCountRange({ ...initial, start: "2026-11-04" }, initial, c, "2026-11-08")).toEqual({ min: 4, max: 5 });
    });

    it("data alterada para além dos comprimidos ativos → null", () => {
      const c = cycle({ scheduled: { pill: 18 } });
      expect(packCountRange({ ...initial, start: "2026-10-14" }, initial, c, "2026-11-08")).toBeNull();
    });

    it("anel → null", () => {
      expect(packCountRange(initial, initial, cycle({ kind: "ring", scheduled: { pill: 18 } }), "2026-11-08")).toBeNull();
    });
  });

  describe("patchPackDraft", () => {
    const c = cycle({ scheduled: { pill: 18 } });
    const today = "2026-11-08";

    it("recuar a data com tudo marcado mantém hoje marcado", () => {
      const all = { start: "2026-10-22", unit: 3, count: 18 };
      expect(patchPackDraft(all, { start: "2026-10-20" }, all, c, today).count).toBe(20);
    });

    it("recuar a data com hoje pendente mantém hoje pendente", () => {
      const initial = { start: "2026-10-22", unit: 3, count: 17 };
      expect(patchPackDraft(initial, { start: "2026-10-20" }, initial, c, today).count).toBe(19);
    });

    it("avançar a data encolhe a contagem dentro do novo limite", () => {
      const all = { start: "2026-10-22", unit: 3, count: 18 };
      expect(patchPackDraft(all, { start: "2026-10-25" }, all, c, today).count).toBe(15);
    });

    it("mudar só a contagem não mexe em mais nada", () => {
      const initial = { start: "2026-10-22", unit: 3, count: 17 };
      expect(patchPackDraft(initial, { count: 10 }, initial, c, today)).toEqual({ ...initial, count: 10 });
    });
  });

  describe("packChanges", () => {
    const initial = { start: "2026-10-22", unit: 3, count: 9 };

    it("nada mudou → nenhum envio", () => {
      expect(packChanges(initial, initial, { min: 0, max: 18 })).toEqual({ position: false, count: null });
    });

    it("só a contagem mudou", () => {
      expect(packChanges({ ...initial, count: 18 }, initial, { min: 0, max: 18 })).toEqual({ position: false, count: 18 });
    });

    it("data mudou: manda posição e contagem dentro do intervalo", () => {
      expect(packChanges({ ...initial, start: "2026-11-04" }, initial, { min: 4, max: 5 })).toEqual({
        position: true,
        count: 5,
      });
      expect(packChanges({ ...initial, start: "2026-11-04", count: 1 }, initial, { min: 4, max: 5 })).toEqual({
        position: true,
        count: 4,
      });
    });

    it("unidade mudou sem contagem possível", () => {
      expect(packChanges({ ...initial, unit: 2 }, initial, null)).toEqual({ position: true, count: null });
    });
  });
});
