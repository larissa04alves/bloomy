import { db } from "@bloomy/db";
import { z } from "zod";

import { conflict, invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { dayFor } from "@/server/shared/day";
import { SYMPTOMS_SCHEMA } from "@/server/cycle/schemas";
import { getCycleState, isCycleEnabled, setCycleEnabled, setHiddenSymptoms } from "@/server/cycle/service";

const BODY_SCHEMA = z
  .object({ enabled: z.boolean().optional(), hiddenSymptoms: SYMPTOMS_SCHEMA.optional() })
  .refine((v) => v.enabled !== undefined || v.hiddenSymptoms !== undefined, {
    message: "at least one field required",
  });

export async function PATCH(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const { enabled, hiddenSymptoms } = parsed.data;

  if (hiddenSymptoms && enabled !== true && !(await isCycleEnabled(db, userId))) {
    return conflict("cycle disabled");
  }
  if (enabled !== undefined && !(await setCycleEnabled(db, userId, enabled))) {
    return conflict("cycle not configured");
  }
  if (hiddenSymptoms) await setHiddenSymptoms(db, userId, hiddenSymptoms);

  return Response.json({ cycle: await getCycleState(db, userId, dayFor()) });
}
