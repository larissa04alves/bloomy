import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deleteReminder, updateReminder } from "@/server/reminders/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

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

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

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
