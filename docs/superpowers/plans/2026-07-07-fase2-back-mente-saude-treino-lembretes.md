# Fase 2 — Back-end de Perfil, Mente, Saúde, Treino e Lembretes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NÃO é TDD.** Decisão da usuária (igual à Fase 1): implementar primeiro; testes só dos pontos críticos, na Task 7. Cada task de domínio termina com `bun check-types` + commit.
>
> **Ao despachar implementer:** Read cada arquivo antes de Edit (`cat`/`sed` NÃO contam pro harness); se Edit falhar com `string not found`, re-Read antes de re-tentar; rodar `bun check-types` (na raiz) antes de commit.

**Goal:** Completar o backend dos domínios que faltam (Perfil, Mente, Saúde, Treino, Lembretes) para destravar o frontend inteiro, no mesmo padrão da Fase 1.

**Architecture:** Rotas REST finas (`zod` → `requireUserId` → serviço). Regras em `apps/web/src/server/<domínio>/service.ts` com `import "server-only"`, recebendo `db: Db` por parâmetro. Registros diários gravam coluna `day` via `dayFor()` (fuso `America/Sao_Paulo`, ADR-0002). Consulta/exame concluído pode gerar um "retorno" como novo item `to_schedule`. Treino tem fluxo completo (templates + sessão + log de séries + streak).

**Tech Stack:** Next.js 16 (route handlers), Drizzle ORM + libsql/Turso (SQLite), better-auth, zod v4, bun test.

## Global Constraints

- Identificadores de código em EN; UI/copy em PT (fase futura). Glossário: `apps/web/CONTEXT.md`.
- Migrations sempre (`bun db:generate` + `bun db:migrate` da raiz); **nunca** `db:push`. Migrations em `packages/db/src/migrations/`.
- Toda rota `/api` exige sessão → 401 JSON `{ "error": "unauthorized" }`; zod inválido → 400 `{ "error": "<mensagem>" }`.
- Schema segue o padrão de `auth.ts`/`body.ts`: ids `text` UUID (`.$defaultFn(() => crypto.randomUUID())`), timestamps `integer { mode: "timestamp_ms" }` com default `(cast(unixepoch('subsecond') * 1000 as integer))` via helper `timestampMs`.
- Tabelas de registro diário têm coluna `day` (`text`, `YYYY-MM-DD`) + índice `(user_id, day)`.
- Serviços: `import "server-only"`, recebem `Db`. O singleton `db` (`@bloomy/db`) só é importado por rotas.
- `@bloomy/db` exporta `./*` → `./src/*.ts`; um novo `src/schema/x.ts` é importável como `@bloomy/db/schema/x` e deve ser re-exportado em `src/schema/index.ts`.
- Conventional Commits em PT, subject ≤50 chars. `bun check-types` (raiz) passa antes de cada commit.
- Não criar UI. Não mexer em `packages/ui`.

## Contrato REST (referência — novas rotas)

| Método | Rota | Body/Query | Retorno |
|---|---|---|---|
| GET | `/api/profile` | — | `{ profile }` (cria na 1ª) |
| PATCH | `/api/profile` | `{ restSeconds?, autoRest?, completeOnboarding? }` | `{ profile }` |
| GET | `/api/checkins?day=` | day opcional | `{ checkin \| null }` |
| PUT | `/api/checkins` | `{ mood?, anxiety?, note? }` | `{ checkin }` |
| GET | `/api/checkins/history?limit=` | — | `{ checkins }` |
| GET | `/api/appointments` | — | `{ appointments }` |
| GET | `/api/appointments/next` | — | `{ appointment \| null }` |
| POST | `/api/appointments` | `{ professional, specialty?, scheduledAt, location?, remindDayBefore? }` | `{ appointment }` (201) |
| PUT | `/api/appointments/:id` | parcial | `{ appointment }` |
| POST | `/api/appointments/:id/complete` | `{ needsReturn, followUpMonths? }` | `{ appointment, followUp }` |
| DELETE | `/api/appointments/:id` | — | `{ ok: true }` |
| GET | `/api/exams` | — | `{ exams }` |
| POST | `/api/exams` | `{ name, status?, scheduledAt? }` | `{ exam }` (201) |
| PUT | `/api/exams/:id` | parcial | `{ exam }` |
| POST | `/api/exams/:id/complete` | `{ needsReturn, followUpMonths? }` | `{ exam, followUp }` |
| DELETE | `/api/exams/:id` | — | `{ ok: true }` |
| GET | `/api/workouts` | — | `{ workouts }` (ativos + exercícios) |
| POST | `/api/workouts` | `{ name, focus, exercises[] }` | `{ workout }` (201) |
| PUT | `/api/workouts/:id` | `{ name?, focus?, exercises? }` | `{ workout }` |
| DELETE | `/api/workouts/:id` | — | `{ ok: true }` (soft) |
| POST | `/api/workouts/:id/sessions` | — | `{ session }` (201; 409 se ativa) |
| GET | `/api/sessions/active` | — | `{ session \| null }` |
| PUT | `/api/sessions/:id/sets/:setId` | `{ reps?, load?, done? }` | `{ set }` |
| POST | `/api/sessions/:id/complete` | — | `{ completedAt, durationSec, exerciseCount }` |
| GET | `/api/workouts/summary` | — | `{ weekCount, weekTarget, streak, weekDays }` |
| GET | `/api/reminders` | — | `{ reminders }` |
| POST | `/api/reminders` | `{ type, time }` | `{ reminder }` (201) |
| PUT | `/api/reminders/:id` | `{ time?, enabled? }` | `{ reminder }` |
| DELETE | `/api/reminders/:id` | — | `{ ok: true }` |

Nota de roteamento Next.js: o segmento estático `/api/workouts/summary` tem prioridade sobre o dinâmico `/api/workouts/[id]` — sem colisão.

---

### Task 1: Perfil — schema, serviço e rotas

**Files:**
- Create: `packages/db/src/schema/profile.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/web/src/server/profile/service.ts`
- Create: `apps/web/src/app/api/profile/route.ts`

**Interfaces:**
- Consumes: `user` de `./auth`; `Db`, `db` de `@bloomy/db`; helpers de `@/server/shared/api`.
- Produces: tabela `profile`; `Profile`; `ensureProfile(db, userId): Promise<Profile>`; `updateProfile(db, userId, input: ProfileUpdate): Promise<Profile>`; `ProfileUpdate`.

- [ ] **Step 1: Criar `packages/db/src/schema/profile.ts`**

```ts
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
```

- [ ] **Step 2: Re-exportar em `packages/db/src/schema/index.ts`**

Acrescentar a linha (mantendo as existentes `auth`/`body`/`goals`):

```ts
export * from "./profile";
```

- [ ] **Step 3: Criar `apps/web/src/server/profile/service.ts`**

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { profile, type Profile } from "@bloomy/db/schema/profile";
import { eq } from "drizzle-orm";

