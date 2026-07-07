import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { deactivateWorkout, updateWorkout } from "@/server/workout/service";

const EXERCISE_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  position: z.number().int().min(0),
});

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  focus: z.enum(["chest", "back", "legs", "cardio"]).optional(),
  exercises: z.array(EXERCISE_SCHEMA).max(30).optional(),
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
  const workout = await updateWorkout(db, userId, id, parsed.data);
  if (!workout) return notFound();

  return Response.json({ workout });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deactivated = await deactivateWorkout(db, userId, id);
  if (!deactivated) return notFound();

  return Response.json({ ok: true });
}
