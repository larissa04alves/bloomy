import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { createWorkout, listWorkouts } from "@/server/workout/service";

const EXERCISE_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  position: z.number().int().min(0),
});

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  focus: z.enum(["chest", "back", "legs", "cardio"]),
  exercises: z.array(EXERCISE_SCHEMA).max(30),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ workouts: await listWorkouts(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const workout = await createWorkout(db, userId, parsed.data);
  return Response.json({ workout }, { status: 201 });
}
