import { db } from "@bloomy/db";

import { conflict, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { startSession } from "@/server/workout/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const result = await startSession(db, userId, id);
  if (result === "not_found") return notFound();
  if (result === "already_active") return conflict("a session is already active");

  return Response.json({ session: result }, { status: 201 });
}
