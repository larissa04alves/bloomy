import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createAppointment, listAppointments } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  professional: z.string().min(1).max(120),
  specialty: z.string().max(120).optional(),
  scheduledAt: z.coerce.date(),
  location: z.string().max(200).optional(),
  remindDayBefore: z.boolean().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ appointments: await listAppointments(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const appointment = await createAppointment(db, userId, parsed.data);
  return Response.json({ appointment }, { status: 201 });
}