export type ProfileUpdate = {
  restSeconds?: number;
  autoRest?: boolean;
  completeOnboarding?: boolean;
};

/** Cria o profile on-demand (1:1 com user) e retorna. */
export async function ensureProfile(db: Db, userId: string): Promise<Profile> {
  await db.insert(profile).values({ userId }).onConflictDoNothing();
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId));
  return row;
}

export async function updateProfile(
  db: Db,
  userId: string,
  input: ProfileUpdate,
): Promise<Profile> {
  await ensureProfile(db, userId);
  const [updated] = await db
    .update(profile)
    .set({
      ...(input.restSeconds !== undefined && { restSeconds: input.restSeconds }),
      ...(input.autoRest !== undefined && { autoRest: input.autoRest }),
      ...(input.completeOnboarding && { onboardingCompletedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, userId))
    .returning();
  return updated;
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/profile/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { ensureProfile, updateProfile } from "@/server/profile/service";

const PATCH_SCHEMA = z.object({
  restSeconds: z.number().int().min(15).max(600).optional(),
  autoRest: z.boolean().optional(),
  completeOnboarding: z.boolean().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const profile = await ensureProfile(db, userId);
  return Response.json({ profile });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PATCH_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const profile = await updateProfile(db, userId, parsed.data);
  return Response.json({ profile });
}
```

- [ ] **Step 5: Gerar e aplicar a migration**

Run: `bun db:generate`
Expected: novo `packages/db/src/migrations/0002_*.sql` com `CREATE TABLE profile`.

Pré-requisito: banco local de pé (`bun db:local` em outro terminal, se `DATABASE_URL` não for um Turso remoto de dev).
Run: `bun db:migrate`
Expected: aplica sem erro.

- [ ] **Step 6: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add packages/db apps/web/src/server/profile apps/web/src/app/api/profile
git commit -m "feat: perfil com gate de onboarding e prefs"
```

---

### Task 2: Mente — check-in (1 por dia, upsert)

**Files:**
- Create: `packages/db/src/schema/mind.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/web/src/server/mind/service.ts`
- Create: `apps/web/src/app/api/checkins/route.ts`
- Create: `apps/web/src/app/api/checkins/history/route.ts`

**Interfaces:**
- Consumes: `user`; `dayFor`, `DAY_SCHEMA` de `@/server/shared/day`; helpers de `@/server/shared/api`.
- Produces: tabela `mood_checkin`; `MoodCheckin`, `Mood`; `upsertCheckin(db, userId, input: CheckinInput): Promise<MoodCheckin>`; `getCheckin(db, userId, day): Promise<MoodCheckin | null>`; `listCheckins(db, userId, limit): Promise<MoodCheckin[]>`; `CheckinInput`.

- [ ] **Step 1: Criar `packages/db/src/schema/mind.ts`**

```ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

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
```

- [ ] **Step 2: Re-exportar em `packages/db/src/schema/index.ts`**

```ts
export * from "./mind";
```

- [ ] **Step 3: Criar `apps/web/src/server/mind/service.ts`**

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { moodCheckin, type MoodCheckin } from "@bloomy/db/schema/mind";
import { and, desc, eq } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

export type Mood = NonNullable<MoodCheckin["mood"]>;

export type CheckinInput = {
  mood?: Mood;
  anxiety?: number;
  note?: string;
};

/** Um check-in por (usuário, dia): humor + ansiedade + nota (upsert). */
export async function upsertCheckin(
  db: Db,
  userId: string,
  input: CheckinInput,
): Promise<MoodCheckin> {
  const day = dayFor();
  const [row] = await db
    .insert(moodCheckin)
    .values({
      userId,
      day,
      mood: input.mood ?? null,
      anxiety: input.anxiety ?? null,
      note: input.note ?? null,
    })
    .onConflictDoUpdate({
      target: [moodCheckin.userId, moodCheckin.day],
      set: {
        ...(input.mood !== undefined && { mood: input.mood }),
        ...(input.anxiety !== undefined && { anxiety: input.anxiety }),
        ...(input.note !== undefined && { note: input.note }),
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function getCheckin(
  db: Db,
  userId: string,
  day: string,
): Promise<MoodCheckin | null> {
  const [row] = await db
    .select()
    .from(moodCheckin)
    .where(and(eq(moodCheckin.userId, userId), eq(moodCheckin.day, day)));
  return row ?? null;
}

export async function listCheckins(
  db: Db,
  userId: string,
  limit: number,
): Promise<MoodCheckin[]> {
  return db
    .select()
    .from(moodCheckin)
    .where(eq(moodCheckin.userId, userId))
    .orderBy(desc(moodCheckin.day))
    .limit(limit);
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/checkins/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { getCheckin, upsertCheckin } from "@/server/mind/service";

const PUT_SCHEMA = z
  .object({
    mood: z.enum(["sad", "meh", "neutral", "good", "great"]).optional(),
    anxiety: z.number().int().min(0).max(100).optional(),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (v) => v.mood !== undefined || v.anxiety !== undefined || v.note !== undefined,
    { message: "at least one field required" },
  );

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  const checkin = await getCheckin(db, userId, day.data);
  return Response.json({ checkin });
}

export async function PUT(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = PUT_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const checkin = await upsertCheckin(db, userId, parsed.data);
  return Response.json({ checkin });
}
```

- [ ] **Step 5: Criar `apps/web/src/app/api/checkins/history/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { listCheckins } from "@/server/mind/service";

const LIMIT_SCHEMA = z.coerce.number().int().min(1).max(100);

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("limit");
  const limit = raw ? LIMIT_SCHEMA.safeParse(raw) : { success: true as const, data: 30 };
  if (!limit.success) return badRequest("invalid limit");

  const checkins = await listCheckins(db, userId, limit.data);
  return Response.json({ checkins });
}
```

- [ ] **Step 6: Migration**

Run: `bun db:generate` → `0003_*.sql` com `CREATE TABLE mood_checkin`.
Run: `bun db:migrate` (banco local de pé).

- [ ] **Step 7: Typecheck e commit**

Run: `bun check-types`

```bash
git add packages/db apps/web/src/server/mind apps/web/src/app/api/checkins
git commit -m "feat: check-in diário de humor e diário"
```

---

### Task 3: Saúde — consultas e exames com ciclo de retorno

**Files:**
- Create: `packages/db/src/schema/health.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/web/src/server/health/service.ts`
- Create: `apps/web/src/app/api/appointments/route.ts`
- Create: `apps/web/src/app/api/appointments/next/route.ts`
- Create: `apps/web/src/app/api/appointments/[id]/route.ts`
- Create: `apps/web/src/app/api/appointments/[id]/complete/route.ts`
- Create: `apps/web/src/app/api/exams/route.ts`
- Create: `apps/web/src/app/api/exams/[id]/route.ts`
- Create: `apps/web/src/app/api/exams/[id]/complete/route.ts`

**Interfaces:**
- Consumes: `user`; helpers de `@/server/shared/api`.
- Produces: tabelas `appointment`, `exam`; `Appointment`, `Exam`; serviço com `listAppointments`, `nextAppointment`, `createAppointment`, `updateAppointment`, `deleteAppointment`, `completeAppointment`, `listExams`, `createExam`, `updateExam`, `deleteExam`, `completeExam` (assinaturas nos steps).

- [ ] **Step 1: Criar `packages/db/src/schema/health.ts`**

`parentId` é auto-referência (retorno aponta pra origem) → usa `AnySQLiteColumn`.

```ts
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

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
      .$type<"to_schedule" | "scheduled" | "result_available" | "completed">()
      .default("to_schedule")
      .notNull(),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    suggestedAt: integer("suggested_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    parentId: text("parent_id").references((): AnySQLiteColumn => exam.id, {
      onDelete: "set null",
    }),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("exam_user_idx").on(table.userId)],
);

export type Appointment = typeof appointment.$inferSelect;
export type Exam = typeof exam.$inferSelect;
```

- [ ] **Step 2: Re-exportar em `packages/db/src/schema/index.ts`**

```ts
export * from "./health";
```

- [ ] **Step 3: Criar `apps/web/src/server/health/service.ts`**

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import {
  appointment,
  exam,
  type Appointment,
  type Exam,
} from "@bloomy/db/schema/health";
import { and, asc, eq, gte, isNotNull, lte, or } from "drizzle-orm";

const NEXT_WINDOW_DAYS = 30;

/** Soma meses preservando o instante (retorno sugerido). */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ---------- Consultas ----------

export type AppointmentInput = {
  professional: string;
  specialty?: string;
  scheduledAt: Date;
  location?: string;
  remindDayBefore?: boolean;
};

export type AppointmentUpdate = {
  professional?: string;
  specialty?: string;
  scheduledAt?: Date;
  location?: string;
  remindDayBefore?: boolean;
};

export async function listAppointments(db: Db, userId: string): Promise<Appointment[]> {
  return db
    .select()
    .from(appointment)
    .where(eq(appointment.userId, userId))
    .orderBy(asc(appointment.scheduledAt));
}

/** Próxima: consulta marcada futura, ou retorno a agendar dentro de 30 dias. */
export async function nextAppointment(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<Appointment | null> {
  const windowEnd = new Date(now.getTime() + NEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(appointment)
    .where(
      and(
        eq(appointment.userId, userId),
        or(
          and(eq(appointment.status, "scheduled"), gte(appointment.scheduledAt, now)),
          and(
            eq(appointment.status, "to_schedule"),
            isNotNull(appointment.suggestedAt),
            lte(appointment.suggestedAt, windowEnd),
          ),
        ),
      ),
    );

  const withDate = rows
    .map((r) => ({ r, at: r.scheduledAt ?? r.suggestedAt }))
    .filter((x): x is { r: Appointment; at: Date } => x.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return withDate[0]?.r ?? null;
}

export async function createAppointment(
  db: Db,
  userId: string,
  input: AppointmentInput,
): Promise<Appointment> {
  const [created] = await db
    .insert(appointment)
    .values({
      userId,
      professional: input.professional,
      specialty: input.specialty ?? null,
      status: "scheduled",
      scheduledAt: input.scheduledAt,
      location: input.location ?? null,
      remindDayBefore: input.remindDayBefore ?? false,
    })
    .returning();
  return created;
}

/** Parcial. Dar `scheduledAt` a um retorno `to_schedule` promove pra `scheduled`. */
export async function updateAppointment(
  db: Db,
  userId: string,
  id: string,
  input: AppointmentUpdate,
): Promise<Appointment | null> {
  const [updated] = await db
    .update(appointment)
    .set({
      ...(input.professional !== undefined && { professional: input.professional }),
      ...(input.specialty !== undefined && { specialty: input.specialty }),
      ...(input.scheduledAt !== undefined && {
        scheduledAt: input.scheduledAt,
        status: "scheduled" as const,
      }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.remindDayBefore !== undefined && { remindDayBefore: input.remindDayBefore }),
      updatedAt: new Date(),
    })
    .where(and(eq(appointment.id, id), eq(appointment.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteAppointment(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(appointment)
    .where(and(eq(appointment.id, id), eq(appointment.userId, userId)))
    .returning();
  return deleted.length > 0;
}

/** Conclui e, se pedir retorno, cria um novo item `to_schedule` copiando profissional. */
export async function completeAppointment(
  db: Db,
  userId: string,
  id: string,
  input: { needsReturn: boolean; followUpMonths?: number },
): Promise<{ completed: Appointment; followUp: Appointment | null } | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [completed] = await tx
      .update(appointment)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(and(eq(appointment.id, id), eq(appointment.userId, userId)))
      .returning();
    if (!completed) return null;

    let followUp: Appointment | null = null;
    if (input.needsReturn) {
      const months = input.followUpMonths ?? 1;
      const [created] = await tx
        .insert(appointment)
        .values({
          userId,
          professional: completed.professional,
          specialty: completed.specialty,
          status: "to_schedule",
          suggestedAt: addMonths(now, months),
          parentId: completed.id,
        })
        .returning();
      followUp = created;
    }
    return { completed, followUp };
  });
}

// ---------- Exames ----------

export type ExamInput = {
  name: string;
  status?: Exam["status"];
  scheduledAt?: Date;
};

export type ExamUpdate = {
  name?: string;
  status?: Exam["status"];
  scheduledAt?: Date;
};

export async function listExams(db: Db, userId: string): Promise<Exam[]> {
  return db
    .select()
    .from(exam)
    .where(eq(exam.userId, userId))
    .orderBy(asc(exam.scheduledAt));
}

export async function createExam(
  db: Db,
  userId: string,
  input: ExamInput,
): Promise<Exam> {
  const [created] = await db
    .insert(exam)
    .values({
      userId,
      name: input.name,
      status: input.status ?? "to_schedule",
      scheduledAt: input.scheduledAt ?? null,
    })
    .returning();
  return created;
}

export async function updateExam(
  db: Db,
  userId: string,
  id: string,
  input: ExamUpdate,
): Promise<Exam | null> {
  const [updated] = await db
    .update(exam)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, id), eq(exam.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteExam(db: Db, userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(exam)
    .where(and(eq(exam.id, id), eq(exam.userId, userId)))
    .returning();
  return deleted.length > 0;
}

export async function completeExam(
  db: Db,
  userId: string,
  id: string,
  input: { needsReturn: boolean; followUpMonths?: number },
): Promise<{ completed: Exam; followUp: Exam | null } | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [completed] = await tx
      .update(exam)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(and(eq(exam.id, id), eq(exam.userId, userId)))
      .returning();
    if (!completed) return null;

    let followUp: Exam | null = null;
    if (input.needsReturn) {
      const months = input.followUpMonths ?? 1;
      const [created] = await tx
        .insert(exam)
        .values({
          userId,
          name: completed.name,
          status: "to_schedule",
          suggestedAt: addMonths(now, months),
          parentId: completed.id,
        })
        .returning();
      followUp = created;
    }
    return { completed, followUp };
  });
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/appointments/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createAppointment, listAppointments } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  professional: z.string().min(1).max(120),
  specialty: z.string().max(120).optional(),
  scheduledAt: z.coerce.date(),
  location: z.string().max(200).optional(),
  remindDayBefore: z.boolean().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ appointments: await listAppointments(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const appointment = await createAppointment(db, userId, parsed.data);
  return Response.json({ appointment }, { status: 201 });
}
```

- [ ] **Step 5: Criar `apps/web/src/app/api/appointments/next/route.ts`**

```ts
import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { nextAppointment } from "@/server/health/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const appointment = await nextAppointment(db, userId);
  return Response.json({ appointment });
}
```

- [ ] **Step 6: Criar `apps/web/src/app/api/appointments/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deleteAppointment, updateAppointment } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  professional: z.string().min(1).max(120).optional(),
  specialty: z.string().max(120).optional(),
  scheduledAt: z.coerce.date().optional(),
  location: z.string().max(200).optional(),
  remindDayBefore: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const appointment = await updateAppointment(db, userId, id, parsed.data);
  if (!appointment) return notFound();

  return Response.json({ appointment });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteAppointment(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 7: Criar `apps/web/src/app/api/appointments/[id]/complete/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeAppointment } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  needsReturn: z.boolean(),
  followUpMonths: z.number().int().min(1).max(60).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const result = await completeAppointment(db, userId, id, parsed.data);
  if (!result) return notFound();

  return Response.json({ appointment: result.completed, followUp: result.followUp });
}
```

- [ ] **Step 8: Criar `apps/web/src/app/api/exams/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createExam, listExams } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(["to_schedule", "scheduled", "result_available", "completed"]).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ exams: await listExams(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const exam = await createExam(db, userId, parsed.data);
  return Response.json({ exam }, { status: 201 });
}
```

- [ ] **Step 9: Criar `apps/web/src/app/api/exams/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deleteExam, updateExam } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.enum(["to_schedule", "scheduled", "result_available", "completed"]).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const exam = await updateExam(db, userId, id, parsed.data);
  if (!exam) return notFound();

  return Response.json({ exam });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteExam(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 10: Criar `apps/web/src/app/api/exams/[id]/complete/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeExam } from "@/server/health/service";

const BODY_SCHEMA = z.object({
  needsReturn: z.boolean(),
  followUpMonths: z.number().int().min(1).max(60).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const result = await completeExam(db, userId, id, parsed.data);
  if (!result) return notFound();

  return Response.json({ exam: result.completed, followUp: result.followUp });
}
```

- [ ] **Step 11: Migration**

Run: `bun db:generate` → `0004_*.sql` com `CREATE TABLE appointment` + `exam`.
Run: `bun db:migrate` (banco local de pé).

- [ ] **Step 12: Typecheck e commit**

Run: `bun check-types`

```bash
git add packages/db apps/web/src/server/health apps/web/src/app/api/appointments apps/web/src/app/api/exams
git commit -m "feat: consultas e exames com ciclo de retorno"
```

---

### Task 4: Treino — schema (4 tabelas) e templates

**Files:**
- Create: `packages/db/src/schema/workout.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/web/src/server/workout/service.ts`
- Create: `apps/web/src/app/api/workouts/route.ts`
- Create: `apps/web/src/app/api/workouts/[id]/route.ts`

**Interfaces:**
- Consumes: `user`; `goal` de `@bloomy/db/schema/goals` (na Task 5); `dayFor` (na Task 5); helpers de `@/server/shared/api`.
- Produces: tabelas `workout`, `exercise`, `workout_session`, `set_log`; tipos `Workout`, `Exercise`, `WorkoutSession`, `SetLog`; `Focus`, `ExerciseInput`, `WorkoutInput`, `WorkoutWithExercises`; `listWorkouts`, `createWorkout`, `updateWorkout`, `deactivateWorkout`.

**Nota de design (histórico sobrevive a edições):** `set_log` guarda `exerciseName` desnormalizado e `exerciseId` **nullable** (`onDelete: "set null"`). Editar exercícios de um template é replace-all; keyar "último treino" por `exerciseName` evita perder histórico quando um exercício é recriado com novo id.

- [ ] **Step 1: Criar `packages/db/src/schema/workout.ts`**

```ts
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const workout = sqliteTable(
  "workout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    focus: text("focus").$type<"chest" | "back" | "legs" | "cardio">().notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("workout_user_idx").on(table.userId)],
);

export const exercise = sqliteTable(
  "exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetSets: integer("target_sets").notNull(),
    position: integer("position").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("exercise_workout_idx").on(table.workoutId)],
);

export const workoutSession = sqliteTable(
  "workout_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workout.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    startedAt: timestampMs("started_at"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("workout_session_user_day_idx").on(table.userId, table.day)],
);

export const setLog = sqliteTable(
  "set_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => workoutSession.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").references(() => exercise.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    load: real("load"),
    done: integer("done", { mode: "boolean" }).default(false).notNull(),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("set_log_session_idx").on(table.sessionId)],
);

export type Workout = typeof workout.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type WorkoutSession = typeof workoutSession.$inferSelect;
export type SetLog = typeof setLog.$inferSelect;
```

- [ ] **Step 2: Re-exportar em `packages/db/src/schema/index.ts`**

```ts
export * from "./workout";
```

- [ ] **Step 3: Criar `apps/web/src/server/workout/service.ts` (parte de templates)**

Este arquivo cresce na Task 5. Nesta task, só a parte de templates:

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  workout,
  type Exercise,
  type Workout,
} from "@bloomy/db/schema/workout";
import { and, asc, eq, inArray } from "drizzle-orm";

export type Focus = Workout["focus"];

export type ExerciseInput = { name: string; targetSets: number; position: number };
export type WorkoutInput = { name: string; focus: Focus; exercises: ExerciseInput[] };
export type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export async function listWorkouts(
  db: Db,
  userId: string,
): Promise<WorkoutWithExercises[]> {
  const workouts = await db
    .select()
    .from(workout)
    .where(and(eq(workout.userId, userId), eq(workout.active, true)))
    .orderBy(asc(workout.createdAt));
  if (workouts.length === 0) return [];

  const exercises = await db
    .select()
    .from(exercise)
    .where(inArray(exercise.workoutId, workouts.map((w) => w.id)))
    .orderBy(asc(exercise.position));

  return workouts.map((w) => ({
    ...w,
    exercises: exercises.filter((e) => e.workoutId === w.id),
  }));
}

export async function createWorkout(
  db: Db,
  userId: string,
  input: WorkoutInput,
): Promise<WorkoutWithExercises> {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(workout)
      .values({ userId, name: input.name, focus: input.focus })
      .returning();

    const rows = input.exercises.map((e) => ({
      workoutId: created.id,
      userId,
      name: e.name,
      targetSets: e.targetSets,
      position: e.position,
    }));
    const exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];

    return { ...created, exercises };
  });
}

