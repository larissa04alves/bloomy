import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA } from "@/server/shared/day";
import { listDays } from "@/server/cycle/service";

const QUERY_SCHEMA = z
  .object({ from: DAY_SCHEMA, to: DAY_SCHEMA })
  .refine((v) => v.from <= v.to, { message: "from must be <= to" });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const params = new URL(request.url).searchParams;
  const parsed = QUERY_SCHEMA.safeParse({ from: params.get("from"), to: params.get("to") });
  if (!parsed.success) return badRequest("invalid from/to");

  return Response.json({ days: await listDays(db, userId, parsed.data.from, parsed.data.to) });
}
