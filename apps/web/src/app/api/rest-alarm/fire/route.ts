import { db } from "@bloomy/db";
import { z } from "zod";

import { verifyQstash } from "@/server/rest-alarm/qstash";
import { fireRestAlarm } from "@/server/rest-alarm/service";
import { webPushRestSender } from "@/server/rest-alarm/web-push";

// web-push usa crypto do Node — a rota não pode cair no edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BODY_SCHEMA = z.object({ userId: z.string().min(1) });

/** Callback do QStash na hora do fim do descanso. Chamado só pelo QStash: a
 *  assinatura é a autenticação. Assinatura válida responde sempre 200 — inclusive
 *  para mensagem velha —, senão o QStash reentregaria. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstash(request, rawBody))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const messageId = request.headers.get("upstash-message-id");
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const parsed = BODY_SCHEMA.safeParse(body);
  if (!messageId || !parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const status = await fireRestAlarm(db, webPushRestSender, {
    userId: parsed.data.userId,
    messageId,
  });
  return Response.json({ status });
}
