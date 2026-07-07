import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { updateSet } from "@/server/workout/service";

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
