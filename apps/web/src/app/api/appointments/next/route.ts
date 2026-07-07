import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { nextAppointment } from "@/server/health/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const appointment = await nextAppointment(db, userId);
  return Response.json({ appointment });
}
