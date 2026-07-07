# Fase 1 — Back-end do Corpo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Back-end completo do domínio Corpo (água, refeições, remédios) + metas: schema Drizzle com migrations, serviços em `features/`, rotas REST autenticadas, e testes dos pontos críticos ao final.

**Architecture:** Rotas REST por domínio (`/api/...`) são wrappers finos — zod + sessão better-auth + chamada de serviço (ADR-0001). Regras vivem em `apps/web/src/features/<domínio>/service.ts`, recebendo `db` por parâmetro (testável com libsql em memória). Todo registro diário grava coluna `day` calculada com fuso fixo `America/Sao_Paulo` (ADR-0002). Tomas de remédio são derivadas na leitura (cadastro × horários); só a confirmação vira linha; estoque decrementa na mesma transação.

**Tech Stack:** Next.js 16 (route handlers), Drizzle ORM + libsql/Turso (SQLite), better-auth, zod v4, bun test, Turborepo/Bun.

## Global Constraints

- Identificadores de código em EN (`water_log`, `meal`, `goal`); UI/copy/telas em PT (fase futura). Glossário canônico: `apps/web/CONTEXT.md`.
- Migrations sempre (`bun db:generate` + `bun db:migrate`); **nunca** `db:push` (decisão da usuária).
- **Testes depois, só críticos** (decisão explícita da usuária — deliberadamente NÃO-TDD): implementar primeiro; a Task 8 cobre virada de dia, pendência de refeições, tomas derivadas e estoque.
- Toda rota `/api` (exceto `/api/auth`) exige sessão better-auth → 401 JSON `{ "error": "unauthorized" }`; validação zod → 400 `{ "error": "<mensagem>" }`.
- Schema segue o padrão de `packages/db/src/schema/auth.ts` (timestamps `integer { mode: "timestamp_ms" }` com default `unixepoch`).
- Commits: Conventional Commits em PT, subject ≤50 chars.
- `check-types` (`bun check-types` na raiz) deve passar antes de cada commit.
- Não criar UI nesta fase. Não mexer em `packages/ui/src/components`.

## Contrato REST (referência para todas as tasks)

| Método | Rota | Body/Query | Retorno |
|---|---|---|---|
| GET | `/api/goals` | — | `{ goals: Goal[] }` (cria defaults na 1ª chamada) |
| PUT | `/api/goals/:id` | `{ target }` | `{ goal: Goal }` |
| GET | `/api/water?day=` | day opcional (default hoje) | `{ logs: WaterLog[], totalMl: number }` |
| POST | `/api/water` | `{ ml }` | `{ log: WaterLog }` (201) |
| DELETE | `/api/water/last?day=` | day opcional | `{ removed: WaterLog \| null }` |
| GET | `/api/meals?day=` | day opcional | `{ meals: Meal[], pendingTypes: MealType[] }` |
| POST | `/api/meals` | `{ type, description }` | `{ meal: Meal }` (201) |
| DELETE | `/api/meals/:id` | — | `{ ok: true }` |
| GET | `/api/medications` | — | `{ medications: Medication[] }` (só ativas) |
| POST | `/api/medications` | `{ name, dose?, stock?, times[] }` | `{ medication: Medication }` (201) |
| PUT | `/api/medications/:id` | `{ name?, dose?, stock?, times? }` | `{ medication: Medication }` |
| DELETE | `/api/medications/:id` | — | `{ ok: true }` (soft: `active=false`) |
| GET | `/api/intakes?day=` | day opcional | `{ intakes: IntakeSlot[] }` (derivadas) |
| POST | `/api/intakes` | `{ medicationId, time, day? }` | `{ ok: true }` (201; 409 se já marcada) |
| DELETE | `/api/intakes?medicationId=&time=&day=` | query obrigatória | `{ ok: true }` |

Defaults de metas (1º acesso): água 2000 ml/dia · refeições 3/dia · treino 4 dias/semana · mente 1 check-in/dia.

---

### Task 1: CLAUDE.mds das convenções

**Files:**
- Create: `apps/web/CLAUDE.md`
- Create: `packages/db/CLAUDE.md`
- Create: `packages/ui/CLAUDE.md`
- Modify: `CLAUDE.md` (raiz — acrescentar seção "Convenções de código")

**Interfaces:**
- Consumes: decisões do grilling (ADR-0001, ADR-0002, `apps/web/CONTEXT.md`)
- Produces: convenções que TODAS as tasks seguintes seguem

- [ ] **Step 1: Criar `apps/web/CLAUDE.md`**

