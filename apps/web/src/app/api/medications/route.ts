import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { createMedication, listMedications } from "@/server/medications/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  dose: z.string().max(120).optional(),
  stock: z.number().int().nonnegative().optional(),
  times: z.array(TIME_SCHEMA).min(1).max(6),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ medications: await listMedications(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const created = await createMedication(db, userId, parsed.data);
  return Response.json({ medication: created }, { status: 201 });
}
