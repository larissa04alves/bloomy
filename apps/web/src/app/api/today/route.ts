import { db } from "@bloomy/db";

import { badRequest, requireUser, unauthorized } from "@/server/shared/api";
import { resolveDay } from "@/server/shared/day";
import { getToday } from "@/server/today/service";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  return Response.json(await getToday(db, user, day.day));
}
