import "server-only";

import type { Db } from "@bloomy/db";
import { reminder, type Reminder } from "@bloomy/db/schema/reminder";
import { and, eq } from "drizzle-orm";

import { DEFAULT_TIME, type ReminderType } from "./slots";

export type ReminderUpdate = { time?: string; enabled?: boolean };

/** Tipos cujo horário é escolhido pela pessoa. Os demais têm horário derivado
 *  (remédios, consultas) ou constante (água) — ver `slots.ts`. */
export const TIMED_TYPES = ["workout", "mind"] as const;

export function hasOwnTime(type: ReminderType): boolean {
  return (TIMED_TYPES as readonly string[]).includes(type);
}

/** Estado inicial: o app lembra por padrão. Consultas nasce ligado — diferente do
 *  protótipo, que não previa aviso de exame nem o de 1h antes; nascer desligado
 *  significaria não receber nada até ligar na mão. */
const DEFAULTS: { type: ReminderType; time: string | null; enabled: boolean }[] = [
  { type: "water", time: null, enabled: true },
  { type: "meds", time: null, enabled: true },
  { type: "workout", time: DEFAULT_TIME.workout, enabled: true },
  { type: "mind", time: DEFAULT_TIME.mind, enabled: true },
  { type: "appointments", time: null, enabled: true },
];

/** Garante as linhas default e devolve todas. O seed é lazy (no primeiro GET) e
 *  não no onboarding porque já existem usuários que passaram por ele — eles
 *  ficariam sem lembrete nenhum. */
export async function listReminders(db: Db, userId: string): Promise<Reminder[]> {
  const existing = await db.select().from(reminder).where(eq(reminder.userId, userId));

  const missing = DEFAULTS.filter((d) => !existing.some((r) => r.type === d.type));
  if (missing.length === 0) return sortByType(existing);

  // onConflictDoNothing: dois GETs concorrentes no primeiro acesso não podem
  // estourar o UNIQUE(user_id, type).
  await db
    .insert(reminder)
    .values(missing.map((d) => ({ ...d, userId })))
    .onConflictDoNothing();

  return sortByType(await db.select().from(reminder).where(eq(reminder.userId, userId)));
}

/** Ordem da tela, não do banco: água, remédios, treino, mente, consultas. */
function sortByType(rows: Reminder[]): Reminder[] {
  const order = DEFAULTS.map((d) => d.type);
  return [...rows].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

export type UpdateReminderResult =
  | { ok: true; reminder: Reminder }
  | { ok: false; reason: "not_found" | "time_not_allowed" };

/**
 * Atualiza toggle e horário. A recusa de horário mora aqui, e não no zod da rota,
 * porque depende do tipo — e o handler só recebe um `id`, sem saber de qual
 * lembrete se trata antes de ler a linha.
 */
export async function updateReminder(
  db: Db,
  userId: string,
  id: string,
  input: ReminderUpdate,
): Promise<UpdateReminderResult> {
  const [current] = await db
    .select()
    .from(reminder)
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)));

  // Lembrete de outro usuário também cai aqui: 404 em vez de 403 não revela que existe.
  if (!current) return { ok: false, reason: "not_found" };

  if (input.time !== undefined && !hasOwnTime(current.type)) {
    return { ok: false, reason: "time_not_allowed" };
  }

  const [updated] = await db
    .update(reminder)
    .set({
      ...(input.time !== undefined && { time: input.time }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      updatedAt: new Date(),
    })
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    .returning();

  return { ok: true, reminder: updated };
}
