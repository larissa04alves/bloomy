import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

export const appointment = sqliteTable(
  "appointment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    professional: text("professional").notNull(),
    specialty: text("specialty"),
    status: text("status")
      .$type<"scheduled" | "completed" | "to_schedule">()
      .default("scheduled")
      .notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    suggestedAt: integer("suggested_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    location: text("location"),
    remindDayBefore: integer("remind_day_before", { mode: "boolean" })
      .default(false)
      .notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => appointment.id, {
      onDelete: "set null",
    }),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("appointment_user_scheduled_idx").on(table.userId, table.scheduledAt),
    index("appointment_user_status_idx").on(table.userId, table.status),
  ],
);

export const exam = sqliteTable(
  "exam",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status")
      .$type<"to_schedule" | "scheduled" | "awaiting_result" | "completed">()
      .default("to_schedule")
      .notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    suggestedAt: integer("suggested_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => exam.id, {
      onDelete: "set null",
    }),
    attachmentKey: text("attachment_key"),
    attachmentMime: text("attachment_mime"),
    attachmentName: text("attachment_name"),
    attachmentSize: integer("attachment_size"),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("exam_user_idx").on(table.userId)],
);

export type Appointment = typeof appointment.$inferSelect;
export type Exam = typeof exam.$inferSelect;
