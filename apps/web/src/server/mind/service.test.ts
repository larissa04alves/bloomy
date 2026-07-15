import { describe, expect, test } from "bun:test";

import { mindNote, moodCheckin } from "@bloomy/db/schema/mind";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { dayFor } from "@/server/shared/day";
import { createNote, getCheckin, listNotes, upsertCheckin } from "./service";

describe("upsertCheckin (1 por dia)", () => {
  test("não duplica no mesmo dia e atualização parcial preserva campos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await upsertCheckin(db, userId, { mood: "good", anxiety: 20 });
    await upsertCheckin(db, userId, { note: "dia tranquilo" });

    const checkin = await getCheckin(db, userId, dayFor());
    expect(checkin).not.toBeNull();
    expect(checkin!.mood).toBe("good");
    expect(checkin!.anxiety).toBe(20);
    expect(checkin!.note).toBe("dia tranquilo");

    const all = await db.select().from(moodCheckin);
    expect(all).toHaveLength(1);
  });
});

describe("createNote (vários relatos por dia)", () => {
  test("adiciona sem sobrescrever", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await createNote(db, userId, { note: "manhã difícil", mood: "sad" });
    await createNote(db, userId, { note: "melhorou à tarde", mood: "good" });

    const all = await db.select().from(mindNote);
    expect(all).toHaveLength(2);
    expect(all.map((n) => n.note).sort()).toEqual(["manhã difícil", "melhorou à tarde"]);
  });

  test("listNotes ordena do mais recente ao mais antigo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    // createdAt explícito e distinto → ordem determinística (default seria mesmo ms).
    await db.insert(mindNote).values({ userId, day: "2026-07-15", note: "antigo", createdAt: new Date(1000) });
    await db.insert(mindNote).values({ userId, day: "2026-07-15", note: "novo", createdAt: new Date(2000) });

    const listed = await listNotes(db, userId, 30);
    expect(listed.map((n) => n.note)).toEqual(["novo", "antigo"]);
  });
});
