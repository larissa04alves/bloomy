import { db } from "@bloomy/db";

import { conflict, invalidBody, parseJson, requireUserId, unauthorized, unprocessable } from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { METHOD_UPDATE_SCHEMA } from "@/server/cycle/schemas";
import { getCycleState, isCycleEnabled, setMethod } from "@/server/cycle/service";

export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = METHOD_UPDATE_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const today = dayFor();
  const result = await setMethod(db, userId, parsed.data, today);
  if (!result.ok) return unprocessable(result.reason);
  return Response.json({ cycle: await getCycleState(db, userId, today) });
}
