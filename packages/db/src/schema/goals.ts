import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

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
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [uniqueIndex("goal_user_domain_idx").on(table.userId, table.domain)],
);

export type Goal = typeof goal.$inferSelect;
