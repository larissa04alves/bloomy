import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/features/shared/api";
import { ensureGoals } from "@/features/goals/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const goals = await ensureGoals(db, userId);
  return Response.json({ goals });
}
