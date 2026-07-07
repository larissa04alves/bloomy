import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  completeSession,
  createWorkout,
  getActiveSession,
  startSession,
  summarizeWorkouts,
  updateSet,
} from "./service";

describe("summarizeWorkouts (streak, pura)", () => {
  const target = 3;
  const now = new Date("2026-07-08T12:00:00Z"); // quarta; semana começa 2026-07-06 (seg)

  test("semana anterior batida + semana corrente batida somam ao streak", () => {
    const days = [
      // semana anterior (2026-06-29..07-05): 3 dias
      "2026-06-29",
      "2026-07-01",
      "2026-07-03",
      // semana corrente: 3 dias
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
    ];
    const r = summarizeWorkouts(days, target, now);
    expect(r.weekCount).toBe(3);
    expect(r.streak).toBe(2);
    expect(r.weekDays.filter(Boolean)).toHaveLength(3);
  });

  test("semana anterior sem meta zera o streak das fechadas", () => {
    const days = ["2026-06-29", "2026-07-06", "2026-07-07", "2026-07-08"];
    const r = summarizeWorkouts(days, target, now);
    expect(r.streak).toBe(1); // só a corrente, que bateu
  });
});

describe("startSession / completeSession (db em arquivo)", () => {
  test("pré-preenche do último treino, 1 ativa por vez, conclui com duração", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [{ name: "Supino", targetSets: 2, position: 0 }],
    });

    // 1ª sessão: registra carga e conclui → vira "último treino"
    const s1 = await startSession(db, userId, w.id);
    if (s1 === "already_active" || s1 === "not_found") throw new Error("unreachable");
    const firstSet = s1.exercises[0].sets[0];
    await updateSet(db, userId, s1.session.id, firstSet.id, { reps: 10, load: 40, done: true });
    const done1 = await completeSession(db, userId, s1.session.id);
    expect(done1).not.toBeNull();
    expect(done1!.exerciseCount).toBe(1);

    // 2ª sessão: séries nascem pré-preenchidas com 40 kg · 10 reps
    const s2 = await startSession(db, userId, w.id);
    if (s2 === "already_active" || s2 === "not_found") throw new Error("unreachable");
    expect(s2.exercises[0].sets[0].load).toBe(40);
    expect(s2.exercises[0].sets[0].reps).toBe(10);

    // já há sessão ativa
    expect(await startSession(db, userId, w.id)).toBe("already_active");
    expect(await getActiveSession(db, userId)).not.toBeNull();
  });
});
