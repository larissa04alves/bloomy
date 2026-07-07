import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const goal = sqliteTable(
  "goal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    domain: text("domain").$type<"water" | "meals" | "workout" | "mind">().notNull(),
    target: integer("target").notNull(),
    unit: text("unit").$type<"ml" | "count" | "days">().notNull(),
    period: text("period").$type<"day" | "week">().notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [uniqueIndex("goal_user_domain_idx").on(table.userId, table.domain)],
);

export type Goal = typeof goal.$inferSelect;