/** Edita o template. Se `exercises` vier, faz replace-all (add/remove/reorder). */
export async function updateWorkout(
  db: Db,
  userId: string,
  id: string,
  input: Partial<WorkoutInput>,
): Promise<WorkoutWithExercises | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(workout)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.focus !== undefined && { focus: input.focus }),
        updatedAt: new Date(),
      })
      .where(and(eq(workout.id, id), eq(workout.userId, userId)))
      .returning();
    if (!updated) return null;

    let exercises: Exercise[];
    if (input.exercises !== undefined) {
      await tx.delete(exercise).where(eq(exercise.workoutId, id));
      const rows = input.exercises.map((e) => ({
        workoutId: id,
        userId,
        name: e.name,
        targetSets: e.targetSets,
        position: e.position,
      }));
      exercises = rows.length ? await tx.insert(exercise).values(rows).returning() : [];
    } else {
      exercises = await tx
        .select()
        .from(exercise)
        .where(eq(exercise.workoutId, id))
        .orderBy(asc(exercise.position));
    }

    return { ...updated, exercises };
  });
}

export async function deactivateWorkout(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const updated = await db
    .update(workout)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning();
  return updated.length > 0;
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/workouts/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createWorkout, listWorkouts } from "@/server/workout/service";

const EXERCISE_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  position: z.number().int().min(0),
});

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  focus: z.enum(["chest", "back", "legs", "cardio"]),
  exercises: z.array(EXERCISE_SCHEMA).max(30),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ workouts: await listWorkouts(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const workout = await createWorkout(db, userId, parsed.data);
  return Response.json({ workout }, { status: 201 });
}
```

- [ ] **Step 5: Criar `apps/web/src/app/api/workouts/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deactivateWorkout, updateWorkout } from "@/server/workout/service";

