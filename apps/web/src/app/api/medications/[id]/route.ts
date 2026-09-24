import { db } from "@bloomy/db";
import { DOSE_UNITS } from "@bloomy/db/schema/body";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { TIME_SCHEMA } from "@/server/shared/time";
import { hasAtMostDecimals } from "@/lib/dose";
import { deactivateMedication, updateMedication } from "@/server/medications/service";

const DECIMALS_MSG = "no máximo 3 casas decimais";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  doseAmount: z.number().positive().max(10000).refine(hasAtMostDecimals, DECIMALS_MSG).optional(),
  doseUnit: z.enum(DOSE_UNITS).optional(),
  stock: z
    .number()
    .nonnegative()
    .max(1_000_000)
    .refine(hasAtMostDecimals, DECIMALS_MSG)
    .nullable()
    .optional(),
  times: z.array(TIME_SCHEMA).min(1).max(6).optional(),
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
  const updated = await updateMedication(db, userId, id, parsed.data);
  if (!updated) return notFound();

  return Response.json({ medication: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deactivated = await deactivateMedication(db, userId, id);
  if (!deactivated) return notFound();

  return Response.json({ ok: true });
}
