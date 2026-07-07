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
import { deactivateMedication, updateMedication } from "@/server/medications/service";

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

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

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
