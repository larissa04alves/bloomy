import { describe, expect, it } from "bun:test";

import type { CatalogExercise } from "@/lib/api-types";

import { buildFuse, searchExercises } from "./buscaExercicios";

const cat: CatalogExercise[] = [
  { id: "1", name: "barbell bench press", namePt: "Supino reto com barra", group: "chest", bodyPart: "chest", target: "pectorals", secondaryMuscles: [] },
  { id: "2", name: "leg extension", namePt: "Cadeira extensora", group: "legs", bodyPart: "upper legs", target: "quads", secondaryMuscles: [] },
  { id: "3", name: "lat pulldown", namePt: "Puxada frontal", group: "back", bodyPart: "back", target: "lats", secondaryMuscles: [] },
];

describe("searchExercises", () => {
  const fuse = buildFuse(cat);
  it("acha por prefixo/typo ignorando acento", () => {
    expect(searchExercises(fuse, cat, { q: "supin", group: null }).map((e) => e.id)).toContain("1");
    expect(searchExercises(fuse, cat, { q: "extensora", group: null }).map((e) => e.id)).toContain("2");
  });
  it("filtra por grupo (sem query devolve o grupo todo)", () => {
    const legs = searchExercises(fuse, cat, { q: "", group: "legs" });
    expect(legs.map((e) => e.id)).toEqual(["2"]);
  });
  it("combina query + grupo", () => {
    expect(searchExercises(fuse, cat, { q: "puxada", group: "back" }).map((e) => e.id)).toEqual(["3"]);
    expect(searchExercises(fuse, cat, { q: "supino", group: "legs" })).toHaveLength(0);
  });
});