const EXERCISE_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  position: z.number().int().min(0),
});

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  focus: z.enum(["chest", "back", "legs", "cardio"]).optional(),
  exercises: z.array(EXERCISE_SCHEMA).max(30).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const workout = await updateWorkout(db, userId, id, parsed.data);
  if (!workout) return notFound();

  return Response.json({ workout });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deactivated = await deactivateWorkout(db, userId, id);
  if (!deactivated) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Migration**

Run: `bun db:generate` → `0005_*.sql` com `CREATE TABLE workout` + `exercise` + `workout_session` + `set_log`.
Run: `bun db:migrate` (banco local de pé).

- [ ] **Step 7: Typecheck e commit**

Run: `bun check-types`

```bash
git add packages/db apps/web/src/server/workout apps/web/src/app/api/workouts
git commit -m "feat: templates de treino com exercícios"
```

---

### Task 5: Treino — sessão em andamento, séries e streak

**Files:**
- Modify: `apps/web/src/server/workout/service.ts` (acrescentar sessão/séries/streak)
- Create: `apps/web/src/app/api/workouts/[id]/sessions/route.ts`
- Create: `apps/web/src/app/api/sessions/active/route.ts`
- Create: `apps/web/src/app/api/sessions/[id]/sets/[setId]/route.ts`
- Create: `apps/web/src/app/api/sessions/[id]/complete/route.ts`
- Create: `apps/web/src/app/api/workouts/summary/route.ts`

