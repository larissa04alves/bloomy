import { describe, expect, it } from "bun:test";

import { FOCUS_LABELS } from "./api-types";

describe("FOCUS_LABELS", () => {
  it("rotula os focos (grupos musculares) em PT", () => {
    expect(FOCUS_LABELS).toEqual({
      chest: "Peito",
      back: "Costas",
      legs: "Pernas",
      shoulders: "Ombros",
      glutes: "Glúteos",
      arms: "Braços",
      abs: "Abdômen",
      cardio: "Cardio",
    });
  });
});
