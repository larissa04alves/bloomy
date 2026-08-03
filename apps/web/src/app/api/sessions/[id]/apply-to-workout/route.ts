import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { applySessionToWorkout } from "@/server/workout/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const workout = await applySessionToWorkout(db, userId, id);
  if (!workout) return notFound();

  return Response.json({ workout });
}
