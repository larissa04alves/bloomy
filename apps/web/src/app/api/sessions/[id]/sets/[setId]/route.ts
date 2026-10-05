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
import { removeSessionSet, updateSet } from "@/server/workout/session";

const BODY_SCHEMA = z
  .object({
    reps: z.number().int().min(0).max(1000).optional(),
    load: z.number().min(0).max(1000).optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => v.reps !== undefined || v.load !== undefined || v.done !== undefined, {
    message: "at least one field required",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id, setId } = await params;
  const set = await updateSet(db, userId, id, setId, parsed.data);
  if (!set) return notFound();

  return Response.json({ set });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id, setId } = await params;
  const result = await removeSessionSet(db, userId, id, setId);
  if (!result) return notFound();
  if (result === "done") return unprocessable("set already done");
  if (result === "last") return unprocessable("exercise needs at least one set");

  return Response.json({ ok: true });
}
