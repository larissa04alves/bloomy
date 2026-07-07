import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  workout,
  type Exercise,
  type Workout,
} from "@bloomy/db/schema/workout";
import { and, asc, eq, inArray } from "drizzle-orm";

export type Focus = Workout["focus"];

export type ExerciseInput = { name: string; targetSets: number; position: number };
export type WorkoutInput = { name: string; focus: Focus; exercises: ExerciseInput[] };
export type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export async function listWorkouts(
  db: Db,
  userId: string,
): Promise<WorkoutWithExercises[]> {
  const workouts = await db
    .select()
    .from(workout)
    .where(and(eq(workout.userId, userId), eq(workout.active, true)))
    .orderBy(asc(workout.createdAt));
  if (workouts.length === 0) return [];

  const exercises = await db
    .select()
    .from(exercise)
    .where(inArray(exercise.workoutId, workouts.map((w) => w.id)))
    .orderBy(asc(exercise.position));

  return workouts.map((w) => ({
    ...w,
    exercises: exercises.filter((e) => e.workoutId === w.id),
  }));
}

export async function createWorkout(
  db: Db,
  userId: string,
  input: WorkoutInput,
): Promise<WorkoutWithExercises> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workout)
      .values({ userId, name: input.name, focus: input.focus })
      .returning();

    const rows = input.exercises.map((e) => ({
      workoutId: created.id,
      userId,
      name: e.name,
      targetSets: e.targetSets,
      position: e.position,
    }));
    const exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];

    return { ...created, exercises };
  });
}

/** Edita o template. Se `exercises` vier, faz replace-all (add/remove/reorder). */
export async function updateWorkout(
  db: Db,
  userId: string,
  id: string,
  input: Partial<WorkoutInput>,
): Promise<WorkoutWithExercises | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(workout)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.focus !== undefined && { focus: input.focus }),
        updatedAt: new Date(),
      })
      .where(and(eq(workout.id, id), eq(workout.userId, userId)))
      .returning();
    if (!updated) return null;

    let exercises: Exercise[];
    if (input.exercises !== undefined) {
      await tx.delete(exercise).where(eq(exercise.workoutId, id));
      const rows = input.exercises.map((e) => ({
        workoutId: id,
        userId,
        name: e.name,
        targetSets: e.targetSets,
        position: e.position,
      }));
      exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];
    } else {
      exercises = await tx
        .select()
        .from(exercise)
        .where(eq(exercise.workoutId, id))
        .orderBy(asc(exercise.position));
    }

    return { ...updated, exercises };
  });
}

export async function deactivateWorkout(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const updated = await db
    .update(workout)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning();
  return updated.length > 0;
}
