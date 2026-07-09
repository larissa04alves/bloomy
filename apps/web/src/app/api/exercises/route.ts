import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { listCatalog } from "@/server/workout/catalog";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ exercises: await listCatalog(db) });
}
