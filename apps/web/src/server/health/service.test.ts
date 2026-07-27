import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  completeAppointment,
  createAppointment,
  listAppointments,
  nextAppointment,
} from "./service";
import {
  attachExam,
  completeExam,
  createExam,
  deleteExam,
  getExamAttachmentMeta,
  listExams,
  markExamDone,
  removeExamAttachment,
  updateExam,
} from "./service";
import type { ExamStorageError } from "./service";
import type { ExamStorage } from "./r2";

async function makeExam(...args: Parameters<typeof createExam>) {
  const created = await createExam(...args);
  if (created === "missing_schedule")
    throw new Error("fixture inválida: falta scheduledAt");
  return created;
}

function fakeStorage() {
  const calls: { put: string[]; del: string[] } = { put: [], del: [] };
  const storage: ExamStorage = {
    async put(key) {
      calls.put.push(key);
    },
    async get() {
      return { body: new ReadableStream() };
    },
    async delete(key) {
      calls.del.push(key);
    },
  };
  return { storage, calls };
}

const FILE = {
  body: new Uint8Array([1, 2, 3]),
  mime: "application/pdf",
  name: "r.pdf",
  size: 3,
};

describe("completeAppointment (ciclo de retorno)", () => {
  test("needsReturn cria retorno to_schedule copiando profissional", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      specialty: "Nutricionista",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
      followUpMonths: 3,
    });

    expect(result).not.toBeNull();
    expect(result!.completed.status).toBe("completed");
    expect(result!.followUp).not.toBeNull();
    expect(result!.followUp!.status).toBe("to_schedule");
    expect(result!.followUp!.professional).toBe("Dra. Marina");
    expect(result!.followUp!.specialty).toBe("Nutricionista");
    expect(result!.followUp!.parentId).toBe(appt.id);
    expect(result!.followUp!.suggestedAt).not.toBeNull();
  });

  test("needsReturn=false não cria retorno", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dr. Paulo",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, {
      needsReturn: false,
    });
    expect(result!.followUp).toBeNull();
  });

  test("double-tap não recria retorno (idempotente)", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const first = await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
    });
    expect(first!.followUp).not.toBeNull();

    const second = await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
    });
    expect(second).toBeNull();

    const followUps = (await listAppointments(db, userId)).filter(
      (a) => a.status === "to_schedule",
    );
    expect(followUps).toHaveLength(1);
  });
});

describe("nextAppointment (janela de 30 dias)", () => {
  test("retorna consulta marcada futura", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await createAppointment(db, userId, {
      professional: "Perto",
      scheduledAt: soon,
    });

    const next = await nextAppointment(db, userId);
    expect(next).not.toBeNull();
    expect(next!.professional).toBe("Perto");
  });

  test("ignora retorno com data sugerida além de 30 dias", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // passada
    });
    // retorno sugerido 6 meses adiante → fora da janela de 30 dias
    await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
      followUpMonths: 6,
    });

    const next = await nextAppointment(db, userId);
    expect(next).toBeNull();
  });
});

