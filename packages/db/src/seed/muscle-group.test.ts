import { describe, expect, it } from "bun:test";

import { mapMuscleGroup } from "./muscle-group";

describe("mapMuscleGroup", () => {
  it("mapeia target/bodyPart do dataset p/ um dos 8 grupos", () => {
    expect(mapMuscleGroup("pectorals", "chest")).toBe("chest");
    expect(mapMuscleGroup("lats", "back")).toBe("back");
    expect(mapMuscleGroup("quads", "upper legs")).toBe("legs");
    expect(mapMuscleGroup("calves", "lower legs")).toBe("legs");
    expect(mapMuscleGroup("delts", "shoulders")).toBe("shoulders");
    expect(mapMuscleGroup("glutes", "upper legs")).toBe("glutes");
    expect(mapMuscleGroup("biceps", "upper arms")).toBe("arms");
    expect(mapMuscleGroup("forearms", "lower arms")).toBe("arms");
    expect(mapMuscleGroup("abs", "waist")).toBe("abs");
    expect(mapMuscleGroup("cardiovascular system", "cardio")).toBe("cardio");
  });
  it("cai num fallback sensato p/ desconhecido", () => {
    expect(mapMuscleGroup("???", "neck")).toBe("shoulders"); // neck → ombros
    expect(mapMuscleGroup("???", "???")).toBe("abs"); // último recurso
  });
});
