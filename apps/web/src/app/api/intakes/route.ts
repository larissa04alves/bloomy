import { db } from "@bloomy/db";
import { z } from "zod";

import {
  badRequest,
  conflict,
  notFound,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { getIntakesDay, markIntake, unmarkIntake } from "@/server/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const MARK_SCHEMA = z.object({
  medicationId: z.string().min(1),
  time: TIME_SCHEMA,
  day: DAY_SCHEMA.optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  return Response.json({ intakes: await getIntakesDay(db, userId, day.data) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = MARK_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

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
  if (!parsed.success) return badRequest(parsed.error.message);

  const removed = await unmarkIntake(db, userId, {
    medicationId: parsed.data.medicationId,
    time: parsed.data.time,
    day: parsed.data.day ?? dayFor(),
  });
  if (!removed) return notFound();

  return Response.json({ ok: true });
}