```markdown
# apps/web

Glossário canônico em `CONTEXT.md` (nesta pasta). Decisões em `/docs/adr/`.

## Organização

- **Telas** (PT): `src/app/<tela>/page.tsx` é a própria tela e SÓ renderiza.
  Toda lógica/consts/handlers em `src/app/<tela>/hooks/use<Tela>.ts`
  (ex.: `app/hoje/page.tsx` + `app/hoje/hooks/useHoje.ts`). Fetch inicial
  e mutações acontecem no hook, via API REST (telas nascem com skeleton).
- **Serviços** (EN): `src/features/<domínio>/service.ts` — donos das regras.
  Recebem `db: Db` por parâmetro (testabilidade). Nunca importam de `app/`.
- **Rotas** (EN): `src/app/api/<recurso>/route.ts` — wrappers finos:
  zod → sessão (`requireUserId` de `features/shared/api.ts`) → serviço.
  Nenhuma regra de negócio em rota.

## Regras

- Registro diário grava `day` (`YYYY-MM-DD`) via `dayFor()` de
  `features/shared/day.ts` — nunca recalcular fuso em outro lugar (ADR-0002).
- Erros de API: `{ "error": string }` + status (400/401/404/409).
- Tomas de remédio derivam do cadastro na leitura; só confirmação vira linha;
  estoque muda na mesma transação do mark/unmark.
- Testes: `bun test` (rodar de apps/web). Cobertura mínima = pontos críticos.
```

- [ ] **Step 2: Criar `packages/db/CLAUDE.md`**

```markdown
# @bloomy/db

- Um arquivo de schema por domínio em `src/schema/` (EN), re-exportado em
  `src/schema/index.ts`. Seguir o padrão de `auth.ts`: ids `text`, timestamps
  `integer { mode: "timestamp_ms" }` com default `unixepoch('subsecond')`.
- Tabelas de registro diário têm coluna `day` (`text`, `YYYY-MM-DD`) com
  índice composto `(user_id, day)` (ADR-0002).
- **Migrations sempre**: `bun db:generate` + `bun db:migrate` (da raiz).
  NUNCA `drizzle-kit push`. Migrations ficam em `src/migrations/`.
- Dev local: `bun db:local` (turso dev em `local.db`), `.env` fica em
  `apps/web/.env`.
- Serviços recebem `Db` (`import type { Db } from "@bloomy/db"`); o singleton
  `db` só é importado por rotas/entrypoints.
```

- [ ] **Step 3: Criar `packages/ui/CLAUDE.md`**

```markdown
# @bloomy/ui

- **Todo componente shadcn é instalado AQUI**, nunca em apps/web:
  rodar `bunx shadcn@latest add <item>` DENTRO de `packages/ui/`
  (o `components.json` daqui aponta os aliases `@bloomy/ui/*`).
- Consumo no app: `import { Button } from "@bloomy/ui/components/button"`.
- Aqui moram só componentes visuais reusáveis; composição de tela fica na
  pasta da tela em `apps/web/src/app/<tela>/`.
- Pendências da fase de UI (decidir antes de estilizar): Phosphor Icons vs
  lucide (DESIGN.md exige Phosphor), remoção do dark mode (produto é light),
  re-tokenização do `globals.css` com a paleta Bloomy, fontes Quicksand/Nunito.
- DESIGN.md na raiz é a autoridade visual; protótipos em `docs/`.
```

- [ ] **Step 4: Acrescentar ao `CLAUDE.md` da raiz (após a seção "Docs de produto")**

```markdown
## Convenções de código

Glossário: `apps/web/CONTEXT.md` · ADRs: `docs/adr/` · Convenções por pacote:
`apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`, `packages/ui/CLAUDE.md`.
Resumo: REST fino + serviços em `features/` (ADR-0001); coluna `day` fuso BR
(ADR-0002); telas PT sem lógica no `.tsx` (hooks); código EN; migrations sempre.
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/CLAUDE.md packages/db/CLAUDE.md packages/ui/CLAUDE.md CLAUDE.md
git commit -m "docs: convenções de código por pacote"
```

---

### Task 2: Schema do Corpo + Metas e migration inicial

**Files:**
- Modify: `packages/db/src/index.ts` (aceitar config; exportar `Db`)
- Create: `packages/db/src/schema/body.ts`
- Create: `packages/db/src/schema/goals.ts`
- Modify: `packages/db/src/schema/index.ts`
- Modify: `apps/web/package.json` (adicionar `@bloomy/db`)

**Interfaces:**
- Consumes: `user` de `packages/db/src/schema/auth.ts`
- Produces: tabelas `water_log`, `meal`, `medication`, `medication_intake`, `goal`; `createDb(config?: { url: string; authToken?: string })`; `type Db`; tipos inferidos `WaterLog`, `Meal`, `Medication`, `MedicationIntake`, `Goal`

- [ ] **Step 1: Alterar `packages/db/src/index.ts`**

```ts
import { env } from "@bloomy/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createDb(config?: { url: string; authToken?: string }) {
  const client = createClient(
    config ?? {
      url: env.DATABASE_URL,
      authToken: env.DATABASE_AUTH_TOKEN,
    },
  );

  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;

export const db = createDb();
```

- [ ] **Step 2: Criar `packages/db/src/schema/body.ts`**

```ts
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const waterLog = sqliteTable(
  "water_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ml: integer("ml").notNull(),
    day: text("day").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("water_log_user_day_idx").on(table.userId, table.day)],
);

export const meal = sqliteTable(
  "meal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<"breakfast" | "lunch" | "dinner" | "snack">().notNull(),
    description: text("description").notNull(),
    day: text("day").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("meal_user_day_idx").on(table.userId, table.day)],
);

export const medication = sqliteTable(
  "medication",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dose: text("dose"),
    stock: integer("stock"),
    times: text("times", { mode: "json" }).$type<string[]>().notNull(),
    active: integer("active", { mode: "boolean" }).default(true).notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("medication_user_idx").on(table.userId)],
);

export const medicationIntake = sqliteTable(
  "medication_intake",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    medicationId: text("medication_id")
      .notNull()
      .references(() => medication.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    time: text("time").notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    index("medication_intake_user_day_idx").on(table.userId, table.day),
    uniqueIndex("medication_intake_unique_idx").on(table.medicationId, table.day, table.time),
  ],
);

export type WaterLog = typeof waterLog.$inferSelect;
export type Meal = typeof meal.$inferSelect;
export type Medication = typeof medication.$inferSelect;
export type MedicationIntake = typeof medicationIntake.$inferSelect;
```

- [ ] **Step 3: Criar `packages/db/src/schema/goals.ts`**

```ts
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
```

- [ ] **Step 4: Re-exportar em `packages/db/src/schema/index.ts`**

```ts
export * from "./auth";
export * from "./body";
export * from "./goals";
```

- [ ] **Step 5: Adicionar `@bloomy/db` ao `apps/web/package.json`**

Em `dependencies`, acrescentar (ordem alfabética, junto dos outros `@bloomy/*`):

```json
"@bloomy/db": "workspace:*",
```

Rodar: `bun install`
Expected: lockfile atualizado sem erros.

- [ ] **Step 6: Gerar a migration**

Run: `bun db:generate`
Expected: novo arquivo em `packages/db/src/migrations/0000_*.sql` (ou próximo número) contendo `CREATE TABLE water_log/meal/medication/medication_intake/goal`.

- [ ] **Step 7: Aplicar a migration no banco local**

Pré-requisito: banco local de pé — em outro terminal, `bun db:local` (se `DATABASE_URL` do `apps/web/.env` já apontar para um Turso remoto de dev, pular o `db:local`).

Run: `bun db:migrate`
Expected: saída do drizzle-kit aplicando a migration sem erro.

- [ ] **Step 8: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add packages/db apps/web/package.json bun.lock
git commit -m "feat: schema do corpo e metas com migration"
```

---

### Task 3: Fundamentos compartilhados (day + helpers de API)

**Files:**
- Create: `apps/web/src/features/shared/day.ts`
- Create: `apps/web/src/features/shared/api.ts`

**Interfaces:**
- Consumes: `auth` de `@bloomy/auth`
- Produces: `dayFor(date?: Date): string` · `DAY_SCHEMA` (zod) · `requireUserId(request: Request): Promise<string | null>` · `unauthorized()` / `badRequest(message)` / `notFound()` / `conflict(message)` → `Response`

- [ ] **Step 1: Criar `apps/web/src/features/shared/day.ts`**

```ts
import { z } from "zod";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia local (America/Sao_Paulo) de um instante — ADR-0002. */
export function dayFor(date: Date = new Date()): string {
  return DAY_FORMATTER.format(date);
}

