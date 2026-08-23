import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { updateGoal } from "@/server/goals/service";

const BODY_SCHEMA = z.object({ target: z.number().int().positive() });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const result = await updateGoal(db, userId, id, parsed.data.target);
  if (!result.ok) {
    return result.reason === "not_found"
      ? notFound()
      : unprocessable("meta fora da faixa permitida");
  }

  return Response.json({ goal: result.goal });
}
