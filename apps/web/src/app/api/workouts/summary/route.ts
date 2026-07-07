import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { workoutSummary } from "@/server/workout/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json(await workoutSummary(db, userId));
}