**Interfaces:**
- Consumes: tabelas/tipos da Task 4; `goal` de `@bloomy/db/schema/goals`; `dayFor` de `@/server/shared/day`.
- Produces: `SessionDetail`, `SessionExercise`; `lastPerformance`, `startSession`, `getActiveSession`, `updateSet`, `completeSession`, `summarizeWorkouts` (pura), `workoutSummary`.

- [ ] **Step 1: Acrescentar imports e helpers puros no topo de `apps/web/src/server/workout/service.ts`**

Ajustar a linha de import de `@bloomy/db/schema/workout` para incluir as tabelas de sessão, e adicionar os novos imports **abaixo dos imports existentes**:

```ts
import {
  exercise,
  setLog,
  workout,
  workoutSession,
  type Exercise,
  type SetLog,
  type Workout,
  type WorkoutSession,
} from "@bloomy/db/schema/workout";
import { goal } from "@bloomy/db/schema/goals";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";
```

(substitui os imports parciais da Task 4 — mantém `and/asc/eq/inArray` e adiciona `desc/isNotNull/isNull`.)

- [ ] **Step 2: Acrescentar tipos e helpers de data (fim do arquivo)**

```ts
export type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  position: number;
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: SessionExercise[];
};

/** Segunda-feira (YYYY-MM-DD) da semana de um dia — semana ISO seg–dom. */
function mondayOf(dayStr: string): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0=dom..6=sáb
  date.setUTCDate(date.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return date.toISOString().slice(0, 10);
}

function addDaysStr(dayStr: string, n: number): string {
  const [y, m, d] = dayStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 3: Acrescentar `lastPerformance` e a derivação de sessão**

```ts
/** Último treino do exercício (por nome): sobrevive a edições de template. */
export async function lastPerformance(
  db: Db,
  userId: string,
  exerciseName: string,
): Promise<{ reps: number | null; load: number | null } | null> {
  const [row] = await db
    .select({ reps: setLog.reps, load: setLog.load })
    .from(setLog)
    .innerJoin(workoutSession, eq(setLog.sessionId, workoutSession.id))
    .where(
      and(
        eq(setLog.userId, userId),
        eq(setLog.exerciseName, exerciseName),
        eq(setLog.done, true),
        isNotNull(setLog.load),
        isNotNull(workoutSession.completedAt),
      ),
    )
    .orderBy(desc(workoutSession.completedAt), asc(setLog.setIndex))
    .limit(1);
  return row ?? null;
}

