import { db } from "@bloomy/db";
import { z } from "zod";

import {
  badRequest,
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { resolveDay } from "@/server/shared/day";
import { getCheckin, upsertCheckin } from "@/server/mind/service";

const PUT_SCHEMA = z
  .object({
    mood: z.enum(["sad", "meh", "neutral", "good", "great"]).optional(),
    anxiety: z.number().int().min(0).max(100).optional(),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (v) => v.mood !== undefined || v.anxiety !== undefined || v.note !== undefined,
    { message: "at least one field required" },
  );

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  const checkin = await getCheckin(db, userId, day.day);
  return Response.json({ checkin });
}

export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PUT_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const checkin = await upsertCheckin(db, userId, parsed.data);
  return Response.json({ checkin });
}