export const DAY_SCHEMA = z.iso.date();
```

- [ ] **Step 2: Criar `apps/web/src/features/shared/api.ts`**

```ts
import { auth } from "@bloomy/auth";

export async function requireUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

export function notFound(): Response {
  return Response.json({ error: "not found" }, { status: 404 });
}

export function conflict(message: string): Response {
  return Response.json({ error: message }, { status: 409 });
}
```

- [ ] **Step 3: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features/shared
git commit -m "feat: dayFor e helpers de rota autenticada"
```

---

### Task 4: Metas — serviço e rotas

**Files:**
- Create: `apps/web/src/features/goals/service.ts`
- Create: `apps/web/src/app/api/goals/route.ts`
- Create: `apps/web/src/app/api/goals/[id]/route.ts`

**Interfaces:**
- Consumes: `Db`, `db`, `goal`, `Goal` de `@bloomy/db` / `@bloomy/db/schema/goals`; helpers da Task 3
- Produces: `ensureGoals(db: Db, userId: string): Promise<Goal[]>` · `updateGoal(db: Db, userId: string, goalId: string, target: number): Promise<Goal | null>` · `DEFAULT_GOALS`

- [ ] **Step 1: Criar `apps/web/src/features/goals/service.ts`**

```ts
import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { and, eq } from "drizzle-orm";

export const DEFAULT_GOALS = [
  { domain: "water", target: 2000, unit: "ml", period: "day" },
  { domain: "meals", target: 3, unit: "count", period: "day" },
  { domain: "workout", target: 4, unit: "days", period: "week" },
  { domain: "mind", target: 1, unit: "count", period: "day" },
] as const;

/** Garante as metas default do usuário e retorna todas as ativas. */
export async function ensureGoals(db: Db, userId: string): Promise<Goal[]> {
  const existing = await db.select().from(goal).where(eq(goal.userId, userId));
  const missing = DEFAULT_GOALS.filter(
    (d) => !existing.some((g) => g.domain === d.domain),
  );

  if (missing.length > 0) {
    await db.insert(goal).values(missing.map((d) => ({ ...d, userId })));
    return db.select().from(goal).where(eq(goal.userId, userId));
  }

  return existing;
}

export async function updateGoal(
  db: Db,
  userId: string,
  goalId: string,
  target: number,
): Promise<Goal | null> {
  const [updated] = await db
    .update(goal)
    .set({ target, updatedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)))
    .returning();

  return updated ?? null;
}
```

