import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { listCatalog } from "@/server/workout/catalog";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  // Catálogo é ~estático (muda só em re-seed) → cacheável no browser (privado, por-usuário).
  return Response.json(
    { exercises: await listCatalog(db) },
    { headers: { "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400" } },
  );
}
