import { describe, expect, it } from "bun:test";

import {
  clearLegacyAutoRest,
  effectiveAutoRest,
  legacyAutoRestStep,
  parseLegacyAuto,
  readLegacyAutoRest,
} from "./legacy-auto-rest";

describe("parseLegacyAuto", () => {
  it("lê só true/false", () => {
    expect(parseLegacyAuto("true")).toBe(true);
    expect(parseLegacyAuto("false")).toBe(false);
    expect(parseLegacyAuto(null)).toBeNull();
    expect(parseLegacyAuto("lixo")).toBeNull();
  });
});

describe("legacyAutoRestStep", () => {
  it("sem chave no aparelho não faz nada", () => {
    expect(legacyAutoRestStep(null, true)).toEqual({ kind: "none" });
  });
  it("valor igual ao da conta só apaga a chave, sem PATCH", () => {
    expect(legacyAutoRestStep("true", true)).toEqual({ kind: "clear" });
  });
  it("valor diferente vai para a conta", () => {
    expect(legacyAutoRestStep("false", true)).toEqual({ kind: "save", value: false });
  });
  it("valor ilegível só apaga a chave", () => {
    expect(legacyAutoRestStep("lixo", false)).toEqual({ kind: "clear" });
  });
});

describe("effectiveAutoRest", () => {
  it("a escolha feita nesta sessão vence tudo", () => {
    expect(effectiveAutoRest(false, true, "true")).toBe(false);
  });
  it("sem escolha local vale a conta, mesmo com chave antiga diferente", () => {
    expect(effectiveAutoRest(null, false, "true")).toBe(false);
  });
  it("sem conta (carregando ou falhou) vale a chave antiga, provisória", () => {
    expect(effectiveAutoRest(null, null, "false")).toBe(false);
  });
  it("sem nada legível fica ligado", () => {
    expect(effectiveAutoRest(null, null, null)).toBe(true);
    expect(effectiveAutoRest(null, null, "lixo")).toBe(true);
  });
});

describe("ler/apagar a chave", () => {
  it("lê sem apagar; apagar remove só bloomy.rest.auto", () => {
    const store: Record<string, string> = {
      "bloomy.rest.auto": "false",
      "bloomy.rest.seconds": "60",
    };
    const g = globalThis as { window?: unknown };
    const original = g.window;
    g.window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    };
    try {
      expect(readLegacyAutoRest()).toBe("false");
      expect(readLegacyAutoRest()).toBe("false");
      clearLegacyAutoRest();
      expect(store).toEqual({ "bloomy.rest.seconds": "60" });
      expect(readLegacyAutoRest()).toBeNull();
    } finally {
      g.window = original;
    }
  });
  it("sem window (SSR) lê null e apagar não quebra", () => {
    expect(readLegacyAutoRest()).toBeNull();
    clearLegacyAutoRest();
  });
});