describe("attachExam", () => {
  test("anexa em exame awaiting_result: grava colunas e sobe pro R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage, calls } = fakeStorage();

    const result = await attachExam(db, storage, userId, exam.id, FILE);

    expect(result).not.toBe("not_found");
    expect(result).not.toBe("wrong_status");
    const updated = result as Exclude<
      Awaited<ReturnType<typeof attachExam>>,
      ExamStorageError
    >;
    expect(updated.attachmentName).toBe("r.pdf");
    expect(updated.attachmentMime).toBe("application/pdf");
    expect(updated.attachmentSize).toBe(3);
    expect(updated.attachmentKey).toContain(
      `exam-attachments/${userId}/${exam.id}/`,
    );
    expect(calls.put).toHaveLength(1);
    expect(calls.del).toHaveLength(0);
  });

  test("troca: sobe o novo e deleta a chave antiga do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage, calls } = fakeStorage();

    const first = (await attachExam(db, storage, userId, exam.id, FILE)) as {
      attachmentKey: string;
    };
    await attachExam(db, storage, userId, exam.id, {
      ...FILE,
      name: "novo.pdf",
    });

    expect(calls.put).toHaveLength(2);
    expect(calls.del).toEqual([first.attachmentKey]);
  });

  test("exame de outra usuária → not_found", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db);
    const exam = await makeExam(db, owner, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage } = fakeStorage();
    const other = await createTestUser(db, "user-other");

    expect(await attachExam(db, storage, other, exam.id, FILE)).toBe(
      "not_found",
    );
  });

  test("exame ainda não feito (scheduled) → wrong_status, sem tocar no R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "scheduled",
      scheduledAt: new Date("2026-08-01T10:00:00Z"),
    });
    const { storage, calls } = fakeStorage();

    expect(await attachExam(db, storage, userId, exam.id, FILE)).toBe(
      "wrong_status",
    );
    expect(calls.put).toHaveLength(0);
  });

  test("to_schedule → wrong_status", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, { name: "Hemograma" });
    const { storage } = fakeStorage();

    expect(await attachExam(db, storage, userId, exam.id, FILE)).toBe(
      "wrong_status",
    );
  });

  // Anexar o laudo é o que fecha o exame.
  test("anexa em awaiting_result → conclui e vai pro histórico", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage, calls } = fakeStorage();

    const result = await attachExam(db, storage, userId, exam.id, FILE);

    expect((result as { attachmentName: string | null }).attachmentName).toBe(
      "r.pdf",
    );
    expect((result as { status: string }).status).toBe("completed");
    expect((result as { completedAt: Date | null }).completedAt).not.toBeNull();
    expect(calls.put).toHaveLength(1);
  });

  test("troca de anexo em exame já concluído não remexe no status", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage } = fakeStorage();
    await attachExam(db, storage, userId, exam.id, FILE); // conclui
    const first = await completeExam(db, userId, exam.id); // já concluído → null

    const again = await attachExam(db, storage, userId, exam.id, {
      ...FILE,
      name: "novo.pdf",
    });

    expect(first).toBeNull();
    expect((again as { attachmentName: string | null }).attachmentName).toBe(
      "novo.pdf",
    );
    expect((again as { status: string }).status).toBe("completed");
  });
});

describe("markExamDone (exame feito, laudo pendente)", () => {
  const WHEN = new Date("2026-08-01T10:00:00Z");
  const scheduled = {
    name: "Hemograma",
    status: "scheduled" as const,
    scheduledAt: WHEN,
  };

  test("com retorno: fica em awaiting_result e cria o retorno to_schedule", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, scheduled);

    const result = await markExamDone(db, userId, exam.id, {
      needsReturn: true,
      followUpMonths: 3,
    });

    // o original NÃO vai pro histórico: falta o laudo
    expect(result!.done.status).toBe("awaiting_result");
    expect(result!.done.completedAt).toBeNull();
    expect(result!.followUp!.status).toBe("to_schedule");
    expect(result!.followUp!.name).toBe("Hemograma");
    expect(result!.followUp!.parentId).toBe(exam.id);
    expect(result!.followUp!.suggestedAt).not.toBeNull();
  });

  test("sem retorno: fica em awaiting_result e não cria nada", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, scheduled);

    const result = await markExamDone(db, userId, exam.id, {
      needsReturn: false,
    });

    expect(result!.done.status).toBe("awaiting_result");
    expect(result!.followUp).toBeNull();
  });

  test("double-tap não cria um segundo retorno", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, scheduled);

    const first = await markExamDone(db, userId, exam.id, {
      needsReturn: true,
    });
    const second = await markExamDone(db, userId, exam.id, {
      needsReturn: true,
    });

    expect(first!.followUp).not.toBeNull();
    expect(second).toBeNull();
    const retornos = (await listExams(db, userId)).filter(
      (e) => e.parentId === exam.id,
    );
    expect(retornos).toHaveLength(1);
  });

  test("completeExam manda pro histórico sem laudo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, scheduled);
    await markExamDone(db, userId, exam.id, { needsReturn: false });

    const done = await completeExam(db, userId, exam.id);

    expect(done!.status).toBe("completed");
    expect(done!.completedAt).not.toBeNull();
    expect(done!.attachmentName).toBeNull();
  });

  test("exame de outra usuária → null", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db);
    const exam = await makeExam(db, owner, scheduled);
    const other = await createTestUser(db, "user-other");

    expect(
      await markExamDone(db, other, exam.id, { needsReturn: true }),
    ).toBeNull();
    expect(await completeExam(db, other, exam.id)).toBeNull();
  });
});

