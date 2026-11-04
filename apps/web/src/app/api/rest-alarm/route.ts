import { db } from "@bloomy/db";
import { z } from "zod";

import { cancelRestAlarm, scheduleRestAlarm } from "@/server/rest-alarm/service";
import { qstashScheduler } from "@/server/rest-alarm/qstash";
import {
  invalidBody,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";

/** Folga máxima para o fim do descanso: o maior descanso do app é 2 min. */
const MAX_AHEAD_MS = 15 * 60_000;

// Só a forma (400). A janela é regra do recurso: valor válido fora dela é 422.
const BODY_SCHEMA = z.object({
  endsAt: z.number().int(),
  endpoint: z.url(),
});

const withinWindow = (endsAt: number) => {
  const ahead = endsAt - Date.now();
  return ahead > 0 && ahead <= MAX_AHEAD_MS;
};

/** Começa ou reajusta o alarme de fim do descanso. Sem QStash configurado é no-op:
 *  o aviso dentro do app continua valendo. */
export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  if (!withinWindow(parsed.data.endsAt)) {
    return unprocessable("endsAt fora da janela do descanso");
  }

  const scheduler = qstashScheduler();
  if (!scheduler) return new Response(null, { status: 204 });

  const status = await scheduleRestAlarm(db, scheduler, userId, {
    endsAt: new Date(parsed.data.endsAt),
    endpoint: parsed.data.endpoint,
  });
  return Response.json({ status });
}

/** Descanso pulado ou sessão concluída. */
export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const scheduler = qstashScheduler();
  if (scheduler) await cancelRestAlarm(db, scheduler, userId);
  return new Response(null, { status: 204 });
}
