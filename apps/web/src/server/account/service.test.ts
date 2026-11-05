import { afterAll, describe, expect, test } from "bun:test";

import type { Db } from "@bloomy/db";
import { user } from "@bloomy/db/schema/auth";
import { meal, medication, medicationIntake, waterLog } from "@bloomy/db/schema/body";
import { appointment, exam } from "@bloomy/db/schema/health";
import { moodCheckin } from "@bloomy/db/schema/mind";
import { pushSubscription, reminder } from "@bloomy/db/schema/reminder";
import { sessionExercise, setLog, workout, workoutSession } from "@bloomy/db/schema/workout";
import { eq } from "drizzle-orm";

import { createAppointment, createExam } from "@/server/health/service";
import type { ExamStorage } from "@/server/health/r2";
import { addMeal } from "@/server/meals/service";
import { createMedication, markIntake } from "@/server/medications/service";
import { upsertCheckin } from "@/server/mind/service";
import { listReminders } from "@/server/reminders/service";
import { dayFor } from "@/server/shared/day";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { addWater } from "@/server/water/service";
import { createWorkout } from "@/server/workout/service";
import { startSession, updateSet } from "@/server/workout/session";

import { deleteAccount } from "./service";

afterAll(cleanupTestDbs);

function fakeStorage(opts: { fail?: boolean } = {}) {
  const calls: { del: string[] } = { del: [] };
  const storage: ExamStorage = {
    async put() {},
    async get() {
      return { body: new ReadableStream() };
    },
    async delete(key) {
      calls.del.push(key);
      if (opts.fail) throw new Error("R2 indisponível");
    },
  };
  return { storage, calls };
}

async function examWithAttachment(db: Db, userId: string, key: string) {
  const created = await createExam(db, userId, { name: "Hemograma" });
  if (created === "missing_schedule") throw new Error("fixture inválida");
  await db.update(exam).set({ attachmentKey: key }).where(eq(exam.id, created.id));
  return created.id;
}

describe("deleteAccount", () => {
  test("apaga o usuário e tudo dele", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await addWater(db, userId, 250);
    await addMeal(db, userId, { type: "lunch", items: [{ name: "arroz", grams: 150 }] });
    const med = await createMedication(db, userId, { name: "Vitamina D", times: ["08:00"] });
    expect(await markIntake(db, userId, { medicationId: med.id, time: "08:00", day: dayFor() })).toBe("ok");
    await upsertCheckin(db, userId, { mood: "good", anxiety: 2 });
    const appt = await createAppointment(db, userId, { professional: "Dra. Marina", status: "to_schedule" });
    if (appt === "missing_schedule") throw new Error("fixture inválida");
    await examWithAttachment(db, userId, "k1");

    const w = await createWorkout(db, userId, {
      name: "Peito",
      focuses: ["chest"],
      exercises: [{ name: "Supino", targetSets: 2, targetReps: 8, restSeconds: 90, position: 0 }],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    const set = s.exercises[0].sets[0];
    expect(await updateSet(db, userId, s.session.id, set.id, { reps: 8, load: 20, done: true })).not.toBeNull();

    await listReminders(db, userId);
    await db.insert(pushSubscription).values({ userId, endpoint: "https://push/1", p256dh: "p", auth: "a" });

    const { storage, calls } = fakeStorage();
    await deleteAccount(db, storage, userId);

    expect(calls.del).toEqual(["k1"]);
    expect(await db.select().from(user).where(eq(user.id, userId))).toEqual([]);
    expect(await db.select().from(waterLog).where(eq(waterLog.userId, userId))).toEqual([]);
    expect(await db.select().from(meal).where(eq(meal.userId, userId))).toEqual([]);
    expect(await db.select().from(medication).where(eq(medication.userId, userId))).toEqual([]);
    expect(await db.select().from(medicationIntake).where(eq(medicationIntake.userId, userId))).toEqual([]);
    expect(await db.select().from(moodCheckin).where(eq(moodCheckin.userId, userId))).toEqual([]);
    expect(await db.select().from(appointment).where(eq(appointment.userId, userId))).toEqual([]);
    expect(await db.select().from(exam).where(eq(exam.userId, userId))).toEqual([]);
    expect(await db.select().from(workout).where(eq(workout.userId, userId))).toEqual([]);
    expect(await db.select().from(workoutSession).where(eq(workoutSession.userId, userId))).toEqual([]);
    expect(await db.select().from(sessionExercise).where(eq(sessionExercise.userId, userId))).toEqual([]);
    expect(await db.select().from(setLog).where(eq(setLog.userId, userId))).toEqual([]);
    expect(await db.select().from(reminder).where(eq(reminder.userId, userId))).toEqual([]);
    expect(await db.select().from(pushSubscription).where(eq(pushSubscription.userId, userId))).toEqual([]);
  });

  test("não toca em outro usuário", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db, "alvo");
    const other = await createTestUser(db, "outra");
    await examWithAttachment(db, userId, "k-alvo");
    await addWater(db, other, 300);
    const otherExam = await examWithAttachment(db, other, "k-outra");

    const { storage, calls } = fakeStorage();
    await deleteAccount(db, storage, userId);

    expect(calls.del).toEqual(["k-alvo"]);
    expect(await db.select().from(user).where(eq(user.id, other))).toHaveLength(1);
    expect(await db.select().from(waterLog).where(eq(waterLog.userId, other))).toHaveLength(1);
    const [kept] = await db.select().from(exam).where(eq(exam.id, otherExam));
    expect(kept.attachmentKey).toBe("k-outra");
  });

  test("R2 falhou: nada some do banco", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const examId = await examWithAttachment(db, userId, "k1");

    const { storage } = fakeStorage({ fail: true });
    await expect(deleteAccount(db, storage, userId)).rejects.toThrow();

    expect(await db.select().from(user).where(eq(user.id, userId))).toHaveLength(1);
    expect(await db.select().from(exam).where(eq(exam.id, examId))).toHaveLength(1);
  });
});
