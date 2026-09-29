import { z } from "zod";

import { db } from "@bloomy/db";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { MEAL_ITEMS_SCHEMA, deleteMeal, updateMeal } from "@/server/meals/service";

const updateMealSchema = z
  .object({
    type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
    items: MEAL_ITEMS_SCHEMA.optional(),
  })
  .refine((v) => v.type !== undefined || v.items !== undefined, {
    message: "Informe ao menos um campo",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const parsed = updateMealSchema.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const meal = await updateMeal(db, userId, id, parsed.data);
  if (!meal) return notFound();

  return Response.json({ meal });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteMeal(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
