import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { createReminder, listReminders } from "@/server/reminders/service";

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

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const reminder = await createReminder(db, userId, parsed.data);
  return Response.json({ reminder }, { status: 201 });
}
