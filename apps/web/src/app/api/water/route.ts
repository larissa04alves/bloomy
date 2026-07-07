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
import { addWater, getWaterDay } from "@/server/water/service";

const BODY_SCHEMA = z.object({ ml: z.number().int().positive().max(5000) });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  return Response.json(await getWaterDay(db, userId, day.day));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const log = await addWater(db, userId, parsed.data.ml);
  return Response.json({ log }, { status: 201 });
}
