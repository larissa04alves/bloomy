import { db } from "@bloomy/db";
import { env } from "@bloomy/env/server";

import { dispatchReminders } from "@/server/reminders/dispatch";

// web-push usa crypto do Node — a rota não pode cair no edge runtime.
export const runtime = "nodejs";
// A varredura decide a partir do relógio: cachear a resposta a congelaria.
export const dynamic = "force-dynamic";

/** Varredura dos lembretes. Chamada pelo agendador externo (cron-job.org) a cada
 *  5 minutos; nunca por navegador. Wrapper fino, como manda o ADR-0001: valida o
 *  segredo e chama o serviço. */
export async function GET(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "cron not configured" }, { status: 503 });
  }

  // Header em vez de query string: URL vaza em log de proxy e histórico.
  const provided = request.headers.get("authorization");
  if (provided !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await dispatchReminders(db);
  return Response.json(result);
}
