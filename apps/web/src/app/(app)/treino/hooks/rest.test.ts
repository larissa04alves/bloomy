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
});