- [ ] **Step 2: Criar `apps/web/src/app/api/goals/route.ts`**

```ts
import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/features/shared/api";
import { ensureGoals } from "@/features/goals/service";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const goals = await ensureGoals(db, userId);
  return Response.json({ goals });
}
```

- [ ] **Step 3: Criar `apps/web/src/app/api/goals/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { updateGoal } from "@/features/goals/service";

const BODY_SCHEMA = z.object({ target: z.number().int().positive() });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const { id } = await params;
  const updated = await updateGoal(db, userId, id, parsed.data.target);
  if (!updated) return notFound();

  return Response.json({ goal: updated });
}
```

- [ ] **Step 4: Verificar rota exige sessão**

Run: `bun dev:web` (deixar de pé) e em outro terminal:
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/goals`
Expected: `401`

- [ ] **Step 5: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features/goals apps/web/src/app/api/goals
git commit -m "feat: metas com defaults e rota de edição"
```

---

### Task 5: Água — serviço e rotas

**Files:**
- Create: `apps/web/src/features/water/service.ts`
- Create: `apps/web/src/app/api/water/route.ts`
- Create: `apps/web/src/app/api/water/last/route.ts`

**Interfaces:**
- Consumes: `waterLog`, `WaterLog` de `@bloomy/db/schema/body`; `dayFor`, `DAY_SCHEMA`, helpers da Task 3
- Produces: `addWater(db: Db, userId: string, ml: number): Promise<WaterLog>` · `removeLastWater(db: Db, userId: string, day: string): Promise<WaterLog | null>` · `getWaterDay(db: Db, userId: string, day: string): Promise<{ logs: WaterLog[]; totalMl: number }>`

- [ ] **Step 1: Criar `apps/web/src/features/water/service.ts`**

```ts
import type { Db } from "@bloomy/db";
import { waterLog, type WaterLog } from "@bloomy/db/schema/body";
import { and, desc, eq } from "drizzle-orm";

import { dayFor } from "@/features/shared/day";

export async function addWater(db: Db, userId: string, ml: number): Promise<WaterLog> {
  const [log] = await db
    .insert(waterLog)
    .values({ userId, ml, day: dayFor() })
    .returning();

  return log;
}

export async function removeLastWater(
  db: Db,
  userId: string,
  day: string,
): Promise<WaterLog | null> {
  const [last] = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.day, day)))
    .orderBy(desc(waterLog.createdAt))
    .limit(1);

  if (!last) return null;

  await db.delete(waterLog).where(eq(waterLog.id, last.id));
  return last;
}

export async function getWaterDay(
  db: Db,
  userId: string,
  day: string,
): Promise<{ logs: WaterLog[]; totalMl: number }> {
  const logs = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.day, day)))
    .orderBy(desc(waterLog.createdAt));

  return { logs, totalMl: logs.reduce((sum, l) => sum + l.ml, 0) };
}
```

- [ ] **Step 2: Criar `apps/web/src/app/api/water/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { DAY_SCHEMA, dayFor } from "@/features/shared/day";
import { addWater, getWaterDay } from "@/features/water/service";

const BODY_SCHEMA = z.object({ ml: z.number().int().positive().max(5000) });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  return Response.json(await getWaterDay(db, userId, day.data));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const log = await addWater(db, userId, parsed.data.ml);
  return Response.json({ log }, { status: 201 });
}
```

- [ ] **Step 3: Criar `apps/web/src/app/api/water/last/route.ts`**

```ts
import { db } from "@bloomy/db";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { DAY_SCHEMA, dayFor } from "@/features/shared/day";
import { removeLastWater } from "@/features/water/service";

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  const removed = await removeLastWater(db, userId, day.data);
  return Response.json({ removed });
}
```

- [ ] **Step 4: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features/water apps/web/src/app/api/water
git commit -m "feat: registro de água em ml com undo"
```

---

### Task 6: Refeições — serviço e rotas

**Files:**
- Create: `apps/web/src/features/meals/service.ts`
- Create: `apps/web/src/app/api/meals/route.ts`
- Create: `apps/web/src/app/api/meals/[id]/route.ts`

**Interfaces:**
- Consumes: `meal`, `Meal` de `@bloomy/db/schema/body`; helpers das Tasks 3
- Produces: `MealType` · `MAIN_MEAL_TYPES` · `pendingMealTypes(meals: Pick<Meal, "type">[]): MealType[]` (pura — testada na Task 8) · `addMeal(db, userId, input: { type: MealType; description: string }): Promise<Meal>` · `deleteMeal(db, userId, mealId): Promise<boolean>` · `getMealsDay(db, userId, day): Promise<{ meals: Meal[]; pendingTypes: MealType[] }>`

- [ ] **Step 1: Criar `apps/web/src/features/meals/service.ts`**

```ts
import type { Db } from "@bloomy/db";
import { meal, type Meal } from "@bloomy/db/schema/body";
import { and, asc, eq } from "drizzle-orm";

