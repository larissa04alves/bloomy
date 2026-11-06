import { db } from "@bloomy/db";

import { conflict, requireUserId, unauthorized, unprocessable } from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { getCycleState, isCycleEnabled, setPillTaken } from "@/server/cycle/service";

async function mark(request: Request, taken: boolean) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const today = dayFor();
  const result = await setPillTaken(db, userId, today, taken);
  if (!result.ok) return unprocessable(result.reason);

  return Response.json({ cycle: await getCycleState(db, userId, today) });
}

export function POST(request: Request) {
  return mark(request, true);
}

export function DELETE(request: Request) {
  return mark(request, false);
}
