import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { ensureProfile, updateProfile } from "@/server/profile/service";

const PATCH_SCHEMA = z.object({
  restSeconds: z.number().int().min(15).max(600).optional(),
  autoRest: z.boolean().optional(),
  completeOnboarding: z.boolean().optional(),
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

  const profile = await updateProfile(db, userId, parsed.data);
  return Response.json({ profile });
}