import { dayFor } from "@/features/shared/day";

export type MealType = Meal["type"];

/** Café, almoço e jantar geram pendência; lanche nunca (CONTEXT.md). */
export const MAIN_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const satisfies readonly MealType[];

export function pendingMealTypes(meals: Pick<Meal, "type">[]): MealType[] {
  const registered = new Set(meals.map((m) => m.type));
  return MAIN_MEAL_TYPES.filter((t) => !registered.has(t));
}

export async function addMeal(
  db: Db,
  userId: string,
  input: { type: MealType; description: string },
): Promise<Meal> {
  const [created] = await db
    .insert(meal)
    .values({ userId, type: input.type, description: input.description, day: dayFor() })
    .returning();

  return created;
}

export async function deleteMeal(db: Db, userId: string, mealId: string): Promise<boolean> {
  const deleted = await db
    .delete(meal)
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();

  return deleted.length > 0;
}

export async function getMealsDay(
  db: Db,
  userId: string,
  day: string,
): Promise<{ meals: Meal[]; pendingTypes: MealType[] }> {
  const meals = await db
    .select()
    .from(meal)
    .where(and(eq(meal.userId, userId), eq(meal.day, day)))
    .orderBy(asc(meal.createdAt));

  return { meals, pendingTypes: pendingMealTypes(meals) };
}
```

- [ ] **Step 2: Criar `apps/web/src/app/api/meals/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { DAY_SCHEMA, dayFor } from "@/features/shared/day";
import { addMeal, getMealsDay } from "@/features/meals/service";

const BODY_SCHEMA = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1).max(500),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  return Response.json(await getMealsDay(db, userId, day.data));
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const created = await addMeal(db, userId, parsed.data);
  return Response.json({ meal: created }, { status: 201 });
}
```

- [ ] **Step 3: Criar `apps/web/src/app/api/meals/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { deleteMeal } from "@/features/meals/service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteMeal(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features/meals apps/web/src/app/api/meals
git commit -m "feat: refeições com pendência por tipo"
```

---

### Task 7: Remédios e tomas — serviço e rotas

**Files:**
- Create: `apps/web/src/features/medications/service.ts`
- Create: `apps/web/src/app/api/medications/route.ts`
- Create: `apps/web/src/app/api/medications/[id]/route.ts`
- Create: `apps/web/src/app/api/intakes/route.ts`

**Interfaces:**
- Consumes: `medication`, `medicationIntake`, `Medication` de `@bloomy/db/schema/body`; helpers da Task 3
- Produces: `IntakeSlot = { medicationId: string; name: string; dose: string | null; time: string; taken: boolean }` · `deriveIntakes(meds: Pick<Medication, "id" | "name" | "dose" | "times">[], taken: { medicationId: string; time: string }[]): IntakeSlot[]` (pura — testada na Task 8) · `createMedication` / `updateMedication` / `deactivateMedication` / `listMedications` · `getIntakesDay(db, userId, day)` · `markIntake(db, userId, input): Promise<"ok" | "duplicate" | "not_found">` · `unmarkIntake(db, userId, input): Promise<boolean>`

- [ ] **Step 1: Criar `apps/web/src/features/medications/service.ts`**

```ts
import type { Db } from "@bloomy/db";
import { medication, medicationIntake, type Medication } from "@bloomy/db/schema/body";
import { and, asc, eq, sql } from "drizzle-orm";

export type IntakeSlot = {
  medicationId: string;
  name: string;
  dose: string | null;
  time: string;
  taken: boolean;
};