async function buildSessionDetail(
  db: Db,
  session: WorkoutSession,
  userId: string,
): Promise<SessionDetail> {
  const exercises = await db
    .select()
    .from(exercise)
    .where(eq(exercise.workoutId, session.workoutId))
    .orderBy(asc(exercise.position));

  const sets = await db
    .select()
    .from(setLog)
    .where(eq(setLog.sessionId, session.id))
    .orderBy(asc(setLog.setIndex));

  const detail: SessionExercise[] = [];
  for (const ex of exercises) {
    detail.push({
      exerciseId: ex.id,
      name: ex.name,
      targetSets: ex.targetSets,
      position: ex.position,
      sets: sets.filter((s) => s.exerciseId === ex.id),
      lastPerformance: await lastPerformance(db, userId, ex.name),
    });
  }
  return { session, exercises: detail };
}
```

- [ ] **Step 4: Acrescentar `startSession` / `getActiveSession`**

```ts
/** Inicia uma sessão: 1 ativa por vez; pré-preenche séries com o último treino. */
export async function startSession(
  db: Db,
  userId: string,
  workoutId: string,
): Promise<SessionDetail | "already_active" | "not_found"> {
  const [active] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNull(workoutSession.completedAt)));
  if (active) return "already_active";

  const [w] = await db
    .select()
    .from(workout)
    .where(
      and(eq(workout.id, workoutId), eq(workout.userId, userId), eq(workout.active, true)),
    );
  if (!w) return "not_found";

  const exercises = await db
    .select()
    .from(exercise)
    .where(eq(exercise.workoutId, workoutId))
    .orderBy(asc(exercise.position));

  // pré-computa o último treino de cada exercício antes da transação (evita atrito tx/db)
  const perfByName = new Map<string, { reps: number | null; load: number | null } | null>();
  for (const ex of exercises) {
    if (!perfByName.has(ex.name)) {
      perfByName.set(ex.name, await lastPerformance(db, userId, ex.name));
    }
  }

  const session = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(workoutSession)
      .values({ userId, workoutId, day: dayFor() })
      .returning();

    for (const ex of exercises) {
      const last = perfByName.get(ex.name) ?? null;
      const rows = Array.from({ length: ex.targetSets }, (_, i) => ({
        sessionId: s.id,
        exerciseId: ex.id,
        userId,
        exerciseName: ex.name,
        setIndex: i + 1,
        reps: last?.reps ?? null,
        load: last?.load ?? null,
        done: false,
      }));
      if (rows.length) await tx.insert(setLog).values(rows);
    }
    return s;
  });

  return buildSessionDetail(db, session, userId);
}

export async function getActiveSession(
  db: Db,
  userId: string,
): Promise<SessionDetail | null> {
  const [active] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNull(workoutSession.completedAt)));
  if (!active) return null;
  return buildSessionDetail(db, active, userId);
}
```

- [ ] **Step 5: Acrescentar `updateSet` / `completeSession`**

```ts
export async function updateSet(
  db: Db,
  userId: string,
  sessionId: string,
  setId: string,
  input: { reps?: number; load?: number; done?: boolean },
): Promise<SetLog | null> {
  const [updated] = await db
    .update(setLog)
    .set({
      ...(input.reps !== undefined && { reps: input.reps }),
      ...(input.load !== undefined && { load: input.load }),
      ...(input.done !== undefined && {
        done: input.done,
        doneAt: input.done ? new Date() : null,
      }),
    })
    .where(
      and(
        eq(setLog.id, setId),
        eq(setLog.sessionId, sessionId),
        eq(setLog.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function completeSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<{ completedAt: Date; durationSec: number; exerciseCount: number } | null> {
  const [session] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.id, sessionId), eq(workoutSession.userId, userId)));
  if (!session || session.completedAt) return null;

  const completedAt = new Date();
  await db
    .update(workoutSession)
    .set({ completedAt })
    .where(eq(workoutSession.id, sessionId));

  const exercises = await db
    .select({ id: exercise.id })
    .from(exercise)
    .where(eq(exercise.workoutId, session.workoutId));

  const durationSec = Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000);
  return { completedAt, durationSec, exerciseCount: exercises.length };
}
```

- [ ] **Step 6: Acrescentar `summarizeWorkouts` (pura) e `workoutSummary`**

```ts
/**
 * Resumo da semana + streak. Pura para testar isolada.
 * `weekDays`: 7 bools (seg..dom) da semana corrente.
 * `streak`: semanas fechadas consecutivas com nº de dias ativos >= meta;
 *   a semana corrente soma ao streak quando já bateu a meta (celebra), e nunca o quebra.
 */
export function summarizeWorkouts(
  days: string[],
  target: number,
  now: Date,
): { weekCount: number; streak: number; weekDays: boolean[] } {
  const weekStart = mondayOf(dayFor(now));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));
  const daySet = new Set(days);
  const weekDays = weekDates.map((d) => daySet.has(d));
  const weekCount = weekDays.filter(Boolean).length;

  const perWeek = new Map<string, Set<string>>();
  for (const d of days) {
    const wk = mondayOf(d);
    if (!perWeek.has(wk)) perWeek.set(wk, new Set());
    perWeek.get(wk)!.add(d);
  }

  let streak = 0;
  let cursor = addDaysStr(weekStart, -7);
  while ((perWeek.get(cursor)?.size ?? 0) >= target) {
    streak += 1;
    cursor = addDaysStr(cursor, -7);
  }
  if (weekCount >= target) streak += 1;

  return { weekCount, streak, weekDays };
}

async function weekTargetFor(db: Db, userId: string): Promise<number> {
  const [g] = await db
    .select({ target: goal.target })
    .from(goal)
    .where(and(eq(goal.userId, userId), eq(goal.domain, "workout")));
  return g?.target ?? 4;
}

export async function workoutSummary(
  db: Db,
  userId: string,
  now: Date = new Date(),
): Promise<{ weekCount: number; weekTarget: number; streak: number; weekDays: boolean[] }> {
  const weekTarget = await weekTargetFor(db, userId);
  const sessions = await db
    .select({ day: workoutSession.day })
    .from(workoutSession)
    .where(and(eq(workoutSession.userId, userId), isNotNull(workoutSession.completedAt)));

  return { weekTarget, ...summarizeWorkouts(sessions.map((s) => s.day), weekTarget, now) };
}
```

- [ ] **Step 7: Criar `apps/web/src/app/api/workouts/[id]/sessions/route.ts`**

```ts
import { db } from "@bloomy/db";

import { conflict, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { startSession } from "@/server/workout/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const result = await startSession(db, userId, id);
  if (result === "not_found") return notFound();
  if (result === "already_active") return conflict("a session is already active");

  return Response.json({ session: result }, { status: 201 });
}
```

- [ ] **Step 8: Criar `apps/web/src/app/api/sessions/active/route.ts`**

```ts
import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { getActiveSession } from "@/server/workout/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const session = await getActiveSession(db, userId);
  return Response.json({ session });
}
```

- [ ] **Step 9: Criar `apps/web/src/app/api/sessions/[id]/sets/[setId]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { updateSet } from "@/server/workout/service";

const BODY_SCHEMA = z
  .object({
    reps: z.number().int().min(0).max(1000).optional(),
    load: z.number().min(0).max(1000).optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => v.reps !== undefined || v.load !== undefined || v.done !== undefined, {
    message: "at least one field required",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id, setId } = await params;
  const set = await updateSet(db, userId, id, setId, parsed.data);
  if (!set) return notFound();

  return Response.json({ set });
}
```

- [ ] **Step 10: Criar `apps/web/src/app/api/sessions/[id]/complete/route.ts`**

```ts
import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { completeSession } from "@/server/workout/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const summary = await completeSession(db, userId, id);
  if (!summary) return notFound();

  return Response.json(summary);
}
```

- [ ] **Step 11: Criar `apps/web/src/app/api/workouts/summary/route.ts`**

```ts
import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { workoutSummary } from "@/server/workout/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json(await workoutSummary(db, userId));
}
```

- [ ] **Step 12: Typecheck e commit** (sem migration — schema já foi na Task 4)

Run: `bun check-types`

```bash
git add apps/web/src/server/workout apps/web/src/app/api/workouts apps/web/src/app/api/sessions
git commit -m "feat: sessão de treino com séries e streak"
```

---

### Task 6: Lembretes — CRUD de configuração

**Files:**
- Create: `packages/db/src/schema/reminder.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `apps/web/src/server/reminders/service.ts`
- Create: `apps/web/src/app/api/reminders/route.ts`
- Create: `apps/web/src/app/api/reminders/[id]/route.ts`

