import { db } from "@bloomy/db";

import {
  badRequest,
  conflict,
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { DAY_SCHEMA } from "@/server/shared/day";
import { DAY_BODY_SCHEMA } from "@/server/cycle/schemas";
import { isCycleEnabled, saveDay } from "@/server/cycle/service";

export async function PUT(request: Request, { params }: { params: Promise<{ day: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = DAY_SCHEMA.safeParse((await params).day);
  if (!day.success) return badRequest("invalid day");

  const parsed = DAY_BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const result = await saveDay(db, userId, day.data, parsed.data);
  if (!result.ok) return unprocessable(result.reason);

  return Response.json({ entry: result.entry });
}
