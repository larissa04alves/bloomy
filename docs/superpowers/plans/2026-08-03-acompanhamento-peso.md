# Acompanhamento de peso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar peso ao longo do tempo e ver a tendência num card compacto na tela Saúde, com histórico editável agrupado por mês.

**Architecture:** Tabela `weight_log` com um registro por (usuário, dia) em gramas inteiros; serviço fino em `server/health/weight.ts` (CRUD + upsert por dia) exposto por rotas REST magras; todas as derivações (variação, período, agrupamento, série do gráfico) são funções puras testáveis em `peso-helpers.ts`, consumidas por um card na tela Saúde que usa o `chart` do shadcn (recharts).

**Tech Stack:** Next.js 16 (App Router) · Drizzle ORM + libsql · zod · shadcn/chart + recharts 3.8 · Tailwind 4 · Phosphor Icons · `bun test`

Spec: `docs/superpowers/specs/2026-08-03-acompanhamento-peso-design.md` · Issue [#11](https://github.com/larissa04alves/bloomy/issues/11) · Branch `feat/11-acompanhamento-peso`

## Global Constraints

- **NÃO COMMITAR.** Entregue tudo como mudanças não-commitadas — a Larissa revisa e commita (`CLAUDE.md` da raiz). Nenhuma task deste plano tem passo de commit, de propósito.
- **Comandos rodam da raiz com bun**, exceto `bun test`, que roda de `apps/web`.
- **`bun check-types` precisa passar** ao fim de cada task.
- **Migrations sempre geradas**, nunca escritas à mão: `bun db:generate`. Nunca editar migration existente.
- **Coluna `day`** é `YYYY-MM-DD` no fuso de Brasília, sempre via `dayFor()` de `server/shared/day.ts` (ADR-0002). Nunca recalcular fuso em outro lugar.
- **Serviços** recebem `db: Db` por parâmetro, começam com `import "server-only"` e nunca importam de `app/` (ADR-0001).
- **Rotas** são wrappers finos: zod → `requireUserId` → serviço. Zero regra de negócio.
- **Erros de API**: `{ "error": string }` + status, usando os helpers de `server/shared/api.ts`.
- **Telas em PT sem lógica no `.tsx`**; lógica em hooks. Código, tipos e nomes de arquivo de componente em EN; textos de UI em PT.
- **Tamanho de fonte só pela escala nomeada do Tailwind** (`text-xs`, `text-sm`, `text-base`, `text-lg`…). Nunca `text-[13px]`. Não existe `text-md`.
- **Regra do Sem-Vermelho** (`DESIGN.md:148`): nada de vermelho de alerta. Erro de formulário usa coral `#c76e93`; `toastError` já faz isso.
- **Variação de peso é sempre neutra** — `text-ink-soft`. Nunca verde para queda nem rosa para subida: o app não julga o número da usuária.
- **Nenhum float persistido, comparado ou somado.** Peso trafega em gramas inteiros de ponta a ponta; kg só aparece na formatação e nos pontos plotados.
- **Dependências de catálogo**: versões novas entram em `workspaces.catalog` no `package.json` da raiz e os packages referenciam `"catalog:"`.
- **`packages/ui/src/components/` é só de arquivos gerados pelo shadcn** — nada autoral lá.

---

### Task 1: Tabela `weight_log` + migration

**Files:**
- Modify: `packages/db/src/schema/health.ts`
- Create: `packages/db/src/migrations/00XX_*.sql` (gerada, nome automático)

**Interfaces:**
- Consumes: nada
- Produces: `weightLog` (tabela drizzle) e `type WeightLog = typeof weightLog.$inferSelect`, exportados de `@bloomy/db/schema/health`. Colunas: `id: string`, `userId: string`, `day: string`, `grams: number`, `createdAt: Date`, `updatedAt: Date`.

- [ ] **Step 1: Adicionar `uniqueIndex` ao import do schema de saúde**

Em `packages/db/src/schema/health.ts`, o import atual é:

```ts
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
```

Trocar por:

```ts
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
```

- [ ] **Step 2: Declarar a tabela**

Adicionar ao fim de `packages/db/src/schema/health.ts`, **antes** da linha `export type Appointment = ...`:

```ts
/** Pesagem: um registro por (usuário, dia). Peso em gramas inteiros — nunca float. */
export const weightLog = sqliteTable(
  "weight_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    grams: integer("grams").notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  // O unique também serve de índice para as consultas por intervalo de dia.
  (table) => [uniqueIndex("weight_log_user_day_idx").on(table.userId, table.day)],
);
```

- [ ] **Step 3: Exportar o tipo**

No fim do mesmo arquivo, junto dos outros:

```ts
export type WeightLog = typeof weightLog.$inferSelect;
```

- [ ] **Step 4: Gerar a migration**

Run: `bun db:generate`
Expected: cria `packages/db/src/migrations/00XX_<nome-aleatório>.sql` contendo `CREATE TABLE \`weight_log\`` e `CREATE UNIQUE INDEX \`weight_log_user_day_idx\``.

- [ ] **Step 5: Conferir o SQL gerado**

Abrir o arquivo criado e confirmar que tem exatamente uma `CREATE TABLE` e uma `CREATE UNIQUE INDEX`, e **nenhum** `DROP`. Se aparecer qualquer `DROP TABLE` de outra tabela, pare e reporte — significa drift de schema, não um problema desta task.

- [ ] **Step 6: Typecheck**

Run: `bun check-types`
Expected: PASS

---

### Task 2: Serviço de peso (TDD)

**Files:**
- Create: `apps/web/src/server/health/weight.ts`
- Test: `apps/web/src/server/health/weight.test.ts`

**Interfaces:**
- Consumes: `weightLog`, `WeightLog` de `@bloomy/db/schema/health` (Task 1)
- Produces:
  - `listWeights(db: Db, userId: string): Promise<WeightLog[]>` — `day` desc
  - `upsertWeight(db: Db, userId: string, input: { day: string; grams: number }): Promise<WeightLog>`
  - `updateWeight(db: Db, userId: string, id: string, input: { day?: string; grams?: number }): Promise<WeightLog | null | "day_taken">`
  - `deleteWeight(db: Db, userId: string, id: string): Promise<boolean>`

- [ ] **Step 1: Escrever os testes falhando**

Criar `apps/web/src/server/health/weight.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { createTestDb, createTestUser } from "@/server/shared/test-db";
import { deleteWeight, listWeights, updateWeight, upsertWeight } from "./weight";

describe("upsertWeight", () => {
  test("cria o primeiro registro do dia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const row = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    expect(row.grams).toBe(64200);
    expect(row.day).toBe("2026-08-03");
  });

  test("registrar de novo no mesmo dia substitui, não duplica", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, userId, { day: "2026-08-03", grams: 64500 });

    const all = await listWeights(db, userId);
    expect(all).toHaveLength(1);
    expect(all[0].grams).toBe(64500);
  });

  test("usuários diferentes podem ter peso no mesmo dia", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");

    await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, b, { day: "2026-08-03", grams: 71000 });

    expect(await listWeights(db, a)).toHaveLength(1);
    expect(await listWeights(db, b)).toHaveLength(1);
  });
});

describe("listWeights", () => {
  test("ordena por dia desc e isola por usuário", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");

    await upsertWeight(db, a, { day: "2026-07-20", grams: 64800 });
    await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });
    await upsertWeight(db, a, { day: "2026-07-27", grams: 65000 });
    await upsertWeight(db, b, { day: "2026-08-01", grams: 71000 });

    const rows = await listWeights(db, a);

    expect(rows.map((r) => r.day)).toEqual(["2026-08-03", "2026-07-27", "2026-07-20"]);
  });

  test("sem registros → lista vazia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await listWeights(db, userId)).toEqual([]);
  });
});

describe("updateWeight", () => {
  test("altera o valor mantendo o dia", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const updated = await updateWeight(db, userId, created.id, { grams: 63900 });

    expect(updated).not.toBeNull();
    expect(updated).not.toBe("day_taken");
    if (updated && updated !== "day_taken") {
      expect(updated.grams).toBe(63900);
      expect(updated.day).toBe("2026-08-03");
    }
  });

  test("move para um dia livre", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const updated = await updateWeight(db, userId, created.id, { day: "2026-08-02" });

    expect(updated).not.toBe("day_taken");
    if (updated && updated !== "day_taken") expect(updated.day).toBe("2026-08-02");
  });

  test("mover para um dia já ocupado devolve 'day_taken' e não apaga o outro", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await upsertWeight(db, userId, { day: "2026-08-02", grams: 65000 });
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    const result = await updateWeight(db, userId, created.id, { day: "2026-08-02" });

    expect(result).toBe("day_taken");
    const all = await listWeights(db, userId);
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.day === "2026-08-02")?.grams).toBe(65000);
  });

  test("id inexistente → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await updateWeight(db, userId, "nope", { grams: 60000 })).toBeNull();
  });

  test("registro de outro usuário → null, sem alterar nada", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");
    const created = await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });

    expect(await updateWeight(db, b, created.id, { grams: 50000 })).toBeNull();
    expect((await listWeights(db, a))[0].grams).toBe(64200);
  });
});

describe("deleteWeight", () => {
  test("remove o registro do próprio usuário", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await upsertWeight(db, userId, { day: "2026-08-03", grams: 64200 });

    expect(await deleteWeight(db, userId, created.id)).toBe(true);
    expect(await listWeights(db, userId)).toEqual([]);
  });

  test("registro de outro usuário não é removido", async () => {
    const db = await createTestDb();
    const a = await createTestUser(db, "user-a");
    const b = await createTestUser(db, "user-b");
    const created = await upsertWeight(db, a, { day: "2026-08-03", grams: 64200 });

    expect(await deleteWeight(db, b, created.id)).toBe(false);
    expect(await listWeights(db, a)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test --conditions react-server src/server/health/weight.test.ts`
Expected: FAIL — `Cannot find module './weight'`

- [ ] **Step 3: Implementar o serviço**

Criar `apps/web/src/server/health/weight.ts`:

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { weightLog, type WeightLog } from "@bloomy/db/schema/health";
import { and, desc, eq } from "drizzle-orm";

/** Erro de domínio: mover uma pesagem para um dia que já tem registro. */
export type WeightConflict = "day_taken";

export async function listWeights(db: Db, userId: string): Promise<WeightLog[]> {
  return db
    .select()
    .from(weightLog)
    .where(eq(weightLog.userId, userId))
    .orderBy(desc(weightLog.day));
}

/** Uma pesagem por (usuário, dia): registrar de novo no mesmo dia substitui o valor. */
export async function upsertWeight(
  db: Db,
  userId: string,
  input: { day: string; grams: number },
): Promise<WeightLog> {
  const [row] = await db
    .insert(weightLog)
    .values({ userId, day: input.day, grams: input.grams })
    .onConflictDoUpdate({
      target: [weightLog.userId, weightLog.day],
      set: { grams: input.grams, updatedAt: new Date() },
    })
    .returning();
  return row;
}

/**
 * Edita valor e/ou dia. Mover para um dia já ocupado sobrescreveria outro registro
 * silenciosamente — por isso recusa com `"day_taken"` em vez de fazer upsert.
 */
export async function updateWeight(
  db: Db,
  userId: string,
  id: string,
  input: { day?: string; grams?: number },
): Promise<WeightLog | null | WeightConflict> {
  const [current] = await db
    .select()
    .from(weightLog)
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)));
  if (!current) return null;

  const day = input.day ?? current.day;
  if (day !== current.day) {
    const [taken] = await db
      .select()
      .from(weightLog)
      .where(and(eq(weightLog.userId, userId), eq(weightLog.day, day)));
    if (taken) return "day_taken";
  }

  const [row] = await db
    .update(weightLog)
    .set({ day, grams: input.grams ?? current.grams, updatedAt: new Date() })
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
    .returning();
  return row;
}

