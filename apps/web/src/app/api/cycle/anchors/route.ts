import { db } from "@bloomy/db";
import { z } from "zod";

import {
  conflict,
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { addAnchor, getCycleState, isCycleEnabled } from "@/server/cycle/service";

const BODY_SCHEMA = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pause_started"), day: DAY_SCHEMA.optional() }),
  z.object({ kind: z.literal("pack_extended") }),
]);

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const today = dayFor();
  const body = parsed.data;
  const result = await addAnchor(db, userId, body.kind, today, body.kind === "pause_started" ? body.day : undefined);
  if (!result.ok) return unprocessable(result.reason);

  return Response.json({ cycle: await getCycleState(db, userId, today) });
}
