import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
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

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  const checkin = await getCheckin(db, userId, day.data);
  return Response.json({ checkin });
}

export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PUT_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const checkin = await upsertCheckin(db, userId, parsed.data);
  return Response.json({ checkin });
}
