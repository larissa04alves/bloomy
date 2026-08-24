import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { GOAL_LIMITS } from "@/server/goals/service";
import { completeOnboarding } from "@/server/onboarding/service";
import { PORTION_LIMITS } from "@/server/profile/service";

const BODY_SCHEMA = z.object({
  waterMl: z
    .number()
    .int()
    .min(GOAL_LIMITS.water.min)
    .max(GOAL_LIMITS.water.max),
  portionMl: z.number().int().min(PORTION_LIMITS.min).max(PORTION_LIMITS.max),
  meals: z.number().int().min(GOAL_LIMITS.meals.min).max(GOAL_LIMITS.meals.max),
  workoutDays: z
    .number()
    .int()
    .min(GOAL_LIMITS.workout.min)
    .max(GOAL_LIMITS.workout.max),
});

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { goals, profile } = await completeOnboarding(db, userId, parsed.data);
  return Response.json({ goals, profile });
}
