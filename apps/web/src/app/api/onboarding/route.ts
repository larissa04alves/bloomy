import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { completeOnboarding } from "@/server/onboarding/service";

// Só a forma. A faixa é do serviço, que é o dono da regra (ADR-0001) — aqui a rota
// apenas traduz o `out_of_range` dele em 422, como `PUT /api/goals/[id]` faz.
const BODY_SCHEMA = z.object({
  waterMl: z.number().int(),
  portionMl: z.number().int(),
  meals: z.number().int(),
  workoutDays: z.number().int(),
});

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const result = await completeOnboarding(db, userId, parsed.data);
  if (!result.ok) return unprocessable("valor de meta fora da faixa permitida");

  return Response.json({ goals: result.goals, profile: result.profile });
}