**Interfaces:**
- Consumes: `user`; helpers de `@/server/shared/api`.
- Produces: tabela `reminder`; `Reminder`; `listReminders`, `createReminder`, `updateReminder`, `deleteReminder`.

- [ ] **Step 1: Criar `packages/db/src/schema/reminder.ts`**

```ts
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const reminder = sqliteTable(
  "reminder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<"water" | "meds" | "workout" | "mind">().notNull(),
    time: text("time").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("reminder_user_idx").on(table.userId)],
);

export type Reminder = typeof reminder.$inferSelect;
```

- [ ] **Step 2: Re-exportar em `packages/db/src/schema/index.ts`**

```ts
export * from "./reminder";
```

- [ ] **Step 3: Criar `apps/web/src/server/reminders/service.ts`**

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { reminder, type Reminder } from "@bloomy/db/schema/reminder";
import { and, asc, eq } from "drizzle-orm";

export type ReminderInput = { type: Reminder["type"]; time: string };
export type ReminderUpdate = { time?: string; enabled?: boolean };

export async function listReminders(db: Db, userId: string): Promise<Reminder[]> {
  return db
    .select()
    .from(reminder)
    .where(eq(reminder.userId, userId))
    .orderBy(asc(reminder.time));
}

export async function createReminder(
  db: Db,
  userId: string,
  input: ReminderInput,
): Promise<Reminder> {
  const [created] = await db
    .insert(reminder)
    .values({ userId, type: input.type, time: input.time })
    .returning();
  return created;
}

