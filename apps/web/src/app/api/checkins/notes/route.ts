import { db } from "@bloomy/db";
import { z } from "zod";

import {
  badRequest,
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { createNote, listNotes } from "@/server/mind/service";

const POST_SCHEMA = z.object({
  note: z.string().trim().min(1).max(2000),
  mood: z.enum(["sad", "meh", "neutral", "good", "great"]).nullish(),
});

const LIMIT_SCHEMA = z.coerce.number().int().min(1).max(100);

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("limit");
  const limit = raw ? LIMIT_SCHEMA.safeParse(raw) : { success: true as const, data: 30 };
  if (!limit.success) return badRequest("invalid limit");

  const notes = await listNotes(db, userId, limit.data);
  return Response.json({ notes });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = POST_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const note = await createNote(db, userId, {
    note: parsed.data.note,
    mood: parsed.data.mood ?? null,
  });
  return Response.json({ note }, { status: 201 });
}
