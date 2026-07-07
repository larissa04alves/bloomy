import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createReminder, listReminders } from "@/server/reminders/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z.object({
  type: z.enum(["water", "meds", "workout", "mind"]),
  time: TIME_SCHEMA,
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ reminders: await listReminders(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const reminder = await createReminder(db, userId, parsed.data);
  return Response.json({ reminder }, { status: 201 });
}
