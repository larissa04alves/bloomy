import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { DAY_SCHEMA, dayFor } from "@/features/shared/day";
import { addWater, getWaterDay } from "@/features/water/service";

const BODY_SCHEMA = z.object({ ml: z.number().int().positive().max(5000) });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  return Response.json(await getWaterDay(db, userId, day.data));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const log = await addWater(db, userId, parsed.data.ml);
  return Response.json({ log }, { status: 201 });
}
