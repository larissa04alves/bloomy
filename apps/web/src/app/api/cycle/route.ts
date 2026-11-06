import { db } from "@bloomy/db";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { METHOD_SCHEMA } from "@/server/cycle/schemas";
import { activateCycle, deleteCycleData, getCyclePayload, getCycleState } from "@/server/cycle/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json(await getCyclePayload(db, userId, dayFor()));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = METHOD_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const today = dayFor();
  await activateCycle(db, userId, parsed.data, today);
  return Response.json({ cycle: await getCycleState(db, userId, today) });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  await deleteCycleData(db, userId);
  return new Response(null, { status: 204 });
}
