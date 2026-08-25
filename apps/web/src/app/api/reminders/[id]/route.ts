import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
  unprocessable,
} from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { updateReminder } from "@/server/reminders/service";

const BODY_SCHEMA = z
  .object({
    time: TIME_SCHEMA.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((v) => v.time !== undefined || v.enabled !== undefined, {
    message: "at least one field required",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const result = await updateReminder(db, userId, id, parsed.data);

  if (!result.ok) {
    // 422 e não 400: o HH:MM é válido, mas água, remédios e consultas têm horário
    // derivado ou constante — o valor não cabe na regra do recurso.
    if (result.reason === "time_not_allowed") {
      return unprocessable("this reminder has no editable time");
    }
    return notFound();
  }

  return Response.json({ reminder: result.reminder });
}
