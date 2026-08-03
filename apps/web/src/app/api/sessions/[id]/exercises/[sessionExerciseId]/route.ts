import { db } from "@bloomy/db";
import { z } from "zod";

import { FOCUS_VALUES } from "@/lib/api-types";
import {
  conflict,
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { removeSessionExercise, swapSessionExercise } from "@/server/workout/session";

const BODY_SCHEMA = z.object({
  // trim na borda: `min(1)` sozinho aceita " ", que seria gravado e exibido com os espaços
  name: z.string().trim().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(0).max(600),
  catalogId: z.string().nullable().optional(),
  muscleGroup: z.enum(FOCUS_VALUES).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionExerciseId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id, sessionExerciseId } = await params;
  const result = await swapSessionExercise(
    db,
    userId,
    id,
    sessionExerciseId,
    parsed.data,
  );
  if (result === "duplicate") return conflict("exercise already in session");
  if (!result) return notFound();

  return Response.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionExerciseId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id, sessionExerciseId } = await params;
  const session = await removeSessionExercise(db, userId, id, sessionExerciseId);
  if (!session) return notFound();

  return Response.json({ session });
}
