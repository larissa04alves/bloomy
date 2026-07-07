import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { deleteExam, updateExam } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(["to_schedule", "scheduled", "result_available", "completed"]).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const exam = await updateExam(db, userId, id, parsed.data);
  if (!exam) return notFound();

  return Response.json({ exam });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteExam(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
