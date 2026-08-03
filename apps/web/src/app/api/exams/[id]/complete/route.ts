import { db } from "@bloomy/db";

import { conflict, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeExam } from "@/server/health/service";

/** Conclui o exame sem laudo ("não vou anexar o resultado"): manda pro histórico. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const exam = await completeExam(db, userId, id);
  if (exam === "not_found") return notFound();
  if (exam === "wrong_status")
    return conflict("exame não está aguardando resultado");

  return Response.json({ exam });
}