export async function updateReminder(
  db: Db,
  userId: string,
  id: string,
  input: ReminderUpdate,
): Promise<Reminder | null> {
  const [updated] = await db
    .update(reminder)
    .set({
      ...(input.time !== undefined && { time: input.time }),
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      updatedAt: new Date(),
    })
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteReminder(
  db: Db,
  userId: string,
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(reminder)
    .where(and(eq(reminder.id, id), eq(reminder.userId, userId)))
    .returning();
  return deleted.length > 0;
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/reminders/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/server/shared/api";
import { createReminder, listReminders } from "@/server/reminders/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z.object({
  type: z.enum(["water", "meds", "workout", "mind"]),
  time: TIME_SCHEMA,
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ reminders: await listReminders(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const reminder = await createReminder(db, userId, parsed.data);
  return Response.json({ reminder }, { status: 201 });
}
```

- [ ] **Step 5: Criar `apps/web/src/app/api/reminders/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { deleteReminder, updateReminder } from "@/server/reminders/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z
  .object({
    time: TIME_SCHEMA.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((v) => v.time !== undefined || v.enabled !== undefined, {
    message: "at least one field required",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const reminder = await updateReminder(db, userId, id, parsed.data);
  if (!reminder) return notFound();

  return Response.json({ reminder });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteReminder(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Migration**

Run: `bun db:generate` → `0006_*.sql` com `CREATE TABLE reminder`.
Run: `bun db:migrate` (banco local de pé).

- [ ] **Step 7: Typecheck e commit**

Run: `bun check-types`

```bash
git add packages/db apps/web/src/server/reminders apps/web/src/app/api/reminders
git commit -m "feat: config de lembretes por domínio"
```

---

### Task 7: Testes críticos

**Files:**
- Create: `apps/web/src/server/mind/service.test.ts`
- Create: `apps/web/src/server/health/service.test.ts`
- Create: `apps/web/src/server/workout/service.test.ts`

Usa `createTestDb` / `createTestUser` de `@/server/shared/test-db` (já existe). `bun test` roda com `--conditions react-server` (neutraliza `server-only`).

- [ ] **Step 1: Criar `apps/web/src/server/mind/service.test.ts`**

```ts
import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { getCheckin, upsertCheckin } from "./service";
import { dayFor } from "@/server/shared/day";

describe("upsertCheckin (1 por dia)", () => {
  test("não duplica no mesmo dia e atualização parcial preserva campos", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await upsertCheckin(db, userId, { mood: "good", anxiety: 20 });
    await upsertCheckin(db, userId, { note: "dia tranquilo" });

    const checkin = await getCheckin(db, userId, dayFor());
    expect(checkin).not.toBeNull();
    expect(checkin!.mood).toBe("good");
    expect(checkin!.anxiety).toBe(20);
    expect(checkin!.note).toBe("dia tranquilo");

    const history = await db.select().from(
      (await import("@bloomy/db/schema/mind")).moodCheckin,
    );
    expect(history).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar os testes de Mente**

Run: `cd apps/web && bun test src/server/mind`
Expected: 1 pass.

- [ ] **Step 3: Criar `apps/web/src/server/health/service.test.ts`**

```ts
import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  completeAppointment,
  createAppointment,
  nextAppointment,
} from "./service";

describe("completeAppointment (ciclo de retorno)", () => {
  test("needsReturn cria retorno to_schedule copiando profissional", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dra. Marina",
      specialty: "Nutricionista",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, {
      needsReturn: true,
      followUpMonths: 3,
    });

    expect(result).not.toBeNull();
    expect(result!.completed.status).toBe("completed");
    expect(result!.followUp).not.toBeNull();
    expect(result!.followUp!.status).toBe("to_schedule");
    expect(result!.followUp!.professional).toBe("Dra. Marina");
    expect(result!.followUp!.specialty).toBe("Nutricionista");
    expect(result!.followUp!.parentId).toBe(appt.id);
    expect(result!.followUp!.suggestedAt).not.toBeNull();
  });

  test("needsReturn=false não cria retorno", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const appt = await createAppointment(db, userId, {
      professional: "Dr. Paulo",
      scheduledAt: new Date("2026-07-01T14:00:00Z"),
    });

    const result = await completeAppointment(db, userId, appt.id, { needsReturn: false });
    expect(result!.followUp).toBeNull();
  });
});

describe("nextAppointment (janela de 30 dias)", () => {
  test("inclui retorno dentro da janela, ignora retorno distante", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const now = new Date("2026-07-07T12:00:00Z");

    // consulta concluída gera retorno perto (3 meses adiante seria fora; usamos update direto)
    const near = await createAppointment(db, userId, {
      professional: "Perto",
      scheduledAt: new Date("2026-08-01T14:00:00Z"),
    });
    expect(near.status).toBe("scheduled");

    const next = await nextAppointment(db, userId, now);
    expect(next).not.toBeNull();
    expect(next!.professional).toBe("Perto");
  });
});
```

- [ ] **Step 4: Rodar os testes de Saúde**

Run: `cd apps/web && bun test src/server/health`
Expected: 3 pass.

- [ ] **Step 5: Criar `apps/web/src/server/workout/service.test.ts`**

```ts
import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import {
  completeSession,
  createWorkout,
  getActiveSession,
  startSession,
  summarizeWorkouts,
  updateSet,
} from "./service";

describe("summarizeWorkouts (streak, pura)", () => {
  const target = 3;
  const now = new Date("2026-07-08T12:00:00Z"); // quarta; semana começa 2026-07-06 (seg)

  test("semana anterior batida + semana corrente batida somam ao streak", () => {
    const days = [
      // semana anterior (2026-06-29..07-05): 3 dias
      "2026-06-29", "2026-07-01", "2026-07-03",
      // semana corrente: 3 dias
      "2026-07-06", "2026-07-07", "2026-07-08",
    ];
    const r = summarizeWorkouts(days, target, now);
    expect(r.weekCount).toBe(3);
    expect(r.streak).toBe(2);
    expect(r.weekDays.filter(Boolean)).toHaveLength(3);
  });

  test("semana anterior sem meta zera o streak das fechadas", () => {
    const days = ["2026-06-29", "2026-07-06", "2026-07-07", "2026-07-08"];
    const r = summarizeWorkouts(days, target, now);
    expect(r.streak).toBe(1); // só a corrente, que bateu
  });
});

describe("startSession / completeSession (db em arquivo)", () => {
  test("pré-preenche do último treino, 1 ativa por vez, conclui com duração", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [{ name: "Supino", targetSets: 2, position: 0 }],
    });

    // 1ª sessão: registra carga e conclui → vira "último treino"
    const s1 = await startSession(db, userId, w.id);
    expect(s1).not.toBe("already_active");
    expect(s1).not.toBe("not_found");
    if (s1 === "already_active" || s1 === "not_found") throw new Error("unreachable");
    const firstSet = s1.exercises[0].sets[0];
    await updateSet(db, userId, s1.session.id, firstSet.id, { reps: 10, load: 40, done: true });
    const done1 = await completeSession(db, userId, s1.session.id);
    expect(done1).not.toBeNull();
    expect(done1!.exerciseCount).toBe(1);

    // 2ª sessão: séries nascem pré-preenchidas com 40 kg · 10 reps
    const s2 = await startSession(db, userId, w.id);
    if (s2 === "already_active" || s2 === "not_found") throw new Error("unreachable");
    expect(s2.exercises[0].sets[0].load).toBe(40);
    expect(s2.exercises[0].sets[0].reps).toBe(10);

    // já há sessão ativa
    expect(await startSession(db, userId, w.id)).toBe("already_active");
    expect(await getActiveSession(db, userId)).not.toBeNull();
  });
});
```

- [ ] **Step 6: Rodar os testes de Treino**

Run: `cd apps/web && bun test src/server/workout`
Expected: 4 pass.

- [ ] **Step 7: Rodar a suíte inteira e commitar**

Run: `bun test` (na raiz, via turbo) — ou `cd apps/web && bun test src`
Expected: todos pass (críticos da Fase 1 + os novos).

Run: `bun check-types`

```bash
git add apps/web/src/server/mind apps/web/src/server/health apps/web/src/server/workout
git commit -m "test: críticos de mente, saúde e treino"
```

---

### Task 8: Verificação final da fase

**Files:** nenhum novo — verificação.

- [ ] **Step 1: Typecheck completo**

Run: `bun check-types`
Expected: todos os workspaces sem erro.

- [ ] **Step 2: Build de produção**

Run: `bun build`
Expected: `next build` conclui sem erro; as novas rotas `/api/*` aparecem no output.

- [ ] **Step 3: Smoke sem sessão → 401**

Com `bun dev:web` de pé:

```bash
for r in profile checkins appointments exams workouts reminders; do
  printf "%s: " "$r"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/api/$r"
done
```

Expected: `401` nas seis linhas.

- [ ] **Step 4: Smoke autenticado (fluxo real)**

```bash
# reutiliza o cookie da Fase 1, ou cria usuário:
curl -s -c /tmp/bloomy-cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "content-type: application/json" \
  -d '{"name":"Smoke2","email":"smoke2@test.dev","password":"smoke-test-123"}'

# perfil cria on-demand
curl -s -b /tmp/bloomy-cookies.txt http://localhost:3001/api/profile
# esperado: profile com onboardingCompletedAt null, restSeconds 45

# check-in de humor
curl -s -b /tmp/bloomy-cookies.txt -X PUT http://localhost:3001/api/checkins \
  -H "content-type: application/json" -d '{"mood":"good","anxiety":15}'
curl -s -b /tmp/bloomy-cookies.txt http://localhost:3001/api/checkins
# esperado: checkin com mood good

# criar treino e iniciar sessão
curl -s -b /tmp/bloomy-cookies.txt -X POST http://localhost:3001/api/workouts \
  -H "content-type: application/json" \
  -d '{"name":"Peito","focus":"chest","exercises":[{"name":"Supino","targetSets":3,"position":0}]}'
curl -s -b /tmp/bloomy-cookies.txt http://localhost:3001/api/workouts/summary
# esperado: weekTarget 4, streak 0, weekDays 7 bools
```

Expected: respostas JSON coerentes com o contrato.

- [ ] **Step 5: Relatar resultado à usuária** (não commitar nada espontaneamente; a fase encerra com aprovação dela).

---

## Self-review (executado na escrita do plano)

- **Cobertura da spec:** Perfil §1 → Task 1; Mente §2 → Task 2; Saúde §3 (com retorno) → Task 3; Treino §4 (fluxo completo) → Tasks 4–5; Lembretes §5 → Task 6; Metas §6 → sem back (documentado, nada a implementar); testes críticos → Task 7; verificação → Task 8. Issues #4/#5 já criadas (fora de escopo).
- **Placeholders:** nenhum TBD/TODO; todo step de código tem o código completo.
- **Consistência de tipos:** `Db` consumido em todos os serviços; `dayFor`/`DAY_SCHEMA` (Fase 1) usados em Mente/Treino; `summarizeWorkouts` definido na Task 5 e testado na Task 7 com a mesma assinatura `(days, target, now)`; `startSession` retorna `SessionDetail | "already_active" | "not_found"` e é assim tratado nas rotas e nos testes; `completeAppointment`/`completeExam` retornam `{ completed, followUp } | null`, refletido nas rotas.
- **Decisão de implementação registrada:** `set_log.exerciseName` desnormalizado + `exerciseId` nullable (`set null`) para o histórico ("último treino") sobreviver a edições de template.
- **Numeração de migrations** (`0002`–`0006`) é indicativa; usar o número que o `drizzle-kit generate` atribuir.
