import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import {
  ensureProfile,
  PORTION_LIMITS,
  updateProfile,
  validProfileUpdate,
} from "@/server/profile/service";
import { DAY_SCHEMA } from "@/server/shared/day";

const PATCH_SCHEMA = z.object({
  restSeconds: z.number().int().min(15).max(600).optional(),
  autoRest: z.boolean().optional(),
  restAlert: z.boolean().optional(),
  completeOnboarding: z.boolean().optional(),
  waterPortionMl: z
    .number()
    .int()
    .min(PORTION_LIMITS.min)
    .max(PORTION_LIMITS.max)
    .optional(),
  // Só a forma: a faixa é do serviço (`validProfileUpdate`), que vira 422.
  heightCm: z.number().int().optional(),
  birthDate: DAY_SCHEMA.optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const profile = await ensureProfile(db, userId);
  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PATCH_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  if (!validProfileUpdate(parsed.data)) {
    return unprocessable("altura ou nascimento fora da faixa permitida");
  }

  const profile = await updateProfile(db, userId, parsed.data);
  return Response.json({ profile });
}
