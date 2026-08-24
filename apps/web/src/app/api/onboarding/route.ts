import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { GOAL_LIMITS } from "@/server/goals/service";
import { completeOnboarding } from "@/server/onboarding/service";
import { PORTION_LIMITS } from "@/server/profile/service";

const BODY_SCHEMA = z.object({
  waterMl: z.number().int(),
  portionMl: z.number().int(),
  meals: z.number().int(),
  workoutDays: z.number().int(),
});

function withinLimits(body: z.infer<typeof BODY_SCHEMA>): boolean {
  const within = (value: number, min: number, max: number) =>
    value >= min && value <= max;

  return (
    within(body.waterMl, GOAL_LIMITS.water.min, GOAL_LIMITS.water.max) &&
    within(body.portionMl, PORTION_LIMITS.min, PORTION_LIMITS.max) &&
    within(body.meals, GOAL_LIMITS.meals.min, GOAL_LIMITS.meals.max) &&
    within(body.workoutDays, GOAL_LIMITS.workout.min, GOAL_LIMITS.workout.max)
  );
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  if (!withinLimits(parsed.data)) {
    return unprocessable("valor de meta fora da faixa permitida");
  }

  const { goals, profile } = await completeOnboarding(db, userId, parsed.data);
  return Response.json({ goals, profile });
}
