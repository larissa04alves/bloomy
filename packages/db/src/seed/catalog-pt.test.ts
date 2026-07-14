import { describe, expect, it } from "bun:test";

import { CATALOG_PT } from "./catalog-pt";

const GROUPS = new Set(["chest", "back", "legs", "shoulders", "glutes", "arms", "abs", "cardio"]);

describe("CATALOG_PT", () => {
  it("tem ~1323 entradas, todas com namePt não-vazio e group válido", () => {
    const entries = Object.entries(CATALOG_PT);
    expect(entries.length).toBeGreaterThanOrEqual(1300);
    for (const [id, v] of entries) {
      expect(id).toMatch(/^\d{4}$/);
      expect(v.namePt.trim().length).toBeGreaterThan(0);
      expect(GROUPS.has(v.group)).toBe(true);
    }
  });

  it("não inclui o id 0609 (sem GIF)", () => {
    expect(CATALOG_PT["0609"]).toBeUndefined();
  });
});
