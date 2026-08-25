import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { timestampMs } from "./_columns";

/** Preferência de lembrete por domínio. Uma linha por tipo, por usuário.
 *
 *  `time` é nulo nos tipos cujo horário não é escolhido aqui: `water` segue um
 *  intervalo constante, `meds` deriva de `medication.times` e `appointments`
 *  deriva de `appointment.scheduledAt`. Só `workout` e `mind` guardam horário. */
export const reminder = sqliteTable(
  "reminder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"water" | "meds" | "workout" | "mind" | "appointments">()
      .notNull(),
    time: text("time"),
    enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("reminder_user_idx").on(table.userId),
    // O seed é lazy no primeiro GET: dois requests concorrentes tentariam inserir
    // o mesmo tipo. O unique deixa o segundo cair no onConflictDoNothing.
    uniqueIndex("reminder_user_type_idx").on(table.userId, table.type),
  ],
);

/** Subscription de Web Push — uma por navegador/aparelho, N por usuário.
 *  A identidade é o `endpoint`; o par (p256dh, auth) criptografa o payload. */
export const pushSubscription = sqliteTable(
  "push_subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("push_subscription_user_idx").on(table.userId),
    uniqueIndex("push_subscription_endpoint_idx").on(table.endpoint),
  ],
);

/** Registro do que já foi entregue. É o que garante idempotência da varredura
 *  e viabiliza o retry: um slot ausente aqui continua pendente.
 *
 *  `refId` identifica o evento dentro do tipo (`appt:<id>`, `exam:<id>`) — sem
 *  ele, duas consultas no mesmo horário colidiriam na chave e só uma avisaria.
 *  É notNull com default "" e não nullable de propósito: no SQLite dois NULLs
 *  contam como distintos num índice único, o que desligaria a idempotência em
 *  silêncio justamente para água, treino e mente. */
export const reminderDelivery = sqliteTable(
  "reminder_delivery",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reminderId: text("reminder_id")
      .notNull()
      .references(() => reminder.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    slot: text("slot").notNull(),
    refId: text("ref_id").default("").notNull(),
    status: text("status").$type<"sent" | "missed">().notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("reminder_delivery_user_day_idx").on(table.userId, table.day),
    uniqueIndex("reminder_delivery_unique_idx").on(
      table.reminderId,
      table.day,
      table.slot,
      table.refId,
    ),
  ],
);

export type Reminder = typeof reminder.$inferSelect;
export type PushSubscription = typeof pushSubscription.$inferSelect;
export type ReminderDelivery = typeof reminderDelivery.$inferSelect;
