import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { createMedication, listMedications } from "@/features/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

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

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const created = await createMedication(db, userId, parsed.data);
  return Response.json({ medication: created }, { status: 201 });
}
