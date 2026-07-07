import type { Db } from "@bloomy/db";
import { meal, type Meal } from "@bloomy/db/schema/body";
import { and, asc, eq } from "drizzle-orm";

import { dayFor } from "@/features/shared/day";

export type MealType = Meal["type"];

/** Café, almoço e jantar geram pendência; lanche nunca (CONTEXT.md). */
export const MAIN_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const satisfies readonly MealType[];

export function pendingMealTypes(meals: Pick<Meal, "type">[]): MealType[] {
  const registered = new Set(meals.map((m) => m.type));
  return MAIN_MEAL_TYPES.filter((t) => !registered.has(t));
}

export async function addMeal(
  db: Db,
  userId: string,
  input: { type: MealType; description: string },
): Promise<Meal> {
  const [created] = await db
    .insert(meal)
    .values({ userId, type: input.type, description: input.description, day: dayFor() })
    .returning();

  return created;
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
