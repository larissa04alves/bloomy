import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { addSessionSet } from "@/server/workout/session";

/** Série extra só desta sessão — não muda o template. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionExerciseId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id, sessionExerciseId } = await params;
  const set = await addSessionSet(db, userId, id, sessionExerciseId);
  if (!set) return notFound();

  return Response.json({ set }, { status: 201 });
}