export async function deleteWeight(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(weightLog)
    .where(and(eq(weightLog.id, id), eq(weightLog.userId, userId)))
    .returning();
  return rows.length > 0;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run (de `apps/web`): `bun test --conditions react-server src/server/health/weight.test.ts`
Expected: PASS — 12 testes

- [ ] **Step 5: Typecheck**

Run (da raiz): `bun check-types`
Expected: PASS

---

### Task 3: Rotas `/api/weights`

**Files:**
- Create: `apps/web/src/app/api/weights/route.ts`
- Create: `apps/web/src/app/api/weights/[id]/route.ts`
- Modify: `apps/web/src/lib/api-types.ts`

**Interfaces:**
- Consumes: `listWeights`, `upsertWeight`, `updateWeight`, `deleteWeight` (Task 2); `dayFor`, `DAY_SCHEMA` de `server/shared/day.ts`; helpers de `server/shared/api.ts`
- Produces:
  - Tipo `WeightLog = { id: string; grams: number; day: string; createdAt: string }` em `@/lib/api-types`
  - `GET /api/weights` → `{ weights: WeightLog[] }`
  - `POST /api/weights` body `{ grams: number; day?: string }` → 201 `{ weight: WeightLog }`
  - `PATCH /api/weights/[id]` body `{ grams?: number; day?: string }` → `{ weight }` · 404 · 409
  - `DELETE /api/weights/[id]` → `{ ok: true }` · 404

- [ ] **Step 1: Adicionar o tipo de API**

Em `apps/web/src/lib/api-types.ts`, adicionar junto dos tipos de saúde (perto de `Exam`):

```ts
export type WeightLog = { id: string; grams: number; day: string; createdAt: string };
```

- [ ] **Step 2: Criar a rota de coleção**

Criar `apps/web/src/app/api/weights/route.ts`:

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { listWeights, upsertWeight } from "@/server/health/weight";

// 20–300 kg em gramas. Data no futuro não existe: não dá pra pesar amanhã.
const GRAMS = z.number().int().min(20_000).max(300_000);
const PAST_DAY = DAY_SCHEMA.refine((d) => d <= dayFor(), "data no futuro");

const BODY_SCHEMA = z.object({ grams: GRAMS, day: PAST_DAY.optional() });

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  return Response.json({ weights: await listWeights(db, userId) });
}

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const weight = await upsertWeight(db, userId, {
    day: parsed.data.day ?? dayFor(),
    grams: parsed.data.grams,
  });
  return Response.json({ weight }, { status: 201 });
}
```

- [ ] **Step 3: Criar a rota de item**

Criar `apps/web/src/app/api/weights/[id]/route.ts`:

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import {
  conflict,
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { DAY_SCHEMA, dayFor } from "@/server/shared/day";
import { deleteWeight, updateWeight } from "@/server/health/weight";

const GRAMS = z.number().int().min(20_000).max(300_000);
const PAST_DAY = DAY_SCHEMA.refine((d) => d <= dayFor(), "data no futuro");

const BODY_SCHEMA = z.object({ grams: GRAMS.optional(), day: PAST_DAY.optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const weight = await updateWeight(db, userId, id, parsed.data);
  if (!weight) return notFound();
  if (weight === "day_taken") return conflict("já existe peso registrado nessa data");

  return Response.json({ weight });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const deleted = await deleteWeight(db, userId, id);
  if (!deleted) return notFound();

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Typecheck**

Run: `bun check-types`
Expected: PASS

- [ ] **Step 5: Fumaça manual das rotas**

Subir `bun dev:web`, logar no app e, no console do navegador (mesma origem, cookie de sessão vai junto):

```js
await (await fetch("/api/weights", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ grams: 64200 }),
})).json();
// → { weight: { id: "...", grams: 64200, day: "<hoje>", ... } }

