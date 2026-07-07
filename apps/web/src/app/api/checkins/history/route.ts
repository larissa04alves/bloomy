import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { listCheckins } from "@/server/mind/service";

const LIMIT_SCHEMA = z.coerce.number().int().min(1).max(100);

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("limit");
  const limit = raw ? LIMIT_SCHEMA.safeParse(raw) : { success: true as const, data: 30 };
  if (!limit.success) return badRequest("invalid limit");

  const checkins = await listCheckins(db, userId, limit.data);
  return Response.json({ checkins });
}
