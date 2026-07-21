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
  createExam,
  deleteExam,
  getExamAttachmentMeta,
  removeExamAttachment,
} from "./service";
import type { ExamStorageError } from "./service";
import type { ExamStorage } from "./r2";

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

const FILE = { body: new Uint8Array([1, 2, 3]), mime: "application/pdf", name: "r.pdf", size: 3 };

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

    const result = await completeAppointment(db, userId, appt.id, { needsReturn: false });
    expect(result!.followUp).toBeNull();
  });

  test("double-tap não recria retorno (idempotente)", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const first = await completeAppointment(db, userId, appt.id, { needsReturn: true });
    expect(first!.followUp).not.toBeNull();

    const second = await completeAppointment(db, userId, appt.id, { needsReturn: true });
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
    await createAppointment(db, userId, { professional: "Perto", scheduledAt: soon });

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
    await completeAppointment(db, userId, appt.id, { needsReturn: true, followUpMonths: 6 });

    const next = await nextAppointment(db, userId);
    expect(next).toBeNull();
  });
});

describe("attachExam", () => {
  test("anexa em exame awaiting_result: grava colunas e sobe pro R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
    const { storage, calls } = fakeStorage();

    const result = await attachExam(db, storage, userId, exam.id, FILE);

    expect(result).not.toBe("not_found");
    expect(result).not.toBe("wrong_status");
    const updated = result as Exclude<Awaited<ReturnType<typeof attachExam>>, ExamStorageError>;
    expect(updated.attachmentName).toBe("r.pdf");
    expect(updated.attachmentMime).toBe("application/pdf");
    expect(updated.attachmentSize).toBe(3);
    expect(updated.attachmentKey).toContain(`exam-attachments/${userId}/${exam.id}/`);
    expect(calls.put).toHaveLength(1);
    expect(calls.del).toHaveLength(0);
  });

  test("troca: sobe o novo e deleta a chave antiga do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
    const { storage, calls } = fakeStorage();

    const first = (await attachExam(db, storage, userId, exam.id, FILE)) as { attachmentKey: string };
    await attachExam(db, storage, userId, exam.id, { ...FILE, name: "novo.pdf" });

    expect(calls.put).toHaveLength(2);
    expect(calls.del).toEqual([first.attachmentKey]);
  });

  test("exame de outra usuária → not_found", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db);
    const exam = await createExam(db, owner, { name: "Hemograma", status: "awaiting_result" });
    const { storage } = fakeStorage();
    const other = await createTestUser(db, "user-other");

    expect(await attachExam(db, storage, other, exam.id, FILE)).toBe("not_found");
  });

  test("status ≠ awaiting_result → wrong_status, sem tocar no R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "scheduled" });
    const { storage, calls } = fakeStorage();

    expect(await attachExam(db, storage, userId, exam.id, FILE)).toBe("wrong_status");
    expect(calls.put).toHaveLength(0);
  });
});

describe("removeExamAttachment / getExamAttachmentMeta / deleteExam cleanup", () => {
  test("remove: limpa colunas e deleta objeto", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(db, storage, userId, exam.id, FILE)) as Exclude<
      Awaited<ReturnType<typeof attachExam>>,
      ExamStorageError
    >;

    const result = await removeExamAttachment(db, storage, userId, exam.id);

    expect(result!.attachmentKey).toBeNull();
    expect(result!.attachmentName).toBeNull();
    expect(calls.del).toEqual([attached.attachmentKey!]);
  });

  test("getExamAttachmentMeta devolve chave/mime/nome do dono", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
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
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
    expect(await getExamAttachmentMeta(db, userId, exam.id)).toBeNull();
  });

  test("deleteExam com anexo remove o objeto do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(db, storage, userId, exam.id, FILE)) as Exclude<
      Awaited<ReturnType<typeof attachExam>>,
      ExamStorageError
    >;

    expect(await deleteExam(db, storage, userId, exam.id)).toBe(true);
    expect(calls.del).toEqual([attached.attachmentKey!]);
  });
});
