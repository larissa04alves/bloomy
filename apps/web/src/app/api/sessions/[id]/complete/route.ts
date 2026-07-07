import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeSession } from "@/server/workout/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const summary = await completeSession(db, userId, id);
  if (!summary) return notFound();

  return Response.json(summary);
}
