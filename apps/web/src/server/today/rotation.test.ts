import { describe, expect, it } from "bun:test";

import { pickWorkoutOfDay, workoutCard } from "./rotation";

const W = [
  { id: "a", name: "Peito e tríceps" },
  { id: "b", name: "Costas e bíceps" },
  { id: "c", name: "Pernas" },
  { id: "d", name: "Cardio leve" },
];

describe("pickWorkoutOfDay", () => {
  it("é estável para o mesmo par (usuária, dia)", () => {
    const first = pickWorkoutOfDay(W, "user-1", "2026-08-04");
    for (let i = 0; i < 10; i++) {
      expect(pickWorkoutOfDay(W, "user-1", "2026-08-04")).toEqual(first);
    }
  });

  it("sempre devolve um item da lista", () => {
    const picked = pickWorkoutOfDay(W, "user-1", "2026-08-04");
    expect(W).toContain(picked!);
  });

  it("varia ao longo dos dias (não trava num treino só)", () => {
    const days = Array.from({ length: 28 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`);
    const distinct = new Set(days.map((d) => pickWorkoutOfDay(W, "user-1", d)!.id));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("lista vazia devolve null", () => {
    expect(pickWorkoutOfDay([], "user-1", "2026-08-04")).toBeNull();
  });

  it("com um treino só, devolve sempre ele", () => {
    expect(pickWorkoutOfDay([W[0]], "user-1", "2026-08-04")).toEqual(W[0]);
    expect(pickWorkoutOfDay([W[0]], "user-1", "2026-12-25")).toEqual(W[0]);
  });
});

describe("workoutCard", () => {
  const base = { workouts: W, activeWorkoutId: null, completed: null, userId: "user-1", day: "2026-08-04" };

  it("sem treino cadastrado → none", () => {
    expect(workoutCard({ ...base, workouts: [] })).toEqual({ state: "none" });
  });

  it("sessão aberta → active com o nome do treino", () => {
    expect(workoutCard({ ...base, activeWorkoutId: "c" })).toEqual({
      state: "active",
      id: "c",
      name: "Pernas",
    });
  });

  it("sessão aberta de treino já desativado → cai no nome genérico", () => {
    expect(workoutCard({ ...base, activeWorkoutId: "zzz" })).toEqual({
      state: "active",
      id: "zzz",
      name: "Treino",
    });
  });

  it("concluído hoje → done, sem sugerir outro", () => {
    expect(workoutCard({ ...base, completed: { workoutId: "a", name: "Peito e tríceps" } })).toEqual({
      state: "done",
      name: "Peito e tríceps",
    });
  });

  it("sessão aberta ganha de concluído (a aberta é o que dá pra fazer agora)", () => {
    const card = workoutCard({
      ...base,
      activeWorkoutId: "c",
      completed: { workoutId: "a", name: "Peito e tríceps" },
    });
    expect(card).toEqual({ state: "active", id: "c", name: "Pernas" });
  });

  it("nada ainda → suggested com o sorteado do dia", () => {
    const card = workoutCard(base);
    expect(card.state).toBe("suggested");
    const picked = pickWorkoutOfDay(W, "user-1", "2026-08-04")!;
    expect(card).toEqual({ state: "suggested", id: picked.id, name: picked.name });
  });
});
