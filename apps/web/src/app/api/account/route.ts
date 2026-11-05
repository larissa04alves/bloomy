import { db } from "@bloomy/db";

import { deleteAccount } from "@/server/account/service";
import { examStorage } from "@/server/health/r2";
import { requireSessionUserId, unauthorized } from "@/server/shared/api";

export async function DELETE(request: Request) {
  const userId = await requireSessionUserId(request);
  if (!userId) return unauthorized();

  try {
    await deleteAccount(db, examStorage, userId);
  } catch (err) {
    console.error("deleteAccount falhou:", err);
    return Response.json({ error: "não foi possível excluir a conta agora" }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
