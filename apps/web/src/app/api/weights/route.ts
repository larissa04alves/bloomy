import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { listWeights, upsertWeight } from "@/server/health/weight";

// 20–300 kg em gramas. Data no futuro não existe: não dá pra pesar amanhã.
const GRAMS = z.number().int().min(20_000).max(300_000);
const PAST_DAY = DAY_SCHEMA.refine((d) => d <= dayFor(), "data no futuro");

const BODY_SCHEMA = z.object({ grams: GRAMS, day: PAST_DAY.optional() });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ weights: await listWeights(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const weight = await upsertWeight(db, userId, {
    day: parsed.data.day ?? dayFor(),
    grams: parsed.data.grams,
  });
  return Response.json({ weight }, { status: 201 });
}
