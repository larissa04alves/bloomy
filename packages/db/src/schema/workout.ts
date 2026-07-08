import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

export const workout = sqliteTable(
  "workout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    focus: text("focus")
      .$type<"chest" | "back" | "legs" | "shoulders" | "glutes" | "arms" | "abs" | "cardio">()
      .notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("workout_user_idx").on(table.userId)],
);

export const exercise = sqliteTable(
  "exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetSets: integer("target_sets").notNull(),
    targetReps: integer("target_reps").notNull().default(12),
    restSeconds: integer("rest_seconds").notNull().default(45),
    position: integer("position").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("exercise_workout_idx").on(table.workoutId)],
);

export const workoutSession = sqliteTable(
  "workout_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    startedAt: timestampMs("started_at"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("workout_session_user_day_idx").on(table.userId, table.day)],
);

export const setLog = sqliteTable(
  "set_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => workoutSession.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").references(() => exercise.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    load: real("load"),
    done: integer("done", { mode: "boolean" }).default(false).notNull(),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("set_log_session_idx").on(table.sessionId)],
);

export type Workout = typeof workout.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type WorkoutSession = typeof workoutSession.$inferSelect;
export type SetLog = typeof setLog.$inferSelect;
