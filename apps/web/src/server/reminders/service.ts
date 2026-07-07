import "server-only";

import type { Db } from "@bloomy/db";
import { reminder, type Reminder } from "@bloomy/db/schema/reminder";
import { and, asc, eq } from "drizzle-orm";

export type ReminderInput = { type: Reminder["type"]; time: string };
export type ReminderUpdate = { time?: string; enabled?: boolean };

export async function listReminders(db: Db, userId: string): Promise<Reminder[]> {
  return db
    .select()
    .from(reminder)
    .where(eq(reminder.userId, userId))
    .orderBy(asc(reminder.time));
}

export async function createReminder(
  db: Db,
  userId: string,
  input: ReminderInput,
): Promise<Reminder> {
  const [created] = await db
    .insert(reminder)
    .values({ userId, type: input.type, time: input.time })
    .returning();
  return created;
}

export async function updateReminder(
  db: Db,
  userId: string,
  id: string,
  input: ReminderUpdate,
): Promise<Reminder | null> {
  const [updated] = await db
    .update(reminder)
    .set({
      ...(input.time !== undefined && { time: input.time }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      updatedAt: new Date(),
    })
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteReminder(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(reminder)
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    .returning();
  return deleted.length > 0;
}
