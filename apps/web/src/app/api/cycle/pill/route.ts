import { db } from "@bloomy/db";

import {
  conflict,
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { PILL_COUNT_SCHEMA } from "@/server/cycle/schemas";
import { getCycleState, isCycleEnabled, setPillsTakenInPack, setPillTaken } from "@/server/cycle/service";

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

/** "Tomei N desta cartela": corrige as marcações da cartela atual até hoje. */
export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PILL_COUNT_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const today = dayFor();
  const result = await setPillsTakenInPack(db, userId, today, parsed.data.count);
  if (!result.ok) return unprocessable(result.reason);

  return Response.json({ cycle: await getCycleState(db, userId, today) });
}
