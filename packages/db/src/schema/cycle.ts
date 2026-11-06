import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

type CycleMethodKind =
  | "none"
  | "pill"
  | "hormonal_iud"
  | "copper_iud"
  | "implant"
  | "injection"
  | "ring"
  | "patch"
  | "other";
type CycleFlow = "none" | "spotting" | "light" | "medium" | "heavy";

export const cycleSettings = sqliteTable("cycle_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  enabledAt: integer("enabled_at", { mode: "timestamp_ms" }),
  hiddenSymptoms: text("hidden_symptoms", { mode: "json" }).$type<string[]>().default(sql`'[]'`).notNull(),
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
});

export type CycleSettings = typeof cycleSettings.$inferSelect;

export const cycleMethod = sqliteTable(
  "cycle_method",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CycleMethodKind>().notNull(),
    pillActiveDays: integer("pill_active_days"),
    // Nulo na pílula = sem pausa (contínua).
    pauseEvery: integer("pause_every"),
    pauseDays: integer("pause_days"),
    pillTime: text("pill_time"),
    sequenceStart: text("sequence_start"),
    lastPeriodStart: text("last_period_start"),
    usualLength: integer("usual_length"),
    startedOn: text("started_on").notNull(),
    endedOn: text("ended_on"),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("cycle_method_user_started_idx").on(table.userId, table.startedOn)],
);

export type CycleMethod = typeof cycleMethod.$inferSelect;

export const cycleAnchor = sqliteTable(
  "cycle_anchor",
  {
    // Autoincrement: duas âncoras no mesmo dia valem na ordem em que foram gravadas.
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    kind: text("kind").$type<"pause_started" | "pack_extended">().notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("cycle_anchor_user_day_idx").on(table.userId, table.day)],
);

export type CycleAnchor = typeof cycleAnchor.$inferSelect;

export const cycleDay = sqliteTable(
  "cycle_day",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    flow: text("flow").$type<CycleFlow>().notNull(),
    symptoms: text("symptoms", { mode: "json" }).$type<string[]>().default(sql`'[]'`).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [uniqueIndex("cycle_day_user_day_idx").on(table.userId, table.day)],
);

export type CycleDay = typeof cycleDay.$inferSelect;

export const cyclePillIntake = sqliteTable(
  "cycle_pill_intake",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [uniqueIndex("cycle_pill_intake_user_day_idx").on(table.userId, table.day)],
);

export type CyclePillIntake = typeof cyclePillIntake.$inferSelect;
