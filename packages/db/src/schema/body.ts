import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const waterLog = sqliteTable(
  "water_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ml: integer("ml").notNull(),
    day: text("day").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("water_log_user_day_idx").on(table.userId, table.day)],
);

export const meal = sqliteTable(
  "meal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<"breakfast" | "lunch" | "dinner" | "snack">().notNull(),
    description: text("description").notNull(),
    day: text("day").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("meal_user_day_idx").on(table.userId, table.day)],
);

export const medication = sqliteTable(
  "medication",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose"),
    stock: integer("stock"),
    times: text("times", { mode: "json" }).$type<string[]>().notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("medication_user_idx").on(table.userId)],
);

export const medicationIntake = sqliteTable(
  "medication_intake",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    medicationId: text("medication_id")
      .notNull()
      .references(() => medication.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    time: text("time").notNull(),
    stockDecremented: integer("stock_decremented", { mode: "boolean" }).default(false).notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("medication_intake_user_day_idx").on(table.userId, table.day),
    uniqueIndex("medication_intake_unique_idx").on(table.medicationId, table.day, table.time),
  ],
);

export type WaterLog = typeof waterLog.$inferSelect;
export type Meal = typeof meal.$inferSelect;
export type Medication = typeof medication.$inferSelect;
export type MedicationIntake = typeof medicationIntake.$inferSelect;
