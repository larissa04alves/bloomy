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
import { addMeal, getMealsDay } from "@/server/meals/service";

const BODY_SCHEMA = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1).max(500),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  return Response.json(await getMealsDay(db, userId, day.day));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const created = await addMeal(db, userId, parsed.data);
  return Response.json({ meal: created }, { status: 201 });
}