await (await fetch("/api/weights")).json();
// → { weights: [ { grams: 64200, ... } ] }

await (await fetch("/api/weights", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ grams: 64500 }),
})).json();
// registrar de novo hoje → substitui; o GET seguinte deve continuar com 1 item, agora 64500
```

Expected: o segundo POST **não** cria um segundo registro.

---

### Task 4: Helpers puros de peso (TDD)

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/peso-helpers.ts`
- Test: `apps/web/src/app/(app)/saude/hooks/peso-helpers.test.ts`

**Interfaces:**
- Consumes: `WeightLog` de `@/lib/api-types` (Task 3)
- Produces:
  - `type Period = "30d" | "3m" | "1y"` e `PERIODS: { value: Period; label: string; full: string }[]` (`label` curto para o chip, `full` para o `aria-label`)
  - `type Delta = { direction: "up" | "down" | "flat"; label: string }`
  - `type MonthGroup = { key: string; label: string; balance: Delta | null; items: WeightLog[] }`
  - `type ChartPoint = { day: string; kg: number }`
  - `formatKg(grams: number): string`
  - `deltaBetween(current: number, previous?: number): Delta | null`
  - `filterPeriod(weights: WeightLog[], period: Period, today?: string): WeightLog[]`
  - `groupByMonth(weights: WeightLog[]): MonthGroup[]`
  - `chartSeries(weights: WeightLog[]): ChartPoint[]`
  - `dayLabel(day: string): string`

- [ ] **Step 1: Escrever os testes falhando**

