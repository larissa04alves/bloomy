import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { getCycleHistory } from "@/server/cycle/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json(await getCycleHistory(db, userId, dayFor()));
}
