import { describe, expect, it } from "bun:test";

import {
  clampRest,
  isLateFinish,
  loadActiveRest,
  loadRestPrefs,
  REST_DEFAULT,
  REST_MAX,
  REST_MIN,
  restLeft,
  saveActiveRest,
} from "./rest";

describe("clampRest", () => {
  it("limita ao intervalo e arredonda", () => {
    expect(clampRest(5)).toBe(REST_MIN);
    expect(clampRest(999)).toBe(REST_MAX);
    expect(clampRest(45.6)).toBe(46);
  });
});

describe("restLeft", () => {
  it("conta pelo relógio, arredondando para cima", () => {
    expect(restLeft(10_000, 0)).toBe(10);
    expect(restLeft(10_000, 9_001)).toBe(1);
  });
  it("acaba quando chega na hora do fim", () => {
    expect(restLeft(10_000, 10_000)).toBeNull();
    expect(restLeft(10_000, 60_000)).toBeNull();
  });
});

describe("isLateFinish", () => {
  it("fim percebido na hora toca o aviso", () => {
    expect(isLateFinish(10_000, 11_000)).toBe(false);
  });
  it("fim percebido depois (tela voltou) encerra calado", () => {
    expect(isLateFinish(10_000, 12_000)).toBe(true);
  });
});

describe("descanso ativo salvo", () => {
  function withFullStore(fn: (store: Record<string, string>) => void) {
    const store: Record<string, string> = {};
    const g = globalThis as { window?: unknown };
    const original = g.window;
    g.window = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      },
    };
    try {
      fn(store);
    } finally {
      g.window = original;
    }
  }

  it("volta o descanso da mesma sessão que ainda não acabou", () => {
    withFullStore(() => {
      saveActiveRest({ sessionId: "s1", endsAt: 50_000, total: 45 });
      expect(loadActiveRest("s1", 20_000)).toEqual({ sessionId: "s1", endsAt: 50_000, total: 45 });
    });
  });
  it("ignora descanso de outra sessão", () => {
    withFullStore(() => {
      saveActiveRest({ sessionId: "s1", endsAt: 50_000, total: 45 });
      expect(loadActiveRest("s2", 20_000)).toBeNull();
    });
  });
  it("ignora descanso que já acabou", () => {
    withFullStore(() => {
      saveActiveRest({ sessionId: "s1", endsAt: 50_000, total: 45 });
      expect(loadActiveRest("s1", 50_000)).toBeNull();
    });
  });
  it("salvar null apaga", () => {
    withFullStore((store) => {
      saveActiveRest({ sessionId: "s1", endsAt: 50_000, total: 45 });
      saveActiveRest(null);
      expect(Object.keys(store)).toHaveLength(0);
    });
  });
  it("valor corrompido não quebra", () => {
    withFullStore((store) => {
      store["bloomy.rest.active"] = "{oops";
      expect(loadActiveRest("s1", 0)).toBeNull();
    });
  });
});

describe("loadRestPrefs", () => {
  it("retorna os defaults sem window (SSR)", () => {
    expect(loadRestPrefs()).toEqual({ seconds: REST_DEFAULT });
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

  it("seconds ausente → default", () => {
    withStore({}, () => {
      expect(loadRestPrefs()).toEqual({ seconds: REST_DEFAULT });
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
});
