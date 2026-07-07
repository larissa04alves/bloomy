import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { ensureGoals } from "@/server/goals/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const goals = await ensureGoals(db, userId);
  return Response.json({ goals });
}
