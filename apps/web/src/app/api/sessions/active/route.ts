import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { getActiveSession } from "@/server/workout/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const session = await getActiveSession(db, userId);
  return Response.json({ session });
}
