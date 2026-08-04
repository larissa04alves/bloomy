import { db } from "@bloomy/db";
import { z } from "zod";

import {
  conflict,
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { deleteWeight, updateWeight } from "@/server/health/weight";

const GRAMS = z.number().int().min(20_000).max(300_000);
const PAST_DAY = DAY_SCHEMA.refine((d) => d <= dayFor(), "data no futuro");

const BODY_SCHEMA = z.object({ grams: GRAMS.optional(), day: PAST_DAY.optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const weight = await updateWeight(db, userId, id, parsed.data);
  if (!weight) return notFound();
  if (weight === "day_taken") return conflict("já existe peso registrado nessa data");

  return Response.json({ weight });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteWeight(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
