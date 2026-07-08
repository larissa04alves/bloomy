import { describe, expect, it } from "bun:test";

import { FOCUS_LABELS } from "./api-types";

describe("FOCUS_LABELS", () => {
  it("rotula os 4 focos em PT", () => {
    expect(FOCUS_LABELS).toEqual({
      chest: "Peito",
      back: "Costas",
      legs: "Pernas",
      cardio: "Cardio",
    });
  });
});