/** Tomas do dia derivam do cadastro; só a confirmação é fato (CONTEXT.md). */
export function deriveIntakes(
  meds: Pick<Medication, "id" | "name" | "dose" | "times">[],
  taken: { medicationId: string; time: string }[],
): IntakeSlot[] {
  const takenSet = new Set(taken.map((t) => `${t.medicationId}|${t.time}`));

  return meds
    .flatMap((med) =>
      med.times.map((time) => ({
        medicationId: med.id,
        name: med.name,
        dose: med.dose,
        time,
        taken: takenSet.has(`${med.id}|${time}`),
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
}

export type MedicationInput = {
  name: string;
  dose?: string;
  stock?: number;
  times: string[];
};

export async function createMedication(
  db: Db,
  userId: string,
  input: MedicationInput,
): Promise<Medication> {
  const [created] = await db
    .insert(medication)
    .values({
      userId,
      name: input.name,
      dose: input.dose ?? null,
      stock: input.stock ?? null,
      times: [...input.times].sort(),
    })
    .returning();

  return created;
}

export async function updateMedication(
  db: Db,
  userId: string,
  medicationId: string,
  input: Partial<MedicationInput>,
): Promise<Medication | null> {
  const [updated] = await db
    .update(medication)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.dose !== undefined && { dose: input.dose }),
      ...(input.stock !== undefined && { stock: input.stock }),
      ...(input.times !== undefined && { times: [...input.times].sort() }),
      updatedAt: new Date(),
    })
    .where(and(eq(medication.id, medicationId), eq(medication.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deactivateMedication(
  db: Db,
  userId: string,
  medicationId: string,
): Promise<boolean> {
  const updated = await db
    .update(medication)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(medication.id, medicationId), eq(medication.userId, userId)))
    .returning();

  return updated.length > 0;
}

export async function listMedications(db: Db, userId: string): Promise<Medication[]> {
  return db
    .select()
    .from(medication)
    .where(and(eq(medication.userId, userId), eq(medication.active, true)))
    .orderBy(asc(medication.name));
}

export async function getIntakesDay(
  db: Db,
  userId: string,
  day: string,
): Promise<IntakeSlot[]> {
  const meds = await listMedications(db, userId);
  const taken = await db
    .select({ medicationId: medicationIntake.medicationId, time: medicationIntake.time })
    .from(medicationIntake)
    .where(and(eq(medicationIntake.userId, userId), eq(medicationIntake.day, day)));

  return deriveIntakes(meds, taken);
}

export async function markIntake(
  db: Db,
  userId: string,
  input: { medicationId: string; time: string; day: string },
): Promise<"ok" | "duplicate" | "not_found"> {
  return db.transaction(async (tx) => {
    const [med] = await tx
      .select()
      .from(medication)
      .where(and(eq(medication.id, input.medicationId), eq(medication.userId, userId)));

    if (!med || !med.active) return "not_found";

    const existing = await tx
      .select({ id: medicationIntake.id })
      .from(medicationIntake)
      .where(
        and(
          eq(medicationIntake.medicationId, input.medicationId),
          eq(medicationIntake.day, input.day),
          eq(medicationIntake.time, input.time),
        ),
      );

    if (existing.length > 0) return "duplicate";

    await tx.insert(medicationIntake).values({ userId, ...input });

    if (med.stock !== null) {
      await tx
        .update(medication)
        .set({ stock: sql`max(${medication.stock} - 1, 0)` })
        .where(eq(medication.id, med.id));
    }

    return "ok";
  });
}

export async function unmarkIntake(
  db: Db,
  userId: string,
  input: { medicationId: string; time: string; day: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(medicationIntake)
      .where(
        and(
          eq(medicationIntake.userId, userId),
          eq(medicationIntake.medicationId, input.medicationId),
          eq(medicationIntake.day, input.day),
          eq(medicationIntake.time, input.time),
        ),
      )
      .returning();

    if (deleted.length === 0) return false;

    await tx
      .update(medication)
      .set({ stock: sql`${medication.stock} + 1` })
      .where(
        and(
          eq(medication.id, input.medicationId),
          sql`${medication.stock} is not null`,
        ),
      );

    return true;
  });
}
```

- [ ] **Step 2: Criar `apps/web/src/app/api/medications/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, requireUserId, unauthorized } from "@/features/shared/api";
import { createMedication, listMedications } from "@/features/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  dose: z.string().max(120).optional(),
  stock: z.number().int().nonnegative().optional(),
  times: z.array(TIME_SCHEMA).min(1).max(6),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ medications: await listMedications(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const created = await createMedication(db, userId, parsed.data);
  return Response.json({ medication: created }, { status: 201 });
}
```

- [ ] **Step 3: Criar `apps/web/src/app/api/medications/[id]/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { badRequest, notFound, requireUserId, unauthorized } from "@/features/shared/api";
import { deactivateMedication, updateMedication } from "@/features/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120).optional(),
  dose: z.string().max(120).optional(),
  stock: z.number().int().nonnegative().optional(),
  times: z.array(TIME_SCHEMA).min(1).max(6).optional(),
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
  const updated = await updateMedication(db, userId, id, parsed.data);
  if (!updated) return notFound();

  return Response.json({ medication: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deactivated = await deactivateMedication(db, userId, id);
  if (!deactivated) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Criar `apps/web/src/app/api/intakes/route.ts`**

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import {
  badRequest,
  conflict,
  notFound,
  requireUserId,
  unauthorized,
} from "@/features/shared/api";
import { DAY_SCHEMA, dayFor } from "@/features/shared/day";
import { getIntakesDay, markIntake, unmarkIntake } from "@/features/medications/service";

const TIME_SCHEMA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");

const MARK_SCHEMA = z.object({
  medicationId: z.string().min(1),
  time: TIME_SCHEMA,
  day: DAY_SCHEMA.optional(),
});

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const raw = new URL(request.url).searchParams.get("day");
  const day = raw ? DAY_SCHEMA.safeParse(raw) : { success: true as const, data: dayFor() };
  if (!day.success) return badRequest("invalid day");

  return Response.json({ intakes: await getIntakesDay(db, userId, day.data) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = MARK_SCHEMA.safeParse(await request.json());
  if (!parsed.success) return badRequest(parsed.error.message);

  const result = await markIntake(db, userId, {
    medicationId: parsed.data.medicationId,
    time: parsed.data.time,
    day: parsed.data.day ?? dayFor(),
  });

  if (result === "not_found") return notFound();
  if (result === "duplicate") return conflict("intake already marked");

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const searchParams = new URL(request.url).searchParams;
  const parsed = MARK_SCHEMA.safeParse({
    medicationId: searchParams.get("medicationId"),
    time: searchParams.get("time"),
    day: searchParams.get("day") ?? undefined,
  });
  if (!parsed.success) return badRequest(parsed.error.message);

  const removed = await unmarkIntake(db, userId, {
    medicationId: parsed.data.medicationId,
    time: parsed.data.time,
    day: parsed.data.day ?? dayFor(),
  });
  if (!removed) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 5: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features/medications apps/web/src/app/api/medications apps/web/src/app/api/intakes
git commit -m "feat: remédios com tomas derivadas e estoque"
```

---

### Task 8: Testes críticos

**Files:**
- Create: `apps/web/src/features/shared/test-db.ts`
- Create: `apps/web/src/features/shared/day.test.ts`
- Create: `apps/web/src/features/meals/service.test.ts`
- Create: `apps/web/src/features/medications/service.test.ts`
- Modify: `apps/web/package.json` (script `test`)
- Modify: `turbo.json` (task `test`)
- Modify: `package.json` raiz (script `test`)

**Interfaces:**
- Consumes: `dayFor`, `pendingMealTypes`, `deriveIntakes`, `markIntake`, `unmarkIntake`, `createMedication`, `createDb`
- Produces: `createTestDb(): Promise<Db>` e `createTestUser(db: Db, id?: string): Promise<string>` em `test-db.ts`

- [ ] **Step 1: Criar `apps/web/src/features/shared/test-db.ts`**

```ts
import path from "node:path";

import { createDb, type Db } from "@bloomy/db";
import { user } from "@bloomy/db/schema/auth";
import { migrate } from "drizzle-orm/libsql/migrator";

export async function createTestDb(): Promise<Db> {
  const db = createDb({ url: ":memory:" });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "../../packages/db/src/migrations"),
  });
  return db;
}

export async function createTestUser(db: Db, id = "user-test"): Promise<string> {
  await db.insert(user).values({
    id,
    name: "Teste",
    email: `${id}@test.dev`,
  });
  return id;
}
```

- [ ] **Step 2: Criar `apps/web/src/features/shared/day.test.ts`**

```ts
import { describe, expect, test } from "bun:test";

import { dayFor } from "./day";

describe("dayFor (America/Sao_Paulo, UTC-3)", () => {
  test("02:59Z ainda é o dia anterior em SP", () => {
    expect(dayFor(new Date("2026-07-06T02:59:59Z"))).toBe("2026-07-05");
  });

  test("03:00Z já é o dia seguinte em SP", () => {
    expect(dayFor(new Date("2026-07-06T03:00:00Z"))).toBe("2026-07-06");
  });

  test("meio-dia UTC é o mesmo dia", () => {
    expect(dayFor(new Date("2026-07-06T12:00:00Z"))).toBe("2026-07-06");
  });

  test("virada de ano", () => {
    expect(dayFor(new Date("2026-01-01T01:00:00Z"))).toBe("2025-12-31");
  });
});
```

- [ ] **Step 3: Rodar os testes de day**

Run: `cd apps/web && bun test src/features/shared`
Expected: 4 pass.

- [ ] **Step 4: Criar `apps/web/src/features/meals/service.test.ts`**

```ts
import { describe, expect, test } from "bun:test";

import { pendingMealTypes } from "./service";

describe("pendingMealTypes", () => {
  test("dia vazio: café, almoço e jantar pendentes", () => {
    expect(pendingMealTypes([])).toEqual(["breakfast", "lunch", "dinner"]);
  });

  test("café e almoço feitos: falta o jantar", () => {
    expect(pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }])).toEqual(["dinner"]);
  });

  test("lanche nunca conta como pendência nem quita as principais", () => {
    expect(pendingMealTypes([{ type: "snack" }, { type: "snack" }])).toEqual([
      "breakfast",
      "lunch",
      "dinner",
    ]);
  });

  test("tudo registrado: sem pendências", () => {
    expect(
      pendingMealTypes([{ type: "breakfast" }, { type: "lunch" }, { type: "dinner" }]),
    ).toEqual([]);
  });
});
```

- [ ] **Step 5: Criar `apps/web/src/features/medications/service.test.ts`**

```ts
import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { medication } from "@bloomy/db/schema/body";

