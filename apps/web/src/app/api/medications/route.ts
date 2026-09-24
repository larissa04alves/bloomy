import { db } from "@bloomy/db";
import { DOSE_UNITS } from "@bloomy/db/schema/body";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { hasAtMostDecimals } from "@/lib/dose";
import { createMedication, listMedications } from "@/server/medications/service";

const DECIMALS_MSG = "no máximo 3 casas decimais";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  doseAmount: z.number().positive().max(10000).refine(hasAtMostDecimals, DECIMALS_MSG).optional(),
  doseUnit: z.enum(DOSE_UNITS).optional(),
  stock: z
    .number()
    .nonnegative()
    .max(1_000_000)
    .refine(hasAtMostDecimals, DECIMALS_MSG)
    .nullable()
    .optional(),
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
