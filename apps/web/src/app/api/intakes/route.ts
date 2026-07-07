import { db } from "@bloomy/db";
import { z } from "zod";

import {
  badRequest,
  conflict,
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { DAY_SCHEMA, dayFor, resolveDay } from "@/server/shared/day";
import { TIME_SCHEMA } from "@/server/shared/time";
import { getIntakesDay, markIntake, unmarkIntake } from "@/server/medications/service";

const MARK_SCHEMA = z.object({
  medicationId: z.string().min(1),
  time: TIME_SCHEMA,
  day: DAY_SCHEMA.optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const day = resolveDay(request);
  if (!day.ok) return badRequest("invalid day");

  return Response.json({ intakes: await getIntakesDay(db, userId, day.day) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = MARK_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const result = await markIntake(db, userId, {
    medicationId: parsed.data.medicationId,
    time: parsed.data.time,
    day: parsed.data.day ?? dayFor(),
  });

  if (result === "not_found") return notFound();
  if (result === "duplicate") return conflict("intake already marked");

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const searchParams = new URL(request.url).searchParams;
  const parsed = MARK_SCHEMA.safeParse({
    medicationId: searchParams.get("medicationId"),
    time: searchParams.get("time"),
    day: searchParams.get("day") ?? undefined,
  });
  if (!parsed.success) return invalidBody(parsed.error);

  const removed = await unmarkIntake(db, userId, {
    medicationId: parsed.data.medicationId,
    time: parsed.data.time,
    day: parsed.data.day ?? dayFor(),
  });
  if (!removed) return notFound();

  return Response.json({ ok: true });
}
