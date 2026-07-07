import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deleteAppointment, updateAppointment } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  professional: z.string().min(1).max(120).optional(),
  specialty: z.string().max(120).optional(),
  scheduledAt: z.coerce.date().optional(),
  location: z.string().max(200).optional(),
  remindDayBefore: z.boolean().optional(),
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
  const appointment = await updateAppointment(db, userId, id, parsed.data);
  if (!appointment) return notFound();

  return Response.json({ appointment });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteAppointment(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
