import { describe, expect, test } from "bun:test";

import { exerciseCatalog, sessionExercise, setLog } from "@bloomy/db/schema/workout";
import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  addSessionExercise,
  applySessionToWorkout,
  completeSession,
  getActiveSession,
  removeSessionExercise,
  reorderSessionExercises,
  startSession,
  swapSessionExercise,
  updateSet,
} from "./session";
import { createWorkout, listWorkouts, updateWorkout } from "./service";

describe("migration session_exercise", () => {
  test("tabela existe e aceita insert após migrate", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    // sem FK de sessão real: só verifica que a migration criou a estrutura
    const rows = await db.select().from(sessionExercise);
    expect(rows).toEqual([]);
    expect(userId).toBe("user-test");
  });
});

describe("startSession com snapshot", () => {
  test("materializa session_exercise e liga as séries a ele", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 8, restSeconds: 90, position: 0 },
      ],
    });

    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(1);
    expect(rows[0].origin).toBe("template");
    expect(rows[0].exerciseId).toBe(w.exercises[0].id);

    const ex = s.exercises[0];
    expect(ex.id).toBe(rows[0].id);
    expect(ex.origin).toBe("template");
    expect(ex.sets).toHaveLength(2);
    expect(ex.sets.every((set) => set.sessionExerciseId === rows[0].id)).toBe(true);
  });

  test("editar o template não muda a lista de uma sessão já iniciada", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    await updateWorkout(db, userId, w.id, {
      exercises: [
        { name: "Puxada", targetSets: 3, targetReps: 10, restSeconds: 60, position: 0 },
      ],
    });

    const active = await getActiveSession(db, userId);
    expect(active!.exercises).toHaveLength(1);
    expect(active!.exercises[0].name).toBe("Remada");
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

describe("ajustes na sessão ativa", () => {
  async function setup() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    // FK real: catalogId de CRUCIFIXO ("0025") precisa existir em exercise_catalog
    await db.insert(exerciseCatalog).values({
      id: "0025",
      name: "barbell chest fly",
      namePt: "Crucifixo com barra",
      group: "chest",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "barbell",
      secondaryMuscles: [],
    });
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    return { db, userId, w, s };
  }

  const CRUCIFIXO = {
    name: "Crucifixo",
    targetSets: 3,
    targetReps: 12,
    restSeconds: 45,
    catalogId: "0025",
  };

  test("adicionar entra no fim da lista com as séries criadas", async () => {
    const { db, userId, s } = await setup();

    const detail = await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);
    if (detail === "duplicate" || detail === null) throw new Error("unreachable");
    expect(detail.exercises).toHaveLength(2);

    const added = detail.exercises[1];
    expect(added.name).toBe("Crucifixo");
    expect(added.origin).toBe("added");
    expect(added.exerciseId).toBeNull();
    expect(added.position).toBe(1);
    expect(added.sets).toHaveLength(3);
    expect(added.sets[0].reps).toBe(12); // sem histórico → reps-alvo
  });

  test("trocar preserva a posição, marca replaced e descarta as séries", async () => {
    const { db, userId, s } = await setup();
    const original = s.exercises[0];
    await updateSet(db, userId, s.session.id, original.sets[0].id, {
      reps: 10,
      load: 30,
      done: true,
    });

    const result = await swapSessionExercise(
      db,
      userId,
      s.session.id,
      original.id,
      CRUCIFIXO,
    );
    if (result === "duplicate" || result === null) throw new Error("unreachable");
    expect(result.discardedDoneSets).toBe(1);

    const swapped = result.session.exercises[0];
    expect(result.session.exercises).toHaveLength(1);
    expect(swapped.id).toBe(original.id); // mesma linha, mesmo slot
    expect(swapped.position).toBe(0);
    expect(swapped.name).toBe("Crucifixo");
    expect(swapped.origin).toBe("replaced");
    expect(swapped.sets).toHaveLength(3);
    expect(swapped.sets.every((set) => !set.done)).toBe(true);
  });

  test("trocar mantém o vínculo com o exercício do template", async () => {
    const { db, userId, w, s } = await setup();
    await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, CRUCIFIXO);

    const [row] = await db.select().from(sessionExercise);
    expect(row.exerciseId).toBe(w.exercises[0].id);
  });

  test("adicionar o mesmo catalogId duas vezes: a segunda é rejeitada", async () => {
    const { db, userId, s } = await setup();
    await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);

    const result = await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);
    expect(result).toBe("duplicate");

    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(2); // não cresceu além da 1ª adição
  });

  test("adicionar sem catalogId com nome repetido (variação de caixa/espaço) é rejeitado", async () => {
    const { db, userId, s } = await setup();
    const custom = { name: " TESTE ", targetSets: 3, targetReps: 10, restSeconds: 30 };
    await addSessionExercise(db, userId, s.session.id, custom);

    const result = await addSessionExercise(db, userId, s.session.id, {
      ...custom,
      name: "teste",
    });
    expect(result).toBe("duplicate");

    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(2); // não cresceu além da 1ª adição
  });

  test("trocar por um exercício que já está na lista é rejeitado", async () => {
    const { db, userId, s } = await setup();
    await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);

    const result = await swapSessionExercise(
      db,
      userId,
      s.session.id,
      s.exercises[0].id,
      CRUCIFIXO,
    );
    expect(result).toBe("duplicate");

    const rows = await db.select().from(sessionExercise);
    const original = rows.find((r) => r.id === s.exercises[0].id);
    expect(original!.name).toBe("Supino"); // não foi trocado
  });

  test("trocar um exercício por ele mesmo (mesmo catalogId, mesmo slot) é permitido", async () => {
    const { db, userId, s } = await setup();
    await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, CRUCIFIXO);

    const result = await swapSessionExercise(
      db,
      userId,
      s.session.id,
      s.exercises[0].id,
      CRUCIFIXO,
    );
    expect(result).not.toBe("duplicate");
    expect(result).not.toBeNull();
  });

  test("remover apaga a linha e as séries dela", async () => {
    const { db, userId, s } = await setup();

    const detail = await removeSessionExercise(db, userId, s.session.id, s.exercises[0].id);
    expect(detail!.exercises).toHaveLength(0);
    expect(await db.select().from(setLog)).toHaveLength(0);
  });

  test("ajustes não tocam no template: a próxima sessão nasce com a lista original", async () => {
    const { db, userId, w, s } = await setup();
    await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);
    await completeSession(db, userId, s.session.id);

    const next = await startSession(db, userId, w.id);
    if (next === "already_active" || next === "not_found") throw new Error("unreachable");
    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0].name).toBe("Supino");
  });

  test("sessão concluída não aceita adicionar", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);
    expect(await addSessionExercise(db, userId, s.session.id, CRUCIFIXO)).toBeNull();

    // nada foi persistido: a linha original do template segue intacta
    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Supino");
  });

  test("sessão concluída não aceita trocar", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);
    expect(
      await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, CRUCIFIXO),
    ).toBeNull();

    const [row] = await db.select().from(sessionExercise);
    expect(row.name).toBe("Supino"); // não foi trocado
    expect(row.origin).toBe("template");
  });

  test("sessão concluída não aceita remover", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);
    expect(await removeSessionExercise(db, userId, s.session.id, s.exercises[0].id)).toBeNull();

    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(1); // não foi removido
  });
});