Criar `apps/web/src/app/(app)/saude/hooks/peso-helpers.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import type { WeightLog } from "@/lib/api-types";

import {
  chartSeries,
  dayLabel,
  deltaBetween,
  filterPeriod,
  formatKg,
  groupByMonth,
} from "./peso-helpers";

/** Fixture: só os campos que os helpers leem. */
const w = (day: string, grams: number): WeightLog => ({
  id: day,
  day,
  grams,
  createdAt: `${day}T12:00:00.000Z`,
});

// Ordem desc, como vem da API.
const SERIE: WeightLog[] = [
  w("2026-08-03", 64200),
  w("2026-07-27", 65000),
  w("2026-07-20", 64800),
  w("2026-07-13", 64600),
  w("2026-07-05", 65000),
  w("2026-06-28", 65200),
];

describe("formatKg", () => {
  it("uma casa decimal com vírgula", () => {
    expect(formatKg(64200)).toBe("64,2");
  });
  it("mantém o zero à direita", () => {
    expect(formatKg(65000)).toBe("65,0");
  });
  it("arredonda para a casa mais próxima", () => {
    expect(formatKg(64250)).toBe("64,3");
  });
  it("formata diferenças pequenas", () => {
    expect(formatKg(800)).toBe("0,8");
  });
});

describe("deltaBetween", () => {
  it("sem pesagem anterior → null", () => {
    expect(deltaBetween(64200, undefined)).toBeNull();
  });
  it("perdeu peso → down com valor absoluto", () => {
    expect(deltaBetween(64200, 65000)).toEqual({ direction: "down", label: "0,8" });
  });
  it("ganhou peso → up com valor absoluto", () => {
    expect(deltaBetween(65000, 64800)).toEqual({ direction: "up", label: "0,2" });
  });
  it("mesmo peso → flat", () => {
    expect(deltaBetween(65000, 65000)).toEqual({ direction: "flat", label: "0,0" });
  });
});

describe("filterPeriod", () => {
  it("30d pega só o último mês", () => {
    const rows = filterPeriod(SERIE, "30d", "2026-08-03");
    expect(rows.map((r) => r.day)).toEqual([
      "2026-08-03",
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
      "2026-07-05",
    ]);
  });
  it("3m pega tudo dessa série", () => {
    expect(filterPeriod(SERIE, "3m", "2026-08-03")).toHaveLength(6);
  });
  it("inclui o registro exatamente no limite do período", () => {
    const rows = filterPeriod([w("2026-07-04", 65000)], "30d", "2026-08-03");
    expect(rows).toHaveLength(1);
  });
  it("exclui o registro um dia além do limite", () => {
    const rows = filterPeriod([w("2026-07-03", 65000)], "30d", "2026-08-03");
    expect(rows).toEqual([]);
  });
  it("período sem pesagens → vazio, mesmo com histórico", () => {
    expect(filterPeriod([w("2025-01-10", 70000)], "30d", "2026-08-03")).toEqual([]);
  });
});

describe("groupByMonth", () => {
  it("agrupa em meses desc com rótulo por extenso", () => {
    const groups = groupByMonth(SERIE);
    expect(groups.map((g) => g.label)).toEqual(["Agosto 2026", "Julho 2026", "Junho 2026"]);
  });

  it("saldo do mês compara com a última pesagem do mês anterior", () => {
    const groups = groupByMonth(SERIE);
    // agosto: 64,2 (3 ago) vs 65,0 (27 jul, última de julho) → desceu 0,8
    expect(groups[0].balance).toEqual({ direction: "down", label: "0,8" });
    // julho: 65,0 (27 jul) vs 65,2 (28 jun) → desceu 0,2
    expect(groups[1].balance).toEqual({ direction: "down", label: "0,2" });
  });

  it("mês mais antigo não tem com o que comparar → balance null", () => {
    const groups = groupByMonth(SERIE);
    expect(groups[groups.length - 1].balance).toBeNull();
  });

  it("mantém os itens do mês em ordem desc", () => {
    const groups = groupByMonth(SERIE);
    expect(groups[1].items.map((i) => i.day)).toEqual([
      "2026-07-27",
      "2026-07-20",
      "2026-07-13",
      "2026-07-05",
    ]);
  });

  it("lista vazia → nenhum grupo", () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it("entrada fora de ordem produz o mesmo resultado da ordenada", () => {
    const embaralhada = [SERIE[3], SERIE[0], SERIE[5], SERIE[2], SERIE[4], SERIE[1]];
    const groups = groupByMonth(embaralhada);

    // Sem o sort defensivo, o mesmo mês viraria dois grupos e os saldos
    // comparariam com o mês errado.
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.label)).toEqual(["Agosto 2026", "Julho 2026", "Junho 2026"]);
    expect(groups[0].balance).toEqual({ direction: "down", label: "0,8" });
    expect(groups[1].balance).toEqual({ direction: "down", label: "0,2" });
    expect(groups[2].balance).toBeNull();
  });
});

describe("chartSeries", () => {
  it("inverte para ordem crescente e converte para kg", () => {
    const points = chartSeries([w("2026-08-03", 64200), w("2026-07-27", 65000)]);
    expect(points).toEqual([
      { day: "2026-07-27", kg: 65 },
      { day: "2026-08-03", kg: 64.2 },
    ]);
  });
});

describe("dayLabel", () => {
  it("data por extenso sem ano", () => {
    expect(dayLabel("2026-08-03")).toBe("3 de agosto");
  });
  it("não usa fuso do browser (dia não escorrega)", () => {
    expect(dayLabel("2026-01-01")).toBe("1 de janeiro");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test --conditions react-server src/app/\(app\)/saude/hooks/peso-helpers.test.ts`
Expected: FAIL — `Cannot find module './peso-helpers'`

- [ ] **Step 3: Implementar os helpers**

Criar `apps/web/src/app/(app)/saude/hooks/peso-helpers.ts`:

```ts
import type { WeightLog } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

export type Period = "30d" | "3m" | "1y";

/** `label` é o texto do chip (o card é estreito); `full` vai no aria-label. */
export const PERIODS: { value: Period; label: string; full: string }[] = [
  { value: "30d", label: "30d", full: "30 dias" },
  { value: "3m", label: "3m", full: "3 meses" },
  { value: "1y", label: "1a", full: "1 ano" },
];

const PERIOD_DAYS: Record<Period, number> = { "30d": 30, "3m": 90, "1y": 365 };

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Direção da variação. A cor nunca é semântica: quem exibe usa tinta neutra. */
export type Delta = { direction: "up" | "down" | "flat"; label: string };

export type MonthGroup = {
  key: string; // "2026-08"
  label: string; // "Agosto 2026"
  balance: Delta | null;
  items: WeightLog[]; // desc
};

export type ChartPoint = { day: string; kg: number };

/** 64200 → "64,2". Sempre uma casa, vírgula decimal. */
export function formatKg(grams: number): string {
  return (grams / 1000).toFixed(1).replace(".", ",");
}

export function deltaBetween(current: number, previous?: number): Delta | null {
  if (previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return { direction: "flat", label: "0,0" };
  return { direction: diff > 0 ? "up" : "down", label: formatKg(Math.abs(diff)) };
}

/** Soma dias a um "YYYY-MM-DD" sem tocar no fuso do browser. */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Recorte do período. `day` é YYYY-MM-DD, então comparação de string basta.
 * O "hoje" padrão vem de `dayFor()` (fuso BR, ADR-0002) — `day.ts` é client-safe
 * de propósito, justamente para o cliente não recalcular fuso por conta própria.
 */
export function filterPeriod(
  weights: WeightLog[],
  period: Period,
  today: string = dayFor(),
): WeightLog[] {
  const from = shiftDay(today, -PERIOD_DAYS[period]);
  return weights.filter((w) => w.day >= from);
}

/**
 * Agrupa em meses (desc). O saldo do mês é a última pesagem do mês contra a última
 * do mês anterior — o mês mais antigo não tem com o que comparar e fica `null`.
 *
 * Ordena a entrada por conta própria: a detecção de mês só compara com o grupo
 * anterior, então uma lista fora de ordem geraria dois grupos para o mesmo mês e
 * saldos comparados com o mês errado. Quem chama não precisa saber disso.
 */
export function groupByMonth(weights: WeightLog[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const sorted = [...weights].sort((a, b) => b.day.localeCompare(a.day));

  for (const w of sorted) {
    const key = w.day.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(w);
      continue;
    }
    const [year, month] = key.split("-");
    const name = MONTHS_PT[Number(month) - 1];
    groups.push({
      key,
      label: `${name[0].toUpperCase()}${name.slice(1)} ${year}`,
      balance: null,
      items: [w],
    });
  }

  return groups.map((g, i) => {
    const previousMonth = groups[i + 1]; // groups está desc: o próximo é o mês anterior
    const previousLast = previousMonth?.items[0]?.grams;
    return { ...g, balance: deltaBetween(g.items[0].grams, previousLast) };
  });
}

/** Pontos para o gráfico, em ordem cronológica. kg só existe aqui e na formatação. */
export function chartSeries(weights: WeightLog[]): ChartPoint[] {
  return [...weights].reverse().map((w) => ({ day: w.day, kg: w.grams / 1000 }));
}

/** "2026-08-03" → "3 de agosto". Sem `new Date(iso)` para o dia não escorregar de fuso. */
export function dayLabel(day: string): string {
  const [, month, dayOfMonth] = day.split("-");
  return `${Number(dayOfMonth)} de ${MONTHS_PT[Number(month) - 1]}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run (de `apps/web`): `bun test --conditions react-server src/app/\(app\)/saude/hooks/peso-helpers.test.ts`
