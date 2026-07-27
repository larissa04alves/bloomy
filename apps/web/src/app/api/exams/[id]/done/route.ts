import { db } from "@bloomy/db";
import { z } from "zod";

import {
  conflict,
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { markExamDone } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  needsReturn: z.boolean(),
  followUpMonths: z.number().int().min(1).max(60).optional(),
});

/** Exame feito: vai pra `awaiting_result` e cria o retorno, se pedido. Não conclui. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const result = await markExamDone(db, userId, id, parsed.data);
  if (result === "not_found") return notFound();
  if (result === "wrong_status")
    return conflict("exame não está agendado");

  return Response.json({ exam: result.done, followUp: result.followUp });
}
