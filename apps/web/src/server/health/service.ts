import "server-only";

import { randomUUID } from "node:crypto";

import type { Db } from "@bloomy/db";
import {
  appointment,
  exam,
  type Appointment,
  type Exam,
} from "@bloomy/db/schema/health";
import { and, asc, eq, gte, isNotNull, lte, ne, or } from "drizzle-orm";

import type { ExamStorage } from "./r2";

const NEXT_WINDOW_DAYS = 30;

/** Soma meses preservando o instante (retorno sugerido). */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ---------- Consultas ----------

export type AppointmentInput = {
  professional: string;
  specialty?: string;
  scheduledAt: Date;
  location?: string;
  remindDayBefore?: boolean;
};

export type AppointmentUpdate = {
  professional?: string;
  specialty?: string;
  scheduledAt?: Date;
  location?: string;
  remindDayBefore?: boolean;
};

export async function listAppointments(db: Db, userId: string): Promise<Appointment[]> {
  return db
    .select()
    .from(appointment)
    .where(eq(appointment.userId, userId))
    .orderBy(asc(appointment.scheduledAt));
}

/** Próxima: consulta marcada futura, ou retorno a agendar dentro de 30 dias. */
export async function nextAppointment(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<Appointment | null> {
  const windowEnd = new Date(now.getTime() + NEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(appointment)
    .where(
      and(
        eq(appointment.userId, userId),
        or(
          and(eq(appointment.status, "scheduled"), gte(appointment.scheduledAt, now)),
          and(
            eq(appointment.status, "to_schedule"),
            isNotNull(appointment.suggestedAt),
            lte(appointment.suggestedAt, windowEnd),
          ),
        ),
      ),
    );

  const withDate = rows
    .map((r) => ({ r, at: r.scheduledAt ?? r.suggestedAt }))
    .filter((x): x is { r: Appointment; at: Date } => x.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return withDate[0]?.r ?? null;
}

export async function createAppointment(
  db: Db,
  userId: string,
  input: AppointmentInput,
): Promise<Appointment> {
  const [created] = await db
    .insert(appointment)
    .values({
      userId,
      professional: input.professional,
      specialty: input.specialty ?? null,
      status: "scheduled",
      scheduledAt: input.scheduledAt,
      location: input.location ?? null,
      remindDayBefore: input.remindDayBefore ?? false,
    })
    .returning();
  return created;
}

/** Parcial. Dar `scheduledAt` a um retorno `to_schedule` promove pra `scheduled`. */
export async function updateAppointment(
  db: Db,
  userId: string,
  id: string,
  input: AppointmentUpdate,
): Promise<Appointment | null> {
  const [updated] = await db
    .update(appointment)
    .set({
      ...(input.professional !== undefined && { professional: input.professional }),
      ...(input.specialty !== undefined && { specialty: input.specialty }),
      ...(input.scheduledAt !== undefined && {
        scheduledAt: input.scheduledAt,
        status: "scheduled" as const,
      }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.remindDayBefore !== undefined && { remindDayBefore: input.remindDayBefore }),
      updatedAt: new Date(),
    })
    .where(and(eq(appointment.id, id), eq(appointment.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteAppointment(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(appointment)
    .where(and(eq(appointment.id, id), eq(appointment.userId, userId)))
    .returning();
  return deleted.length > 0;
}

/** Conclui e, se pedir retorno, cria um novo item `to_schedule` copiando profissional. */
export async function completeAppointment(
  db: Db,
  userId: string,
  id: string,
  input: { needsReturn: boolean; followUpMonths?: number },
): Promise<{ completed: Appointment; followUp: Appointment | null } | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [completed] = await tx
      .update(appointment)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      // guarda de idempotência: retry/double-tap num item já concluído não recria o retorno
      .where(
        and(
          eq(appointment.id, id),
          eq(appointment.userId, userId),
          ne(appointment.status, "completed"),
        ),
      )
      .returning();
    if (!completed) return null;

    let followUp: Appointment | null = null;
    if (input.needsReturn) {
      const months = input.followUpMonths ?? 1;
      const [created] = await tx
        .insert(appointment)
        .values({
          userId,
          professional: completed.professional,
          specialty: completed.specialty,
          status: "to_schedule",
          suggestedAt: addMonths(now, months),
          parentId: completed.id,
        })
        .returning();
      followUp = created;
    }
    return { completed, followUp };
  });
}

// ---------- Exames ----------

export type ExamInput = {
  name: string;
  status?: Exam["status"];
  scheduledAt?: Date | null;
};

export type ExamUpdate = {
  name?: string;
  status?: Exam["status"];
  scheduledAt?: Date | null;
};

export async function listExams(db: Db, userId: string): Promise<Exam[]> {
  return db
    .select()
    .from(exam)
    .where(eq(exam.userId, userId))
    .orderBy(asc(exam.scheduledAt));
}

export async function createExam(
  db: Db,
  userId: string,
  input: ExamInput,
): Promise<Exam> {
  const [created] = await db
    .insert(exam)
    .values({
      userId,
      name: input.name,
      status: input.status ?? "to_schedule",
      scheduledAt: input.scheduledAt ?? null,
    })
    .returning();
  return created;
}

export async function updateExam(
  db: Db,
  userId: string,
  id: string,
  input: ExamUpdate,
): Promise<Exam | null> {
  const [updated] = await db
    .update(exam)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, id), eq(exam.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteExam(
  db: Db,
  storage: ExamStorage,
  userId: string,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .select({ key: exam.attachmentKey })
    .from(exam)
    .where(and(eq(exam.id, id), eq(exam.userId, userId)));
  if (!row) return false;

  await db.delete(exam).where(and(eq(exam.id, id), eq(exam.userId, userId)));

  if (row.key) {
    try {
      await storage.delete(row.key);
    } catch (err) {
      console.error(`R2 delete falhou (key=${row.key}):`, err);
    }
  }
  return true;
}

export async function completeExam(
  db: Db,
  userId: string,
  id: string,
  input: { needsReturn: boolean; followUpMonths?: number },
): Promise<{ completed: Exam; followUp: Exam | null } | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [completed] = await tx
      .update(exam)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      // guarda de idempotência: retry/double-tap num item já concluído não recria o retorno
      .where(
        and(eq(exam.id, id), eq(exam.userId, userId), ne(exam.status, "completed")),
      )
      .returning();
    if (!completed) return null;

    let followUp: Exam | null = null;
    if (input.needsReturn) {
      const months = input.followUpMonths ?? 1;
      const [created] = await tx
        .insert(exam)
        .values({
          userId,
          name: completed.name,
          status: "to_schedule",
          suggestedAt: addMonths(now, months),
          parentId: completed.id,
        })
        .returning();
      followUp = created;
    }
    return { completed, followUp };
  });
}

export type ExamStorageError = "not_found" | "wrong_status";
const KEY_PREFIX = "exam-attachments";

/** Anexa resultado a exame `awaiting_result`; troca substitui e apaga a chave antiga do R2. */
export async function attachExam(
  db: Db,
  storage: ExamStorage,
  userId: string,
  examId: string,
  file: { body: Uint8Array; mime: string; name: string; size: number },
): Promise<Exam | ExamStorageError> {
  const [current] = await db
    .select()
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!current) return "not_found";
  if (current.status !== "awaiting_result") return "wrong_status";

  const oldKey = current.attachmentKey;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 100) || "arquivo";
  const key = `${KEY_PREFIX}/${userId}/${examId}/${randomUUID()}-${safeName}`;

  await storage.put(key, file.body, file.mime);

  const [updated] = await db
    .update(exam)
    .set({
      attachmentKey: key,
      attachmentMime: file.mime,
      attachmentName: file.name,
      attachmentSize: file.size,
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)))
    .returning();

  // troca: remove o objeto antigo só depois do update persistir.
  if (oldKey) {
    try {
      await storage.delete(oldKey);
    } catch (err) {
      console.error(`R2 delete falhou (key=${oldKey}):`, err);
    }
  }
  return updated;
}

/** Limpa colunas de anexo do exame e apaga o objeto correspondente no R2. */
export async function removeExamAttachment(
  db: Db,
  storage: ExamStorage,
  userId: string,
  examId: string,
): Promise<Exam | null> {
  const [current] = await db
    .select()
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!current) return null;
  const oldKey = current.attachmentKey;

  const [updated] = await db
    .update(exam)
    .set({
      attachmentKey: null,
      attachmentMime: null,
      attachmentName: null,
      attachmentSize: null,
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)))
    .returning();

  if (oldKey) {
    try {
      await storage.delete(oldKey);
    } catch (err) {
      console.error(`R2 delete falhou (key=${oldKey}):`, err);
    }
  }
  return updated;
}

/** Metadados do anexo (p/ endpoint de download); só se todas as colunas estiverem preenchidas. */
export async function getExamAttachmentMeta(
  db: Db,
  userId: string,
  examId: string,
): Promise<{ key: string; mime: string; name: string } | null> {
  const [row] = await db
    .select({
      key: exam.attachmentKey,
      mime: exam.attachmentMime,
      name: exam.attachmentName,
    })
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!row?.key || !row.mime || !row.name) return null;
  return { key: row.key, mime: row.mime, name: row.name };
}
