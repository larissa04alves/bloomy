import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { deactivateMedication, updateMedication } from "@/features/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  dose: z.string().max(120).optional(),
  stock: z.number().int().nonnegative().optional(),
  times: z.array(TIME_SCHEMA).min(1).max(6).optional(),
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
  const updated = await updateMedication(db, userId, id, parsed.data);
  if (!updated) return notFound();

  return Response.json({ medication: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deactivated = await deactivateMedication(db, userId, id);
  if (!deactivated) return notFound();

  return Response.json({ ok: true });
}
