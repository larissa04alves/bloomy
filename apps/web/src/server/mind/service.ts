import "server-only";

import type { Db } from "@bloomy/db";
import { moodCheckin, type MoodCheckin, mindNote, type MindNote } from "@bloomy/db/schema/mind";
import { and, desc, eq } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

export type Mood = NonNullable<MoodCheckin["mood"]>;

export type CheckinInput = {
  mood?: Mood;
  anxiety?: number;
  note?: string;
};

/** Um check-in por (usuário, dia): humor + ansiedade + nota (upsert). */
export async function upsertCheckin(
  db: Db,
  userId: string,
  input: CheckinInput,
): Promise<MoodCheckin> {
  const day = dayFor();
  const [row] = await db
    .insert(moodCheckin)
    .values({
      userId,
      day,
      mood: input.mood ?? null,
      anxiety: input.anxiety ?? null,
      note: input.note ?? null,
    })
    .onConflictDoUpdate({
      target: [moodCheckin.userId, moodCheckin.day],
      set: {
        ...(input.mood !== undefined && { mood: input.mood }),
        ...(input.anxiety !== undefined && { anxiety: input.anxiety }),
        ...(input.note !== undefined && { note: input.note }),
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function getCheckin(
  db: Db,
  userId: string,
  day: string,
): Promise<MoodCheckin | null> {
  const [row] = await db
    .select()
    .from(moodCheckin)
    .where(and(eq(moodCheckin.userId, userId), eq(moodCheckin.day, day)));
  return row ?? null;
}

export async function listCheckins(
  db: Db,
  userId: string,
  limit: number,
): Promise<MoodCheckin[]> {
  return db
    .select()
    .from(moodCheckin)
    .where(eq(moodCheckin.userId, userId))
    .orderBy(desc(moodCheckin.day))
    .limit(limit);
}

export type NoteInput = { note: string; mood?: Mood | null };

/** Cria um relato do dia (vários por dia — nunca sobrescreve). */
export async function createNote(
  db: Db,
  userId: string,
  input: NoteInput,
): Promise<MindNote> {
  const day = dayFor();
  const [row] = await db
    .insert(mindNote)
    .values({ userId, day, note: input.note, mood: input.mood ?? null })
    .returning();
  return row;
}

/** Relatos do usuário, mais recentes primeiro. */
export async function listNotes(
  db: Db,
  userId: string,
  limit: number,
): Promise<MindNote[]> {
  return db
    .select()
    .from(mindNote)
    .where(eq(mindNote.userId, userId))
    .orderBy(desc(mindNote.createdAt))
    .limit(limit);
}