describe("salvar no treino", () => {
  async function setupComAjustes() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await db.insert(exerciseCatalog).values([
      {
        id: "0030",
        name: "incline barbell bench press",
        namePt: "Supino inclinado com barra",
        group: "chest",
        bodyPart: "chest",
        target: "pectorals",
        equipment: "barbell",
        secondaryMuscles: [],
      },
      {
        id: "0025",
        name: "barbell chest fly",
        namePt: "Crucifixo com barra",
        group: "chest",
        bodyPart: "chest",
        target: "pectorals",
        equipment: "barbell",
        secondaryMuscles: [],
      },
    ]);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Voador", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    // troca o Supino, remove o Voador, adiciona o Crucifixo
    await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, {
      name: "Supino inclinado",
      targetSets: 3,
      targetReps: 10,
      restSeconds: 60,
      catalogId: "0030",
    });
    await removeSessionExercise(db, userId, s.session.id, s.exercises[1].id);
    await addSessionExercise(db, userId, s.session.id, {
      name: "Crucifixo",
      targetSets: 3,
      targetReps: 12,
      restSeconds: 45,
      catalogId: "0025",
    });
    return { db, userId, w, sessionId: s.session.id };
  }

  test("completeSession conta os ajustes e os exercícios da sessão", async () => {
    const { db, userId, sessionId } = await setupComAjustes();

    const done = await completeSession(db, userId, sessionId);
    expect(done!.exerciseCount).toBe(2); // Supino inclinado + Crucifixo
    expect(done!.adjustments).toEqual({
      added: 1,
      replaced: 1,
      removed: 1,
      reordered: false,
    });
  });

  test("sem ajuste, a contagem é zero", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    const done = await completeSession(db, userId, s.session.id);
    expect(done!.adjustments).toEqual({
      added: 0,
      replaced: 0,
      removed: 0,
      reordered: false,
    });
  });

  test("só reordenar marca reordered, sem contar como add/replace/remove", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Voador", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
        { name: "Crucifixo", targetSets: 3, targetReps: 12, restSeconds: 45, position: 2 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    const [supino, voador, crucifixo] = s.exercises;

    await reorderSessionExercises(db, userId, s.session.id, [
      crucifixo.id,
      supino.id,
      voador.id,
    ]);

    const done = await completeSession(db, userId, s.session.id);
    // é o que faz o card "Salvar no treino" aparecer numa sessão em que só mudou a ordem
    expect(done!.adjustments).toEqual({
      added: 0,
      replaced: 0,
      removed: 0,
      reordered: true,
    });
  });

  test("adicionar exercício no fim não conta como reordenação", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Puxada", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    await addSessionExercise(db, userId, s.session.id, {
      name: "Pulldown",
      targetSets: 3,
      targetReps: 12,
      restSeconds: 45,
    });

    const done = await completeSession(db, userId, s.session.id);
    expect(done!.adjustments.added).toBe(1);
    expect(done!.adjustments.reordered).toBe(false);
  });

  test("remover o exercício do meio não conta como reordenação", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Pernas",
      focus: "legs",
      exercises: [
        { name: "Agachamento", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Leg press", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
        { name: "Cadeira", targetSets: 2, targetReps: 12, restSeconds: 45, position: 2 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    await removeSessionExercise(db, userId, s.session.id, s.exercises[1].id);

    const done = await completeSession(db, userId, s.session.id);
    expect(done!.adjustments.removed).toBe(1);
    expect(done!.adjustments.reordered).toBe(false);
  });

  test("applySessionToWorkout reflete troca, remoção e adição no template", async () => {
    const { db, userId, w, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const updated = await applySessionToWorkout(db, userId, sessionId);
    expect(updated!.exercises.map((e) => e.name)).toEqual([
      "Supino inclinado",
      "Crucifixo",
    ]);
    expect(updated!.exercises.map((e) => e.position)).toEqual([0, 1]);
    // o slot trocado reusa a linha original do template, não duplica
    expect(updated!.exercises[0].id).toBe(w.exercises[0].id);
    expect(updated!.exercises[0].targetSets).toBe(3);
  });

  test("applySessionToWorkout é idempotente", async () => {
    const { db, userId, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const first = await applySessionToWorkout(db, userId, sessionId);
    const second = await applySessionToWorkout(db, userId, sessionId);
    expect(second!.exercises.map((e) => e.name)).toEqual(
      first!.exercises.map((e) => e.name),
    );
    expect(second!.exercises.map((e) => e.id)).toEqual(first!.exercises.map((e) => e.id));
    expect(second!.exercises).toHaveLength(2);
  });

  test("não aplicar deixa o template intacto", async () => {
    const { db, userId, w, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const [fresh] = (await listWorkouts(db, userId)).filter((x) => x.id === w.id);
    expect(fresh.exercises.map((e) => e.name)).toEqual(["Supino", "Voador"]);
  });
});

describe("reorderSessionExercises", () => {
  async function setup() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Voador", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
        { name: "Crucifixo", targetSets: 3, targetReps: 12, restSeconds: 45, position: 2 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    return { db, userId, w, s };
  }

  test("permutação válida renumera position como 0..n-1 na ordem recebida", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;

    const updated = await reorderSessionExercises(db, userId, s.session.id, [
      crucifixo.id,
      supino.id,
      voador.id,
    ]);

    if (updated === null || updated === "mismatch") throw new Error("unreachable");
    expect(updated.exercises.map((e) => e.name)).toEqual(["Crucifixo", "Supino", "Voador"]);
    expect(updated.exercises.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test("reorder não mexe nas séries já registradas", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;
    await updateSet(db, userId, s.session.id, supino.sets[0].id, {
      reps: 10,
      load: 40,
      done: true,
    });

    const updated = await reorderSessionExercises(db, userId, s.session.id, [
      voador.id,
      crucifixo.id,
      supino.id,
    ]);
    if (updated === null || updated === "mismatch") throw new Error("unreachable");

    const moved = updated.exercises.find((e) => e.id === supino.id)!;
    expect(moved.position).toBe(2);
    expect(moved.sets).toHaveLength(2);
    expect(moved.sets.filter((set) => set.done)).toHaveLength(1);
    expect(moved.sets[0].load).toBe(40);
  });

  test("id faltando → mismatch e nenhuma posição muda", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [voador.id, supino.id]),
    ).toBe("mismatch");

    const rows = await db.select().from(sessionExercise);
    expect(rows.map((r) => `${r.name}:${r.position}`).sort()).toEqual([
      "Crucifixo:2",
      "Supino:0",
      "Voador:1",
    ]);
  });

  test("id repetido → mismatch", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [
        supino.id,
        supino.id,
        voador.id,
      ]),
    ).toBe("mismatch");
  });

  test("id que não pertence à sessão → mismatch", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [
        supino.id,
        voador.id,
        "id-que-nao-existe",
      ]),
    ).toBe("mismatch");
  });

  test("id de outra sessão do mesmo usuário → mismatch", async () => {
    const { db, userId, s } = await setup();
    // só há 1 sessão ativa por vez: conclui a atual pra poder abrir a segunda
    await completeSession(db, userId, s.session.id);
    const foreignId = s.exercises[0].id; // pertence à sessão já concluída, não à nova

    const w2 = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 },
        { name: "Puxada", targetSets: 1, targetReps: 10, restSeconds: 45, position: 1 },
      ],
    });
    const s2 = await startSession(db, userId, w2.id);
    if (s2 === "already_active" || s2 === "not_found") throw new Error("unreachable");
    const [, puxada] = s2.exercises;

    expect(
      await reorderSessionExercises(db, userId, s2.session.id, [foreignId, puxada.id]),
    ).toBe("mismatch");
  });

  test("sessão de outro usuário → null", async () => {
    const { db, s } = await setup();
    const outro = await createTestUser(db, "user-2");

    expect(
      await reorderSessionExercises(
        db,
        outro,
        s.session.id,
        s.exercises.map((e) => e.id),
      ),
    ).toBeNull();
  });

  test("sessão já concluída → null", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);

    expect(
      await reorderSessionExercises(
        db,
        userId,
        s.session.id,
        s.exercises.map((e) => e.id).reverse(),
      ),
    ).toBeNull();
  });

  test("applySessionToWorkout depois do reorder leva a ordem nova pro template", async () => {
    const { db, userId, w, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;

    await reorderSessionExercises(db, userId, s.session.id, [
      crucifixo.id,
      supino.id,
      voador.id,
    ]);
    const updatedWorkout = await applySessionToWorkout(db, userId, s.session.id);

    expect(updatedWorkout!.id).toBe(w.id);
    expect(updatedWorkout!.exercises.map((e) => e.name)).toEqual([
      "Crucifixo",
      "Supino",
      "Voador",
    ]);
    expect(updatedWorkout!.exercises.map((e) => e.position)).toEqual([0, 1, 2]);
  });
});
