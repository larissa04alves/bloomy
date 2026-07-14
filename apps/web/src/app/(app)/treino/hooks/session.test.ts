import { describe, expect, it } from "bun:test";

import type { SessionExercise } from "@/lib/api-types";

import { applySetPatch, completedExercises, doneCount } from "./session";

function ex(id: string, sets: { id: string; done: boolean }[]): SessionExercise {
  return {
    exerciseId: id,
    name: id,
    targetSets: sets.length,
    restSeconds: 45,
    position: 0,
    catalogId: null,
    lastPerformance: null,
    sets: sets.map((s, i) => ({
      id: s.id,
      exerciseId: id,
      exerciseName: id,
      setIndex: i + 1,
      reps: 10,
      load: 40,
      done: s.done,
    })),
  };
}

describe("doneCount", () => {
  it("conta séries feitas", () => {
    expect(doneCount(ex("a", [{ id: "s1", done: true }, { id: "s2", done: false }]))).toBe(1);
  });
});

describe("applySetPatch", () => {
  it("altera só a série alvo, imutável", () => {
    const exercises = [ex("a", [{ id: "s1", done: false }])];
    const next = applySetPatch(exercises, "s1", { done: true, load: 42.5 });
    expect(next[0].sets[0].done).toBe(true);
    expect(next[0].sets[0].load).toBe(42.5);
    expect(exercises[0].sets[0].done).toBe(false); // original intacto
  });
  it("ignora setId inexistente", () => {
    const exercises = [ex("a", [{ id: "s1", done: false }])];
    expect(applySetPatch(exercises, "x", { done: true })[0].sets[0].done).toBe(false);
  });
});

describe("completedExercises", () => {
  it("conta exercícios com todas as séries feitas", () => {
    const exercises = [
      ex("a", [{ id: "s1", done: true }, { id: "s2", done: true }]),
      ex("b", [{ id: "s3", done: true }, { id: "s4", done: false }]),
    ];
    expect(completedExercises(exercises)).toBe(1);
  });
});
