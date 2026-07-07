import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

export const moodCheckin = sqliteTable(
  "mood_checkin",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    mood: text("mood").$type<"sad" | "meh" | "neutral" | "good" | "great">(),
    anxiety: integer("anxiety"),
    note: text("note"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [uniqueIndex("mood_checkin_user_day_idx").on(table.userId, table.day)],
);

export type MoodCheckin = typeof moodCheckin.$inferSelect;
