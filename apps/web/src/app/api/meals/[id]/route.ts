import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { deleteMeal } from "@/features/meals/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteMeal(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
