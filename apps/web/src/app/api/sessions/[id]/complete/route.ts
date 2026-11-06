import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, notFound, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { completeSession } from "@/server/workout/session";

// Corpo opcional: sem ele conclui agora, como antes.
const BODY_SCHEMA = z.object({ endAt: z.enum(["now", "last_activity"]).default("now") }).default({ endAt: "now" });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const summary = await completeSession(db, userId, id, parsed.data.endAt);
  if (!summary) return notFound();

  return Response.json(summary);
}
