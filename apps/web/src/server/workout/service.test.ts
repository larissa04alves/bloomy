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

describe("summarizeWorkouts (streak de dias, pura)", () => {
  const now = new Date("2026-07-08T12:00:00Z"); // quarta; semana começa 2026-07-06 (seg)

  test("dias consecutivos terminando hoje", () => {
    const days = ["2026-07-06", "2026-07-07", "2026-07-08"];
    const r = summarizeWorkouts(days, now);
    expect(r.weekCount).toBe(3);
    expect(r.streak).toBe(3);
    expect(r.weekDays.filter(Boolean)).toHaveLength(3);
  });

  test("não treinou hoje, mas ontem sim: streak conta até ontem (dia em curso não quebra)", () => {
    const days = ["2026-07-06", "2026-07-07"]; // hoje (08) sem treino
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(2);
  });

  test("buraco na sequência quebra o streak", () => {
    const days = ["2026-07-04", "2026-07-06", "2026-07-07", "2026-07-08"]; // 05 faltou
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(3); // 06, 07, 08
  });

  test("sem treino recente: streak zero", () => {
    const days = ["2026-07-01"];
    const r = summarizeWorkouts(days, now);
    expect(r.streak).toBe(0);
  });
});

describe("startSession / completeSession (db em arquivo)", () => {
  test("pré-preenche do último treino, 1 ativa por vez, conclui com duração", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    // valores não-default de propósito (defaults do schema são 12 reps / 45s).
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [{ name: "Supino", targetSets: 4, targetReps: 8, restSeconds: 90, position: 0 }],
    });

    // 1ª sessão: registra carga e conclui → vira "último treino"
    const s1 = await startSession(db, userId, w.id);
    if (s1 === "already_active" || s1 === "not_found") throw new Error("unreachable");

    // 1ª sessão (sem histórico): campos do template propagados, reps = alvo, carga vazia.
    const ex1 = s1.exercises[0];
    expect(ex1.targetSets).toBe(4);
    expect(ex1.restSeconds).toBe(90);
    expect(ex1.sets).toHaveLength(4);
    expect(ex1.sets[0].reps).toBe(8);
    expect(ex1.sets[0].load).toBeNull();

    const firstSet = ex1.sets[0];
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

  test("completeSession duas vezes: a segunda retorna null (idempotente)", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [{ name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 }],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    expect(await completeSession(db, userId, s.session.id)).not.toBeNull();
    expect(await completeSession(db, userId, s.session.id)).toBeNull();
  });
});
