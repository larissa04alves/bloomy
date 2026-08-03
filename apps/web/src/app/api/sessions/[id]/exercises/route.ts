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
import { addSessionExercise } from "@/server/workout/session";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(0).max(600),
  catalogId: z.string().nullable().optional(),
  muscleGroup: z.enum(FOCUS_VALUES).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const session = await addSessionExercise(db, userId, id, parsed.data);
  if (session === "duplicate") return conflict("exercise already in session");
  if (!session) return notFound();

  return Response.json({ session }, { status: 201 });
}
