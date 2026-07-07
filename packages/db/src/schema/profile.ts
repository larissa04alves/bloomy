import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const profile = sqliteTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  onboardingCompletedAt: integer("onboarding_completed_at", { mode: "timestamp_ms" }),
  restSeconds: integer("rest_seconds").default(45).notNull(),
  autoRest: integer("auto_rest", { mode: "boolean" }).default(true).notNull(),
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
});

export type Profile = typeof profile.$inferSelect;