describe("removeExamAttachment / getExamAttachmentMeta / deleteExam cleanup", () => {
  test("remove: limpa colunas e deleta objeto", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(
      db,
      storage,
      userId,
      exam.id,
      FILE,
    )) as Exclude<Awaited<ReturnType<typeof attachExam>>, ExamStorageError>;

    const result = await removeExamAttachment(db, storage, userId, exam.id);

    expect(result!.attachmentKey).toBeNull();
    expect(result!.attachmentName).toBeNull();
    expect(calls.del).toEqual([attached.attachmentKey!]);
  });

  test("getExamAttachmentMeta devolve chave/mime/nome do dono", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage } = fakeStorage();
    await attachExam(db, storage, userId, exam.id, FILE);

    const meta = await getExamAttachmentMeta(db, userId, exam.id);
    expect(meta!.name).toBe("r.pdf");
    expect(meta!.mime).toBe("application/pdf");
    expect(meta!.key).toContain("exam-attachments/");
  });

  test("getExamAttachmentMeta: sem anexo → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    expect(await getExamAttachmentMeta(db, userId, exam.id)).toBeNull();
  });

  test("deleteExam com anexo remove o objeto do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "awaiting_result",
    });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(
      db,
      storage,
      userId,
      exam.id,
      FILE,
    )) as Exclude<Awaited<ReturnType<typeof attachExam>>, ExamStorageError>;

    expect(await deleteExam(db, storage, userId, exam.id)).toBe(true);
    expect(calls.del).toEqual([attached.attachmentKey!]);
  });
});

describe("exame agendado exige data", () => {
  const WHEN = new Date("2026-08-01T10:00:00Z");

  test("createExam: scheduled sem data → missing_schedule", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(
      await createExam(db, userId, { name: "Hemograma", status: "scheduled" }),
    ).toBe("missing_schedule");
  });

  test("createExam: scheduled com data cria normalmente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const created = await makeExam(db, userId, {
      name: "Hemograma",
      status: "scheduled",
      scheduledAt: WHEN,
    });
    expect(created.status).toBe("scheduled");
    expect(created.scheduledAt).toEqual(WHEN);
  });

  test("createExam: to_schedule sem data continua válido", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const created = await makeExam(db, userId, { name: "Hemograma" });
    expect(created.status).toBe("to_schedule");
    expect(created.scheduledAt).toBeNull();
  });

  test("updateExam: promover a scheduled sem data → missing_schedule", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, { name: "Hemograma" });

    expect(await updateExam(db, userId, exam.id, { status: "scheduled" })).toBe(
      "missing_schedule",
    );
    // recusa não grava: segue to_schedule
    const after = await updateExam(db, userId, exam.id, { name: "Hemograma" });
    expect(after).not.toBeNull();
    expect((after as { status: string }).status).toBe("to_schedule");
  });

  test("updateExam: status+data no mesmo patch é aceito", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, { name: "Hemograma" });

    const updated = await updateExam(db, userId, exam.id, {
      status: "scheduled",
      scheduledAt: WHEN,
    });
    expect((updated as { status: string; scheduledAt: Date }).status).toBe(
      "scheduled",
    );
    expect(
      (updated as { status: string; scheduledAt: Date }).scheduledAt,
    ).toEqual(WHEN);
  });

  test("updateExam: já agendado, patch só de nome mantém válido", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "scheduled",
      scheduledAt: WHEN,
    });

    const updated = await updateExam(db, userId, exam.id, {
      name: "Hemograma completo",
    });
    expect((updated as { name: string }).name).toBe("Hemograma completo");
  });

  test("updateExam: limpar a data de um exame agendado → missing_schedule", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await makeExam(db, userId, {
      name: "Hemograma",
      status: "scheduled",
      scheduledAt: WHEN,
    });

    expect(await updateExam(db, userId, exam.id, { scheduledAt: null })).toBe(
      "missing_schedule",
    );
  });

  test("updateExam: exame de outra usuária → null", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db);
    const exam = await makeExam(db, owner, { name: "Hemograma" });
    const other = await createTestUser(db, "user-other");

    expect(await updateExam(db, other, exam.id, { name: "X" })).toBeNull();
  });
});
