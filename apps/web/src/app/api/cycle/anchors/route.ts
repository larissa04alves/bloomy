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
import { dayFor } from "@/server/shared/day";
import { addAnchor, getCycleState, isCycleEnabled } from "@/server/cycle/service";

const BODY_SCHEMA = z.object({ kind: z.enum(["pause_started", "pack_extended"]) });

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  if (!(await isCycleEnabled(db, userId))) return conflict("cycle disabled");

  const today = dayFor();
  const result = await addAnchor(db, userId, parsed.data.kind, today);
  if (!result.ok) return unprocessable(result.reason);

  return Response.json({ cycle: await getCycleState(db, userId, today) });
}
