import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { listReminders } from "@/server/reminders/service";

/** As cinco linhas são fixas e nascem no primeiro GET (lazy seed) — não há POST:
 *  a tela liga, desliga e ajusta horário, nunca cria nem apaga lembrete. */
export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ reminders: await listReminders(db, userId) });
}
