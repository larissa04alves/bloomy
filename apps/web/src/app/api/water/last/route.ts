import { db } from "@bloomy/db";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { removeLastWater } from "@/server/water/service";

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  const removed = await removeLastWater(db, userId, day.data);
  return Response.json({ removed });
}
