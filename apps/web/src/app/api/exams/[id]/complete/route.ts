import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeExam } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  needsReturn: z.boolean(),
  followUpMonths: z.number().int().min(1).max(60).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const result = await completeExam(db, userId, id, parsed.data);
  if (!result) return notFound();

  return Response.json({ exam: result.completed, followUp: result.followUp });
}