import { createTestDb, createTestUser } from "@/features/shared/test-db";
import { createMedication, deriveIntakes, getIntakesDay, markIntake, unmarkIntake } from "./service";

describe("deriveIntakes (pura)", () => {
  const meds = [
    { id: "m1", name: "Vitamina D", dose: "1 cápsula", times: ["09:00"] },
    { id: "m2", name: "Magnésio", dose: null, times: ["09:00", "21:00"] },
  ];

  test("expande cadastro × horários, ordenado por hora", () => {
    const slots = deriveIntakes(meds, []);
    expect(slots.map((s) => `${s.time} ${s.name}`)).toEqual([
      "09:00 Magnésio",
      "09:00 Vitamina D",
      "21:00 Magnésio",
    ]);
    expect(slots.every((s) => !s.taken)).toBe(true);
  });

  test("marca taken só no slot confirmado", () => {
    const slots = deriveIntakes(meds, [{ medicationId: "m2", time: "21:00" }]);
    expect(slots.find((s) => s.medicationId === "m2" && s.time === "21:00")?.taken).toBe(true);
    expect(slots.filter((s) => s.taken)).toHaveLength(1);
  });
});

describe("markIntake / unmarkIntake (db em memória)", () => {
  test("marcar decrementa estoque; duplicar dá duplicate; desmarcar devolve", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Vitamina D",
      stock: 10,
      times: ["09:00"],
    });
    const input = { medicationId: med.id, time: "09:00", day: "2026-07-06" };

    expect(await markIntake(db, userId, input)).toBe("ok");
    let [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(9);

    expect(await markIntake(db, userId, input)).toBe("duplicate");
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(9);

    expect(await unmarkIntake(db, userId, input)).toBe(true);
    [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(10);

    const slots = await getIntakesDay(db, userId, "2026-07-06");
    expect(slots).toHaveLength(1);
    expect(slots[0].taken).toBe(false);
  });

  test("estoque não fica negativo", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const med = await createMedication(db, userId, {
      name: "Magnésio",
      stock: 0,
      times: ["09:00"],
    });

    expect(await markIntake(db, userId, { medicationId: med.id, time: "09:00", day: "2026-07-06" })).toBe("ok");
    const [row] = await db.select().from(medication).where(eq(medication.id, med.id));
    expect(row.stock).toBe(0);
  });
});
```

- [ ] **Step 6: Adicionar scripts de teste**

Em `apps/web/package.json`, em `scripts`:

```json
"test": "bun test src"
```

Em `turbo.json`, dentro de `tasks` (mesmo nível de `check-types`):

```json
"test": {
  "cache": false
}
```

No `package.json` da raiz, em `scripts`:

```json
"test": "turbo run test"
```

- [ ] **Step 7: Rodar toda a suíte**

Run: `bun test` (na raiz, via turbo — ou `cd apps/web && bun test src`)
Expected: todos os testes pass (10 testes: 4 day + 4 meals + 2 blocos de medications).

- [ ] **Step 8: Typecheck e commit**

Run: `bun check-types`
Expected: sem erros.

```bash
git add apps/web/src/features apps/web/package.json turbo.json package.json
git commit -m "test: críticos de dia, pendência e estoque"
```

---

### Task 9: Verificação final da fase

**Files:** nenhum novo — verificação.

- [ ] **Step 1: Typecheck completo**

Run: `bun check-types`
Expected: todos os workspaces sem erro.

- [ ] **Step 2: Build de produção**

Run: `bun build`
Expected: `next build` conclui sem erro (rotas `/api/*` listadas no output).

- [ ] **Step 3: Smoke das rotas (sem sessão → 401)**

Com `bun dev:web` de pé:

```bash
for r in goals water meals medications intakes; do
  printf "%s: " "$r"
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/api/$r"
done
```

Expected: `401` nas cinco linhas.

- [ ] **Step 4: Smoke autenticado (fluxo real)**

```bash
# criar usuário e guardar cookie de sessão
curl -s -c /tmp/bloomy-cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "content-type: application/json" \
  -d '{"name":"Smoke","email":"smoke@test.dev","password":"smoke-test-123"}'

# metas ganham defaults
curl -s -b /tmp/bloomy-cookies.txt http://localhost:3001/api/goals
# esperado: 4 goals (water 2000, meals 3, workout 4, mind 1)

# registrar 250ml e conferir o dia
curl -s -b /tmp/bloomy-cookies.txt -X POST http://localhost:3001/api/water \
  -H "content-type: application/json" -d '{"ml":250}'
curl -s -b /tmp/bloomy-cookies.txt http://localhost:3001/api/water
# esperado: totalMl 250, 1 log
```

Expected: respostas JSON coerentes com o contrato (defaults de metas; totalMl 250).

- [ ] **Step 5: Relatar resultado à usuária** (não commitar nada espontaneamente; fase encerra com aprovação dela)

---

## Self-review (executado na escrita do plano)

- **Cobertura**: 12 decisões do grilling → Task 1 (convenções/CLAUDE.mds), Task 2 (schema+migrations desde já), Tasks 4–7 (metas genéricas c/ defaults, água em ml, refeições contagem+pendência, tomas derivadas+estoque transacional), Task 8 (testes críticos: virada de dia, pendência, tomas/estoque), Task 9 (verificação). UI/hooks ficam fora (fase posterior, decisão "back completo primeiro").
- **Placeholders**: nenhum TBD/TODO; todo step de código tem o código completo.
- **Consistência de tipos**: `Db` exportado na Task 2 e consumido nas 3–8; `dayFor`/`DAY_SCHEMA` (T3) usados em T5–T7; `deriveIntakes`/`pendingMealTypes` definidos em T6/T7 e testados em T8 com as mesmas assinaturas; `markIntake` retorna `"ok" | "duplicate" | "not_found"` em T7 e é assim testado em T8.
