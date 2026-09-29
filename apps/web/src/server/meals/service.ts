import "server-only";

import type { Db } from "@bloomy/db";
import { meal, type Meal, type MealItem } from "@bloomy/db/schema/body";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { dayFor } from "@/server/shared/day";

export type MealType = Meal["type"];

export const MEAL_ITEMS_SCHEMA = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(120),
      grams: z.number().int().min(1).max(5000).nullable(),
    }),
  )
  .min(1)
  .max(30);

/** Café, almoço e jantar geram pendência; lanche nunca (CONTEXT.md). */
export const MAIN_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const satisfies readonly MealType[];

export function pendingMealTypes(meals: Pick<Meal, "type">[]): MealType[] {
  const registered = new Set(meals.map((m) => m.type));
  return MAIN_MEAL_TYPES.filter((t) => !registered.has(t));
}

export async function addMeal(
  db: Db,
  userId: string,
  input: { type: MealType; items: MealItem[] },
): Promise<Meal> {
  const [created] = await db
    .insert(meal)
    .values({ userId, type: input.type, items: input.items, day: dayFor() })
    .returning();

  return created;
}

export async function updateMeal(
  db: Db,
  userId: string,
  mealId: string,
  input: { type?: MealType; items?: MealItem[] },
): Promise<Meal | null> {
  const [updated] = await db
    .update(meal)
    .set({
      ...(input.type !== undefined && { type: input.type }),
      ...(input.items !== undefined && { items: input.items }),
    })
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deleteMeal(db: Db, userId: string, mealId: string): Promise<boolean> {
  const deleted = await db
    .delete(meal)
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();

  return deleted.length > 0;
}

export async function getMealsDay(
  db: Db,
  userId: string,
  day: string,
): Promise<{ meals: Meal[]; pendingTypes: MealType[] }> {
  const meals = await db
    .select()
    .from(meal)
    .where(and(eq(meal.userId, userId), eq(meal.day, day)))
    .orderBy(asc(meal.createdAt));

  return { meals, pendingTypes: pendingMealTypes(meals) };
}
