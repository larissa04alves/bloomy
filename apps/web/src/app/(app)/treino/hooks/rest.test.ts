import { describe, expect, it } from "bun:test";

import { clampRest, loadRestPrefs, REST_DEFAULT, REST_MAX, REST_MIN, tickRest } from "./rest";

describe("clampRest", () => {
  it("limita ao intervalo e arredonda", () => {
    expect(clampRest(5)).toBe(REST_MIN);
    expect(clampRest(999)).toBe(REST_MAX);
    expect(clampRest(45.6)).toBe(46);
  });
});

describe("tickRest", () => {
  it("decrementa até acabar", () => {
    expect(tickRest(45)).toBe(44);
    expect(tickRest(1)).toBeNull();
    expect(tickRest(0)).toBeNull();
    expect(tickRest(null)).toBeNull();
  });
});

describe("loadRestPrefs", () => {
  it("retorna os defaults sem window (SSR)", () => {
    expect(loadRestPrefs()).toEqual({ seconds: REST_DEFAULT, auto: true });
  });

  // Simula o navegador: injeta window.localStorage com um store controlado.
  function withStore(store: Record<string, string>, fn: () => void) {
    const g = globalThis as { window?: unknown };
    const original = g.window;
    g.window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
      },
    };
    try {
      fn();
    } finally {
      g.window = original;
    }
  }

  it("seconds ausente → default; auto default true", () => {
    withStore({}, () => {
      expect(loadRestPrefs()).toEqual({ seconds: REST_DEFAULT, auto: true });
    });
  });

  it("seconds inválido → default", () => {
    withStore({ "bloomy.rest.seconds": "abc" }, () => {
      expect(loadRestPrefs().seconds).toBe(REST_DEFAULT);
    });
  });

  it("seconds abaixo/acima do intervalo → clamp", () => {
    withStore({ "bloomy.rest.seconds": "5" }, () => {
      expect(loadRestPrefs().seconds).toBe(REST_MIN);
    });
    withStore({ "bloomy.rest.seconds": "999" }, () => {
      expect(loadRestPrefs().seconds).toBe(REST_MAX);
    });
  });

  it("auto lido do store", () => {
    withStore({ "bloomy.rest.auto": "false" }, () => {
      expect(loadRestPrefs().auto).toBe(false);
    });
  });
});
