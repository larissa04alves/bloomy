import { describe, expect, it } from "bun:test";

import { parseExercisesCsv } from "./parse-csv";

const CSV = `bodyPart,equipment,id,name,target,secondaryMuscles/0,secondaryMuscles/1
waist,body weight,0001,3/4 sit-up,abs,hip flexors,lower back
chest,barbell,0025,barbell bench press,pectorals,triceps,`;

describe("parseExercisesCsv", () => {
  it("reconstrói arrays achatados e ignora colunas vazias", () => {
    const rows = parseExercisesCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: "0001", name: "3/4 sit-up", bodyPart: "waist", target: "abs",
      equipment: "body weight", secondaryMuscles: ["hip flexors", "lower back"],
    });
    expect(rows[1]!.secondaryMuscles).toEqual(["triceps"]); // célula vazia dropada
  });
});
