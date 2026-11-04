import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

export const profile = sqliteTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  onboardingCompletedAt: integer("onboarding_completed_at", {
    mode: "timestamp_ms",
  }),
  restSeconds: integer("rest_seconds").default(45).notNull(),
  autoRest: integer("auto_rest", { mode: "boolean" }).default(true).notNull(),
  waterPortionMl: integer("water_portion_ml").default(500).notNull(),
  /** Coletados no onboarding, opcionais. O peso não mora aqui: vira pesagem em `weight_log`. */
  heightCm: integer("height_cm"),
  birthDate: text("birth_date"), // YYYY-MM-DD
  createdAt: timestampMs("created_at"),
  updatedAt: timestampMs("updated_at"),
});

export type Profile = typeof profile.$inferSelect;
