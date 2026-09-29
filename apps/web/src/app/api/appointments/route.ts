import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { createAppointment, listAppointments } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  professional: z.string().min(1).max(120),
  specialty: z.string().max(120).optional(),
  status: z.enum(["scheduled", "to_schedule"]).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  suggestedAt: z.coerce.date().nullable().optional(),
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

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const appointment = await createAppointment(db, userId, parsed.data);
  if (appointment === "missing_schedule") return badRequest("consulta agendada precisa de data");
  return Response.json({ appointment }, { status: 201 });
}
