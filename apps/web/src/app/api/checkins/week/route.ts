import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { weekMoods } from "@/server/mind/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const days = await weekMoods(db, userId);
  return Response.json({ days });
}
