import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { deleteReminder, updateReminder } from "@/server/reminders/service";

const BODY_SCHEMA = z
  .object({
    time: TIME_SCHEMA.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((v) => v.time !== undefined || v.enabled !== undefined, {
    message: "at least one field required",
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
  const reminder = await updateReminder(db, userId, id, parsed.data);
  if (!reminder) return notFound();

  return Response.json({ reminder });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteReminder(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
