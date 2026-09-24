import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

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

export const DOSE_UNITS = ["comp", "capsula", "gotas", "ml", "g", "mg", "scoop"] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];

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
    doseAmount: real("dose_amount").default(1).notNull(),
    doseUnit: text("dose_unit").$type<DoseUnit>().default("comp").notNull(),
    /** Na mesma unidade da dose. */
    stock: real("stock"),
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
    /** Quanto esta toma tirou do estoque; é o que o desmarcar devolve. */
    stockDelta: real("stock_delta"),
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