Expected: PASS — 22 testes

- [ ] **Step 5: Typecheck**

Run: `bun check-types`
Expected: PASS

---

### Task 5: `chart` do shadcn no `packages/ui`

**Files:**
- Create: `packages/ui/src/components/chart.tsx` (gerado pelo shadcn — não editar depois)
- Modify: `package.json` (raiz, `workspaces.catalog`)
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/src/styles/globals.css`

**Interfaces:**
- Consumes: nada
- Produces: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `type ChartConfig` importáveis de `@bloomy/ui/components/chart`; vars CSS `--chart-1`…`--chart-5`

- [ ] **Step 1: Adicionar o componente pelo CLI do shadcn**

Run (de `packages/ui`): `bunx shadcn@latest add chart`
Expected: cria `src/components/chart.tsx` e adiciona `recharts` às dependências de `packages/ui/package.json`.

- [ ] **Step 2: Mover `recharts` para o catálogo**

O CLI grava uma versão solta. Em `package.json` da **raiz**, adicionar em `workspaces.catalog` (mantendo a ordem alfabética das entradas vizinhas):

```json
"recharts": "3.8.0"
```

Em `packages/ui/package.json`, trocar a versão solta que o CLI escreveu por:

```json
"recharts": "catalog:"
```

- [ ] **Step 3: Reinstalar**

Run (da raiz): `bun install`
Expected: sem erro de resolução de catálogo.

- [ ] **Step 4: Definir as cores de gráfico nos tokens Bloomy**

Em `packages/ui/src/styles/globals.css`, no bloco `:root` (o dos tokens semânticos do shadcn), adicionar logo depois da linha `--radius: 1rem;`:

```css
  /* Cores de série do shadcn/chart — paleta Bloomy, lilás como primária. */
  --chart-1: #a78bd0; /* lilac */
  --chart-2: #f3b6d0; /* pink */
  --chart-3: #a8d5ba; /* green */
  --chart-4: #c77e93; /* coral */
  --chart-5: #8768bc; /* lilac-deep */
```

E no bloco `@theme inline` (o que mapeia tokens semânticos para utilitários), junto das outras linhas `--color-*: var(--*)`:

```css
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
```

- [ ] **Step 5: Typecheck**

Run (da raiz): `bun check-types`
Expected: PASS

- [ ] **Step 6: Verificar que nada quebrou no app**

Run: `bun dev:web`, abrir `http://localhost:3001` e navegar até a tela Saúde.
Expected: tela renderiza normalmente (o chart ainda não é usado; isto só confirma que o CSS novo não quebrou os tokens existentes).

---

### Task 6: `Stepper` com formatação e número editável

**Files:**
- Modify: `apps/web/src/components/stepper.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `Stepper` com duas props novas **opcionais**, sem quebrar o uso atual (o único call site do componente compartilhado é o `WaterModal`; o `StepperField` do `SerieList` é outro componente):
  - `format?: (value: number) => string` — como o valor aparece
  - `parse?: (text: string) => number | null` — habilita edição por teclado; `null` = entrada inválida, mantém o valor anterior

- [ ] **Step 1: Reescrever o componente**

Substituir todo o conteúdo de `apps/web/src/components/stepper.tsx`:

```tsx
"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  format,
  parse,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  unit?: string;
  /** Como exibir o valor (ex.: gramas → "64,2"). Sem isso, mostra o número cru. */
  format?: (value: number) => string;
  /** Habilita digitar o valor. Recebe o texto, devolve a unidade interna ou null. */
  parse?: (text: string) => number | null;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const display = format ? format(value) : String(value);

  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const commit = () => {
    if (draft === null || !parse) return;
    const next = parse(draft);
    if (next !== null) onChange(clamp(next));
    setDraft(null);
  };

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="grid size-12 place-items-center rounded-full bg-lilac-tint text-lilac-deep disabled:text-ink-faint"
      >
        <MinusIcon size={22} weight="bold" />
      </button>
      <div className="flex flex-col items-center">
        {editing ? (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- o input só existe após o toque no número
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setDraft(null);
            }}
            aria-label="Valor"
            className="w-32 border-b-2 border-dashed border-control-off bg-transparent text-center font-display text-4xl font-bold text-ink outline-none"
          />
        ) : parse ? (
          <button
            type="button"
            onClick={() => setDraft(display)}
            aria-label="Digitar valor"
            className="border-b-2 border-dashed border-control-off font-display text-4xl font-bold text-ink"
          >
            {display}
          </button>
        ) : (
          <span className="font-display text-4xl font-bold text-ink">{display}</span>
        )}
        {/* classe idêntica à original: o Stepper não pode mudar de aparência p/ quem já usa */}
        {unit ? <span className="text-sm font-semibold text-ink-read">{unit}</span> : null}
      </div>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="grid size-12 place-items-center rounded-full bg-lilac text-white shadow-btn disabled:opacity-60"
      >
        <PlusIcon size={22} weight="bold" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun check-types`
Expected: PASS

- [ ] **Step 3: Confirmar que o modal de água não regrediu**

Run: `bun dev:web`, abrir a aba **Corpo**, tocar em "Adicionar copo" → modal de água.
Expected: stepper funciona como antes; o número **não** é clicável (sem `parse`, continua um `<span>`); os atalhos 200/250/500/Garrafa seguem funcionando.

---

### Task 7: `PesoModal` — bottom sheet de registro

**Files:**
- Create: `apps/web/src/app/(app)/saude/components/PesoModal.tsx`

**Interfaces:**
- Consumes: `Stepper` com `format`/`parse` (Task 6); `BottomSheet`, `DatePickerField`; `formatKg` (Task 4); `WeightLog` (Task 3)
- Produces: componente

```tsx
<PesoModal
  open={boolean}
  onOpenChange={(open: boolean) => void}
  initial={WeightLog | undefined}      // undefined = registrar novo
  lastGrams={number | undefined}       // último peso, para pré-preencher
  onSubmit={(input: { grams: number; day: string }) => void}
