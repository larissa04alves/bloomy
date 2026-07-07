import { db } from "@bloomy/db";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { resolveDay } from "@/server/shared/day";
import { removeLastWater } from "@/server/water/service";

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  const removed = await removeLastWater(db, userId, day.day);
  return Response.json({ removed });
}
