import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { updateGoal } from "@/features/goals/service";

const BODY_SCHEMA = z.object({ target: z.number().int().positive() });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const updated = await updateGoal(db, userId, id, parsed.data.target);
  if (!updated) return notFound();

  return Response.json({ goal: updated });
}