/>
```

> **A implementação final divergiu deste código em quatro pontos**, todos decididos durante a
> execução e já aplicados no repositório (o código abaixo é a versão inicial, mantida como
> registro):
> 1. O estado vazio **não semeia `70_000`** — decisão da Larissa. O toque abre um `<input>`
>    próprio com o campo em branco; o `Stepper` só assume depois que existe um valor dela.
>    Valor fora da faixa é recusado mantendo a edição, sem clamp.
> 2. `parseKgToGrams` aceita **uma** casa decimal (não duas), para bater com o que `formatKg` exibe.
> 3. O `useEffect` de reset depende de `initial?.id`, não do objeto `initial`.
> 4. `parseKgToGrams`, `toDayString` e `fromDayString` **moraram para `peso-helpers.ts`**, onde há
>    suíte de teste — um `.tsx` não é coberto por `bun test` neste repo.

- [ ] **Step 1: Criar o componente**

Criar `apps/web/src/app/(app)/saude/components/PesoModal.tsx`:

```tsx
"use client";

import { ScalesIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import type { WeightLog } from "@/lib/api-types";

import { formatKg } from "../hooks/peso-helpers";
import { DatePickerField } from "./DatePickerField";

const MIN_GRAMS = 20_000;
const MAX_GRAMS = 300_000;
const STEP_GRAMS = 100; // 0,1 kg

/** "64,2" ou "64.2" → 64200 g. Texto inválido devolve null (mantém o valor atual). */
function parseKgToGrams(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
}

/** Date → "YYYY-MM-DD" pelos campos locais (evita o escorregão de fuso do toISOString). */
function toDayString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** "YYYY-MM-DD" → Date local ao meio-dia (imune a horário de verão). */
function fromDayString(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function PesoModal({
  open,
  onOpenChange,
  initial,
  lastGrams,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: WeightLog;
  lastGrams?: number;
  onSubmit: (input: { grams: number; day: string }) => void;
}) {
  // Sem histórico e sem edição, não há de onde partir: o campo nasce vazio
  // pedindo o número em vez de chutar um peso qualquer.
  const [grams, setGrams] = useState<number | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Reabrir o sheet reinicia o rascunho a partir do que estamos editando (ou de hoje).
  useEffect(() => {
    if (!open) return;
    setGrams(initial?.grams ?? lastGrams ?? null);
    setDate(initial ? fromDayString(initial.day) : new Date());
  }, [open, initial, lastGrams]);

  const canSubmit = grams !== null && date !== undefined;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Editar peso" : "Registrar peso"}
      tone="lilac"
      icon={<ScalesIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => {
            if (grams === null || !date) return;
            onSubmit({ grams, day: toDayString(date) });
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          {initial ? "Salvar" : "Registrar"}
        </button>
      }
    >
      {grams === null ? (
        <button
          type="button"
          onClick={() => setGrams(lastGrams ?? 70_000)}
          className="rounded-card border border-dashed border-hairline p-6 text-center font-display text-lg font-bold text-lilac-deep"
        >
          Toque para informar seu peso
        </button>
      ) : (
        <Stepper
          value={grams}
          min={MIN_GRAMS}
          max={MAX_GRAMS}
          step={STEP_GRAMS}
          onChange={setGrams}
          unit="kg"
          format={formatKg}
          parse={parseKgToGrams}
        />
      )}

      <p className="text-center text-xs font-semibold text-ink-faint">
        ±0,1 nos botões · toque no número pra digitar
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-ink-soft">Data</span>
        <DatePickerField value={date} onChange={setDate} placeholder="Escolha a data" />
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `bun check-types`
Expected: PASS

Nota: o componente ainda não é montado em lugar nenhum — a verificação visual acontece na Task 9, quando a página passa a renderizá-lo.

---

### Task 8: `PesoChart` e `PesoSection` — o card na tela Saúde

**Files:**
- Create: `apps/web/src/app/(app)/saude/components/PesoChart.tsx`
- Create: `apps/web/src/app/(app)/saude/components/PesoSection.tsx`

**Interfaces:**
- Consumes: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartConfig` de `@bloomy/ui/components/chart` (Task 5); `chartSeries`, `formatKg`, `deltaBetween`, `dayLabel`, `PERIODS`, tipos `Period`/`Delta`/`ChartPoint` (Task 4); `WeightLog` (Task 3)
- Produces:
  - `<PesoChart points={ChartPoint[]} />`
  - `<PesoSection weights={WeightLog[]} period={Period} onPeriodChange={(p: Period) => void} onAdd={() => void} onHistory={() => void} />`
  - `<DeltaLabel delta={Delta} />` exportado de `PesoSection.tsx` (o histórico reusa na Task 9)

- [ ] **Step 1: Criar o gráfico**

Criar `apps/web/src/app/(app)/saude/components/PesoChart.tsx`:

```tsx
"use client";

import { Area, AreaChart, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@bloomy/ui/components/chart";

import { dayLabel, type ChartPoint } from "../hooks/peso-helpers";

const CONFIG = {
  kg: { label: "Peso", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

export function PesoChart({ points }: { points: ChartPoint[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-[54px] w-full">
      <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="pesoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* domínio folgado: sem isso a linha encosta nas bordas e some a variação */}
        <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => dayLabel(String(payload?.[0]?.payload?.day ?? ""))}
              formatter={(value) => `${String(value).replace(".", ",")} kg`}
            />
          }
        />
        <Area
          dataKey="kg"
          // reta, não curva: com pesagens espaçadas, curva suave inventa movimento
          type="linear"
          stroke="var(--color-lilac-deep)"
          strokeWidth={2.5}
          fill="url(#pesoFill)"
          dot={false}
          activeDot={{ r: 4.5, fill: "var(--color-lilac-deep)", stroke: "#fff", strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 2: Criar a seção**

Criar `apps/web/src/app/(app)/saude/components/PesoSection.tsx`:

```tsx
"use client";

import { CaretDownIcon, CaretUpIcon, MinusIcon, PlusIcon, ScalesIcon } from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

import { IconChip } from "@/components/icon-chip";
import type { WeightLog } from "@/lib/api-types";

import {
  PERIODS,
  chartSeries,
  dayLabel,
  deltaBetween,
  filterPeriod,
  formatKg,
  type Delta,
  type Period,
} from "../hooks/peso-helpers";
import { PesoChart } from "./PesoChart";

/** Variação sempre em tinta neutra: a seta informa, a cor não julga. */
export function DeltaLabel({ delta }: { delta: Delta }) {
  const Icon =
    delta.direction === "up" ? CaretUpIcon : delta.direction === "down" ? CaretDownIcon : MinusIcon;
  const direction =
    delta.direction === "up" ? "subiu" : delta.direction === "down" ? "desceu" : "manteve";
  return (
    <span
      className="flex items-center gap-0.5 text-xs font-extrabold text-ink-soft"
      aria-label={`${direction} ${delta.label} quilos`}
    >
      <Icon size={12} weight="bold" aria-hidden="true" />
      {delta.label}
    </span>
  );
}

export function PesoSection({
  weights,
  period,
  onPeriodChange,
  onAdd,
  onHistory,
}: {
  weights: WeightLog[]; // desc
  period: Period;
  onPeriodChange: (period: Period) => void;
  onAdd: () => void;
  onHistory: () => void;
}) {
  const latest = weights[0];
  const delta = latest ? deltaBetween(latest.grams, weights[1]?.grams) : null;
  const visible = filterPeriod(weights, period);
  const points = chartSeries(visible);

  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Registrar peso"
      className="grid size-6.5 place-items-center rounded-full bg-lilac text-white shadow-btn"
    >
      <PlusIcon size={15} weight="bold" />
    </button>
  );

  // Estado vazio: convite, nunca cobrança. Sem gráfico, sem períodos, sem número zerado.
  if (!latest) {
    return (
      <section className="rounded-card bg-white p-3.5 shadow-card">
        <div className="mb-2.5 flex items-center gap-2">
          <IconChip tone="lilac" icon={<ScalesIcon size={18} weight="fill" />} className="size-7" />
          <h2 className="font-display text-base font-bold text-ink">Peso</h2>
        </div>
        <p className="text-center text-sm font-bold text-ink">Nenhum peso registrado</p>
        <p className="mt-1 text-center text-xs font-semibold text-ink-faint">
          Quando quiser acompanhar, é só registrar.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="mt-2.5 w-full rounded-full bg-lilac-tint py-2.5 font-display text-sm font-bold text-lilac-deep"
        >
          Registrar peso
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white p-3.5 shadow-card">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconChip tone="lilac" icon={<ScalesIcon size={18} weight="fill" />} className="size-7" />
          <h2 className="font-display text-base font-bold text-ink">Peso</h2>
        </div>
        {weights.length > 1 ? (
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-label={p.full}
                aria-pressed={p.value === period}
                onClick={() => onPeriodChange(p.value)}
                className={cn(
                  "rounded-full px-2 py-1.5 text-xs font-extrabold",
                  p.value === period
                    ? "bg-lilac text-white"
                    : "bg-lilac-tint-soft text-ink-faint",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : (
          addButton
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold text-ink">{formatKg(latest.grams)}</span>
          <span className="font-display text-sm font-bold text-ink-soft">kg</span>
          {delta ? <DeltaLabel delta={delta} /> : null}
        </div>
        {weights.length > 1 ? addButton : null}
      </div>

      {/* Um ponto só não é gráfico: diz o que falta em vez de desenhar uma linha reta. */}
      {weights.length === 1 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          registrado em {dayLabel(latest.day)} · a tendência aparece no segundo registro
        </p>
      ) : points.length === 0 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          nenhuma pesagem nesse período · última em {dayLabel(latest.day)}
        </p>
      ) : points.length === 1 ? (
        <p className="mt-2 text-xs font-semibold text-ink-faint">
          uma pesagem nesse período · escolha um período maior pra ver a tendência
        </p>
      ) : (
        <div className="mt-1.5">
          <PesoChart points={points} />
        </div>
      )}

      {weights.length > 1 ? (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-faint">
            {weights.length} registros
          </span>
          <button
            type="button"
            onClick={onHistory}
            className="text-xs font-bold text-lilac-deep"
          >
            Ver todos ›
          </button>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `bun check-types`
Expected: PASS

---

### Task 9: `usePeso`, histórico e integração na tela

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/usePeso.ts`
- Create: `apps/web/src/app/(app)/saude/components/PesoHistorySheet.tsx`
- Modify: `apps/web/src/app/(app)/saude/page.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 3, 4, 7 e 8
- Produces: `usePeso()` → `{ weights, loading, period, setPeriod, lastGrams, create, update, remove }`

- [ ] **Step 1: Criar o hook**

Criar `apps/web/src/app/(app)/saude/hooks/usePeso.ts`:

```tsx
"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import type { WeightLog } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import type { Period } from "./peso-helpers";

type ListResponse = { weights: WeightLog[] };

export type WeightInput = { grams: number; day: string };

export function usePeso() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/weights"), []),
  );
  const [period, setPeriod] = useState<Period>("3m");

  const weights = list.data?.weights ?? [];

  const create = useCallback(
    async (input: WeightInput) => {
      try {
        await api.post<{ weight: WeightLog }>("/api/weights", input);
        // Refetch: o upsert pode ter substituído um registro existente do dia,
        // então não dá pra inserir na lista local sem reconciliar.
        list.setData(await api.get<ListResponse>("/api/weights"));
      } catch (e) {
        toastError(e, "Não foi possível registrar o peso");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: WeightInput) => {
      const prev = list.data;
      list.setData((d) =>
        d
          ? {
              weights: d.weights
                .map((w) => (w.id === id ? { ...w, ...input } : w))
                .sort((a, b) => b.day.localeCompare(a.day)),
            }
          : d,
      );
      try {
        await api.patch<{ weight: WeightLog }>(`/api/weights/${id}`, input);
      } catch (e) {
        list.setData(prev ?? null);
        toastError(e, "Não foi possível salvar o peso");
      }
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData((d) => (d ? { weights: d.weights.filter((w) => w.id !== id) } : d));
      try {
        await api.del(`/api/weights/${id}`);
      } catch (e) {
        list.setData(prev ?? null);
        toastError(e, "Não foi possível excluir o registro");
      }
    },
    [list],
  );

  return {
    weights,
    loading: list.loading,
    period,
    setPeriod,
    lastGrams: weights[0]?.grams,
    create,
    update,
    remove,
  };
}
```

- [ ] **Step 2: Criar o sheet de histórico**

Criar `apps/web/src/app/(app)/saude/components/PesoHistorySheet.tsx`:

```tsx
"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { SwipeableRow } from "@/components/swipeable-row";
import type { WeightLog } from "@/lib/api-types";

import { dayLabel, deltaBetween, formatKg, groupByMonth } from "../hooks/peso-helpers";
import { DeltaLabel } from "./PesoSection";

export function PesoHistorySheet({
  open,
  onOpenChange,
  weights,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weights: WeightLog[]; // desc
  onEdit: (weight: WeightLog) => void;
  onDelete: (id: string) => void;
}) {
  const groups = groupByMonth(weights);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Histórico de peso"
      tone="lilac"
      icon={<ClockCounterClockwiseIcon size={22} weight="fill" />}
    >
      {groups.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nada por aqui ainda.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wide text-ink-faint uppercase">
                {group.label}
              </span>
              {group.balance ? <DeltaLabel delta={group.balance} /> : null}
            </div>
            {group.items.map((item) => {
              // Variação sempre contra a pesagem imediatamente anterior — inclusive
              // quando ela está no mês passado, por isso o índice vem da lista inteira.
              const index = weights.findIndex((w) => w.id === item.id);
              const delta = deltaBetween(item.grams, weights[index + 1]?.grams);
              return (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item.id)}
                >
                  <div className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm">
                    <span className="text-sm font-bold text-ink">{dayLabel(item.day)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-sm font-bold text-ink">
                        {formatKg(item.grams)} kg
                      </span>
                      {delta ? <DeltaLabel delta={delta} /> : null}
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        ))
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Montar na tela Saúde**

Em `apps/web/src/app/(app)/saude/page.tsx`:

1. Adicionar aos imports de componentes (mantendo a ordem alfabética do bloco):

```tsx
import { PesoHistorySheet } from "./components/PesoHistorySheet";
import { PesoModal } from "./components/PesoModal";
import { PesoSection } from "./components/PesoSection";
```

2. Adicionar ao bloco de imports de hooks:

```tsx
import { usePeso } from "./hooks/usePeso";
```

3. Dentro do componente, junto das outras chamadas de hook:

```tsx
  const peso = usePeso();
```

4. Junto dos outros `useState` de modais:

```tsx
  // Modal de peso (undefined = registrar; objeto = editar) e sheet de histórico.
  const [pesoModal, setPesoModal] = useState<{ open: boolean; initial?: WeightLog }>({
    open: false,
  });
  const [pesoHistory, setPesoHistory] = useState(false);
```

5. Adicionar `WeightLog` ao import de tipos que já existe no topo:

```tsx
import type { Appointment, Exam, Medication, WeightLog } from "@/lib/api-types";
```

6. No JSX, **depois** de `<AgendaRemediosSection ... />` e antes dos modais:

```tsx
      <PesoSection
        weights={peso.weights}
        period={peso.period}
        onPeriodChange={peso.setPeriod}
        onAdd={() => setPesoModal({ open: true })}
        onHistory={() => setPesoHistory(true)}
      />
```

7. Junto dos outros modais/sheets, antes do `LoadingOverlay`:

```tsx
      <PesoModal
        open={pesoModal.open}
        onOpenChange={(open) => setPesoModal((s) => ({ ...s, open }))}
        initial={pesoModal.initial}
        lastGrams={peso.lastGrams}
        onSubmit={(input) =>
          pesoModal.initial ? peso.update(pesoModal.initial.id, input) : peso.create(input)
        }
      />

      <PesoHistorySheet
        open={pesoHistory}
        onOpenChange={setPesoHistory}
        weights={peso.weights}
        onEdit={(w) => {
          setPesoHistory(false);
          setPesoModal({ open: true, initial: w });
        }}
        onDelete={peso.remove}
      />
```

- [ ] **Step 4: Typecheck e testes**

Run (da raiz): `bun check-types`
Expected: PASS

Run (de `apps/web`): `bun test`
Expected: PASS — suíte inteira, sem regressão

- [ ] **Step 5: Verificação manual do fluxo completo**

Run: `bun dev:web` e abrir a aba **Saúde**. Percorrer, nesta ordem:

1. **Vazio** — card "Peso" mostra "Nenhum peso registrado" + botão. Sem gráfico, sem chips.
2. **Primeiro registro** — tocar em "Registrar peso": o sheet abre pedindo o número (não chuta valor). Informar 64,2 e salvar. Card passa a mostrar `64,2 kg` e "a tendência aparece no segundo registro".
3. **Segundo registro** — "+" → o stepper **já vem com 64,2** (último peso). Tocar no número, digitar `65`, confirmar. Mudar a data para ontem no calendário. Salvar → gráfico aparece, chips de período aparecem, variação mostrada em **lilás/tinta neutra** (nunca verde ou rosa).
4. **Substituição no mesmo dia** — registrar de novo com a data de hoje: a contagem de registros **não** aumenta; o valor de hoje muda.
5. **Tooltip** — tocar/arrastar sobre o gráfico mostra "65,0 kg" e a data por extenso.
6. **Períodos** — alternar 30d / 3m / 1a. Com dois registros recentes, os três períodos mostram a linha. Para ver os textos de borda, registrar uma data antiga (ex.: 6 meses atrás) e excluir as recentes: "30d" deve dizer "nenhuma pesagem nesse período · última em …", e um período com exatamente uma pesagem deve dizer "uma pesagem nesse período · escolha um período maior…".
7. **Histórico** — "Ver todos ›" abre o sheet agrupado por mês, com o saldo do mês ao lado do nome. Swipe numa linha revela editar/excluir. Editar reabre o sheet preenchido; excluir remove e o card atualiza.
8. **Conflito** — editar um registro antigo e mover a data para um dia que já tem peso: aparece o toast coral "já existe peso registrado nessa data" e a lista volta ao estado anterior (rollback), sem perder o outro registro.

---

### Task 10: Glossário do domínio

**Files:**
- Modify: `apps/web/CONTEXT.md`

**Interfaces:**
- Consumes: nada
- Produces: termos "Pesagem" e "Variação" no glossário

- [ ] **Step 1: Adicionar a subseção**

Em `apps/web/CONTEXT.md`, ao fim da seção `### Corpo` (depois do verbete **Estoque**), adicionar:

```markdown
### Peso

**Pesagem**:
O registro de peso de um dia, em gramas. Uma por dia — registrar de novo no mesmo dia substitui
o valor. Vive na aba Saúde; não é ritual do dia e nunca gera pendência.
_Avoid_: medição, peso corporal

**Variação**:
A diferença entre uma pesagem e a anterior. Sempre exibida em tinta neutra — a seta dá a direção,
a cor nunca julga. Subir não é falha, descer não é conquista.
_Avoid_: ganho, perda, progresso
```

- [ ] **Step 2: Conferir a renderização**

Abrir `apps/web/CONTEXT.md` e confirmar que o formato bate com os verbetes vizinhos (nome em negrito, dois-pontos, descrição, `_Avoid_`).

---

## Entrega

Ao terminar as 10 tasks, **não commite**. Rode a verificação final e reporte:

```bash
bun check-types          # da raiz
cd apps/web && bun test  # suíte inteira
git status --short       # deve listar as mudanças não-commitadas
```

Arquivos esperados no `git status`: schema + migration nova, `weight.ts` + teste, duas rotas,
`api-types.ts`, `peso-helpers.ts` + teste, `chart.tsx` + `globals.css` + dois `package.json`,
`stepper.tsx`, quatro componentes `Peso*`, `usePeso.ts`, `page.tsx` da Saúde e `CONTEXT.md`.
