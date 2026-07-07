import { describe, expect, test } from "bun:test";

import { pendingMealTypes } from "./service";

describe("pendingMealTypes", () => {
  test("dia vazio: café, almoço e jantar pendentes", () => {
    expect(pendingMealTypes([])).toEqual(["breakfast", "lunch", "dinner"]);
  });

  test("café e almoço feitos: falta o jantar", () => {
    expect(pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }])).toEqual(["dinner"]);
  });

  test("lanche nunca conta como pendência nem quita as principais", () => {
    expect(pendingMealTypes([{ type: "snack" }, { type: "snack" }])).toEqual([
      "breakfast",
      "lunch",
      "dinner",
    ]);
  });

  test("tudo registrado: sem pendências", () => {
    expect(
      pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }, { type: "dinner" }]),
    ).toEqual([]);
  });
});
