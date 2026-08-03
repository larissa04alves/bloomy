# Ajuste de exercícios na sessão ativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir trocar, adicionar e remover exercícios na sessão de treino em andamento sem alterar o template do treino, oferecendo "salvar no treino" só na conclusão.

**Architecture:** A lista de exercícios deixa de ser lida do template (`exercise`) e passa a viver numa tabela nova, `session_exercise`, materializada no início da sessão. As séries (`set_log`) apontam para essa linha por `session_exercise_id`. A lógica de sessão sai de `server/workout/service.ts` para `server/workout/session.ts`; o template só muda por `applySessionToWorkout`, chamado a partir da tela de fim.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + libsql/Turso, React 19, Tailwind 4, Bun test, zod.

**Spec:** `docs/superpowers/specs/2026-07-28-ajuste-exercicios-sessao-design.md` · Issue #8 · PR #16 (branch `feat/8-ajuste-exercicios-sessao`)

## Global Constraints

- **Nunca commitar.** A dona do repo faz os commits e revisa antes. Cada task termina com o
  working tree sujo e `bun check-types` verde — nenhum `git commit`, `git push` ou `gh pr`.
- Rodar tudo da raiz com bun: `bun check-types`, `bun db:generate`, `bun db:migrate`.
  Testes rodam de `apps/web`: `cd apps/web && bun test`.
- **Read antes de Edit.** `cat`/`sed`/`head` não contam para o harness. Se um Edit falhar com
  `string not found`, re-Read o arquivo antes de tentar de novo — nunca editar de memória.
- Migrations sempre por `bun db:generate` + `bun db:migrate`. Nunca `drizzle-kit push`.
- Código, identificadores e nomes de arquivo em EN; texto de tela em PT.
- Telas (`.tsx`) só renderizam — lógica em hooks (`apps/web/CLAUDE.md`).
- Erros de API: `{ error: string }` com 400/401/404/409, via helpers de `server/shared/api.ts`.
- Tamanho de fonte só na escala nomeada do Tailwind (`text-xs`, `text-sm`, `text-base`, …).
  Nunca `text-[13px]`. Não existe `text-md`.
- Não confiar em `ON DELETE CASCADE` do SQLite: o enforcement de foreign key não é garantido
  no libsql. Deletar as filhas (`set_log`) explicitamente na mesma transação.

## File Structure

| Arquivo | Responsabilidade |
| --- | --- |
| `packages/db/src/schema/workout.ts` | **Modificar** — nova `sessionExercise`, `setLog.sessionExerciseId` |
| `packages/db/src/migrations/*.sql` | **Criar** (gerado) — DDL + backfill |
| `apps/web/src/server/workout/session.ts` | **Criar** — todo o ciclo de sessão (start, read, sets, ajustes, complete, apply) |
| `apps/web/src/server/workout/service.ts` | **Modificar** — fica só com template + resumo |
| `apps/web/src/server/workout/session.test.ts` | **Criar** — testes de sessão e ajustes |
| `apps/web/src/server/workout/service.test.ts` | **Modificar** — remove os testes de sessão |
| `apps/web/src/app/api/sessions/[id]/exercises/route.ts` | **Criar** — POST (adicionar) |
| `apps/web/src/app/api/sessions/[id]/exercises/[sessionExerciseId]/route.ts` | **Criar** — PUT (trocar) / DELETE (remover) |
| `apps/web/src/app/api/sessions/[id]/apply-to-workout/route.ts` | **Criar** — POST (salvar no treino) |
| `apps/web/src/app/api/sessions/active/route.ts`, `[id]/complete/route.ts`, `[id]/sets/[setId]/route.ts`, `workouts/[id]/sessions/route.ts` | **Modificar** — import passa a vir de `session.ts` |
| `apps/web/src/lib/api-types.ts` | **Modificar** — `SessionExercise.id`/`origin`, `SessionAdjustments` |
| `apps/web/src/app/(app)/treino/hooks/useSessao.ts` | **Modificar** — mutações de ajuste + estado `adjust` |
| `apps/web/src/components/swipeable-row.tsx` | **Modificar** — `editIcon`/`editLabel` opcionais |
| `apps/web/src/app/(app)/treino/components/ExercicioList.tsx` | **Modificar** — swipe, botão adicionar, badge |
| `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx` | **Modificar** — busca e confirmação de troca |
| `apps/web/src/app/(app)/treino/components/BuscaExercicio.tsx` | **Modificar** — `onCustom` opcional |
| `apps/web/src/app/(app)/treino/components/SessaoFim.tsx` | **Modificar** — bloco "salvar no treino" |

---

### Task 1: Schema e migration com backfill

**Files:**
- Modify: `packages/db/src/schema/workout.ts`
- Create: `packages/db/src/migrations/<gerado>.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tabela `sessionExercise` e tipo `SessionExerciseRow` (`typeof sessionExercise.$inferSelect`);
  coluna `setLog.sessionExerciseId` (`string | null`).
  **O tipo do schema chama-se `SessionExerciseRow`, não `SessionExercise`** — esse nome já é usado
  pelo tipo de leitura do serviço (Task 2) e pelo client.

- [ ] **Step 1: Declarar `sessionExercise` em `workout.ts`**

Inserir **depois** do bloco `workoutSession` e **antes** de `setLog` — `setLog` vai referenciar
`sessionExercise`, então a ordem de declaração importa.

```ts
export const sessionExercise = sqliteTable(
  "session_exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => workoutSession.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // origem no template; null = exercício que só existe nesta sessão
    exerciseId: text("exercise_id").references(() => exercise.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    targetSets: integer("target_sets").notNull(),
    targetReps: integer("target_reps").notNull().default(12),
    restSeconds: integer("rest_seconds").notNull().default(45),
    position: integer("position").notNull(),
    catalogId: text("catalog_id").references(() => exerciseCatalog.id, {
      onDelete: "set null",
    }),
    muscleGroup: text("muscle_group").$type<
      | "chest"
      | "back"
      | "legs"
      | "shoulders"
      | "glutes"
      | "arms"
      | "abs"
      | "cardio"
    >(),
    origin: text("origin")
      .$type<"template" | "added" | "replaced">()
      .default("template")
      .notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [index("session_exercise_session_idx").on(table.sessionId)],
);
```

- [ ] **Step 2: Adicionar `sessionExerciseId` em `setLog`**

Dentro do objeto de colunas de `setLog`, logo depois de `exerciseId`:

```ts
    sessionExerciseId: text("session_exercise_id").references(
      () => sessionExercise.id,
      { onDelete: "cascade" },
    ),
```

- [ ] **Step 3: Exportar o tipo**

No fim de `workout.ts`, junto dos outros `export type`:

```ts
export type SessionExerciseRow = typeof sessionExercise.$inferSelect;
```

- [ ] **Step 4: Gerar a migration**

Run: `bun db:generate`
Expected: um `.sql` novo em `packages/db/src/migrations/` com `CREATE TABLE session_exercise`,
o `CREATE INDEX` e um `ALTER TABLE set_log ADD session_exercise_id`.

- [ ] **Step 5: Acrescentar o backfill ao SQL gerado**

Abrir o `.sql` gerado e **adicionar ao fim** (mantendo o que o drizzle escreveu). Sem isso, as
sessões já gravadas passam a aparecer sem exercícios — a leitura não consulta mais o template.

```sql
--> statement-breakpoint
INSERT INTO `session_exercise` (
  `id`, `session_id`, `user_id`, `exercise_id`, `name`,
  `target_sets`, `target_reps`, `rest_seconds`, `position`,
  `catalog_id`, `muscle_group`, `origin`, `created_at`
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4'
    || substr(lower(hex(randomblob(2))), 2) || '-'
    || substr('89ab', abs(random()) % 4 + 1, 1)
    || substr(lower(hex(randomblob(2))), 2) || '-'
    || lower(hex(randomblob(6))),
  ws.`id`, ws.`user_id`, e.`id`, e.`name`,
  e.`target_sets`, e.`target_reps`, e.`rest_seconds`, e.`position`,
  e.`catalog_id`, e.`muscle_group`, 'template',
  cast(unixepoch('subsecond') * 1000 as integer)
FROM `workout_session` ws
JOIN `exercise` e ON e.`workout_id` = ws.`workout_id`;
--> statement-breakpoint
UPDATE `set_log` SET `session_exercise_id` = (
  SELECT se.`id` FROM `session_exercise` se
  WHERE se.`session_id` = `set_log`.`session_id`
    AND se.`exercise_id` = `set_log`.`exercise_id`
)
WHERE `exercise_id` IS NOT NULL;
```

- [ ] **Step 6: Escrever o teste de smoke da migration**

Criar `apps/web/src/server/workout/session.test.ts` com este conteúdo inicial (as suítes de
comportamento entram nas tasks seguintes):

```ts
import { describe, expect, test } from "bun:test";

import { sessionExercise } from "@bloomy/db/schema/workout";
import { createTestDb, createTestUser } from "@/server/shared/test-db";

describe("migration session_exercise", () => {
  test("tabela existe e aceita insert após migrate", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    // sem FK de sessão real: só verifica que a migration criou a estrutura
    const rows = await db.select().from(sessionExercise);
    expect(rows).toEqual([]);
    expect(userId).toBe("user-test");
  });
});
```

- [ ] **Step 7: Rodar o teste**

Run: `cd apps/web && bun test src/server/workout/session.test.ts`
Expected: PASS. Se falhar com `no such table: session_exercise`, a migration não foi gerada
ou o `.sql` não está na pasta que `createTestDb` aponta (`packages/db/src/migrations`).

- [ ] **Step 8: Aplicar no banco local e conferir o backfill**

Run: `bun db:migrate`
Depois, verificar que o backfill ligou as séries existentes:

```bash
bun db:studio
```

Expected: se havia sessões no banco local, `session_exercise` tem uma linha por exercício de
cada sessão e nenhum `set_log` com `exercise_id` preenchido e `session_exercise_id` nulo.
Banco vazio é resultado válido — só registre isso.

- [ ] **Step 9: Typecheck**

Run: `bun check-types`
Expected: sem erros. **Não commitar.**

---

### Task 2: Extrair `session.ts` e ler a lista do snapshot

**Files:**
- Create: `apps/web/src/server/workout/session.ts`
- Modify: `apps/web/src/server/workout/service.ts`
- Modify: `apps/web/src/server/workout/service.test.ts`
- Modify: `apps/web/src/server/workout/session.test.ts`
- Modify: `apps/web/src/app/api/sessions/active/route.ts`
- Modify: `apps/web/src/app/api/sessions/[id]/complete/route.ts`
- Modify: `apps/web/src/app/api/sessions/[id]/sets/[setId]/route.ts`
- Modify: `apps/web/src/app/api/workouts/[id]/sessions/route.ts`

**Interfaces:**
- Consumes: `sessionExercise`, `SessionExerciseRow`, `setLog.sessionExerciseId` (Task 1).
- Produces, de `server/workout/session.ts`:
  - `type SessionExercise = { id: string; exerciseId: string | null; name: string; targetSets: number; restSeconds: number; position: number; catalogId: string | null; origin: "template" | "added" | "replaced"; sets: SetLog[]; lastPerformance: { reps: number | null; load: number | null } | null }`
  - `type SessionDetail = { session: WorkoutSession; exercises: SessionExercise[] }`
  - `lastPerformance(db, userId, exerciseName)`, `startSession(db, userId, workoutId)`,
    `getActiveSession(db, userId)`, `updateSet(db, userId, sessionId, setId, input)`,
    `completeSession(db, userId, sessionId)`
  - **`SessionExercise.exerciseId` passa a ser nullable e ganha `id`.** O front usa
    `key={ex.exerciseId}` hoje — muda para `key={ex.id}` na Task 7.

- [ ] **Step 1: Escrever o teste do snapshot**

Em `session.test.ts`, adicionar a suíte (mantendo a de migration):

```ts
import {
  completeSession,
  getActiveSession,
  startSession,
  updateSet,
} from "./session";
import { createWorkout } from "./service";

describe("startSession com snapshot", () => {
  test("materializa session_exercise e liga as séries a ele", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 8, restSeconds: 90, position: 0 },
      ],
    });

    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    const rows = await db.select().from(sessionExercise);
    expect(rows).toHaveLength(1);
    expect(rows[0].origin).toBe("template");
    expect(rows[0].exerciseId).toBe(w.exercises[0].id);

    const ex = s.exercises[0];
    expect(ex.id).toBe(rows[0].id);
    expect(ex.origin).toBe("template");
    expect(ex.sets).toHaveLength(2);
    expect(ex.sets.every((set) => set.sessionExerciseId === rows[0].id)).toBe(true);
  });

  test("editar o template não muda a lista de uma sessão já iniciada", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    await updateWorkout(db, userId, w.id, {
      exercises: [
        { name: "Puxada", targetSets: 3, targetReps: 10, restSeconds: 60, position: 0 },
      ],
    });

    const active = await getActiveSession(db, userId);
    expect(active!.exercises).toHaveLength(1);
    expect(active!.exercises[0].name).toBe("Remada");
  });
});
```

Acrescentar `updateWorkout` ao import de `./service`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/web && bun test src/server/workout/session.test.ts`
Expected: FAIL — `Cannot find module './session'`.

- [ ] **Step 3: Criar `session.ts` movendo o ciclo de sessão**

Criar `apps/web/src/server/workout/session.ts` e **mover para lá** (recortando de `service.ts`):
`SessionExercise`, `SessionDetail`, `PerfCache`, `lastPerformance`, `buildSessionDetail`,
`startSession`, `getActiveSession`, `updateSet`, `completeSession`.

Cabeçalho:

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import {
  exercise,
  sessionExercise,
  setLog,
  workout,
  workoutSession,
  type SessionExerciseRow,
  type SetLog,
  type WorkoutSession,
} from "@bloomy/db/schema/workout";
import { and, asc, count, desc, eq, isNotNull, isNull, max } from "drizzle-orm";

import { dayFor } from "@/server/shared/day";

import { workoutSummary } from "./service";
```

O tipo de leitura ganha `id` e `origin`, e `exerciseId` passa a ser nullable:

```ts
export type SessionExercise = {
  id: string; // linha de session_exercise (é por aqui que a UI age)
  exerciseId: string | null; // origem no template; null = só desta sessão
  name: string;
  targetSets: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  origin: "template" | "added" | "replaced";
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: WorkoutSession;
  exercises: SessionExercise[];
};
```

- [ ] **Step 4: Reescrever `buildSessionDetail` para ler do snapshot**

```ts
type PerfCache = Map<string, { reps: number | null; load: number | null } | null>;

async function buildSessionDetail(
  db: Db,
  session: WorkoutSession,
  userId: string,
  perfByName?: PerfCache,
  preRows?: SessionExerciseRow[],
): Promise<SessionDetail> {
  // reusa as linhas já inseridas (startSession) ou busca — evita um round-trip
  const rows =
    preRows ??
    (await db
      .select()
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id))
      .orderBy(asc(sessionExercise.position)));

  const sets = await db
    .select()
    .from(setLog)
    .where(eq(setLog.sessionId, session.id))
    .orderBy(asc(setLog.setIndex));

  const detail = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      exerciseId: row.exerciseId,
      name: row.name,
      targetSets: row.targetSets,
      restSeconds: row.restSeconds,
      position: row.position,
      catalogId: row.catalogId,
      origin: row.origin,
      sets: sets.filter((s) => s.sessionExerciseId === row.id),
      lastPerformance: perfByName?.has(row.name)
        ? (perfByName.get(row.name) ?? null)
        : await lastPerformance(db, userId, row.name),
    })),
  );
  return { session, exercises: detail };
}
```

- [ ] **Step 5: Reescrever a transação de `startSession`**

Substituir o bloco `const session = await db.transaction(...)` (o que insere `workoutSession` e
as séries) por este, que insere o snapshot primeiro e liga as séries a ele. O trecho anterior —
busca do `workout`, dos `exercise` e o pré-cálculo de `perfByName` — fica igual.

```ts
  const { session, rows } = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(workoutSession)
      .values({ userId, workoutId, day: dayFor() })
      .returning();

    // snapshot do template: a lista do dia passa a pertencer à sessão
    const rows = exercises.length
      ? await tx
          .insert(sessionExercise)
          .values(
            exercises.map((ex) => ({
              sessionId: s.id,
              userId,
              exerciseId: ex.id,
              name: ex.name,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              restSeconds: ex.restSeconds,
              position: ex.position,
              catalogId: ex.catalogId,
              muscleGroup: ex.muscleGroup,
              origin: "template" as const,
            })),
          )
          .returning()
      : [];

    // um único insert com todas as séries de todos os exercícios
    const setRows = rows.flatMap((row) => {
      const last = perfByName.get(row.name) ?? null;
      return Array.from({ length: row.targetSets }, (_, i) => ({
        sessionId: s.id,
        sessionExerciseId: row.id,
        exerciseId: row.exerciseId,
        userId,
        exerciseName: row.name,
        setIndex: i + 1,
        reps: last?.reps ?? row.targetReps, // sem histórico → reps-alvo do template
        load: last?.load ?? null,
        done: false,
      }));
    });
    if (setRows.length) await tx.insert(setLog).values(setRows);
    return { session: s, rows };
  });

  return buildSessionDetail(db, session, userId, perfByName, rows);
```

- [ ] **Step 6: Corrigir a contagem de exercícios em `completeSession`**

Hoje conta `exercise` do template, o que fica errado com qualquer ajuste. Trocar o primeiro
item do `Promise.all`:

```ts
  const [exCount, summary] = await Promise.all([
    db
      .select({ n: count() })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id)),
    workoutSummary(db, userId, completedAt),
  ]);
```

- [ ] **Step 7: Limpar `service.ts`**

Remover de `service.ts` tudo que foi movido, junto dos imports que ficaram sem uso
(`setLog`, `workoutSession`, `desc`, `isNull`, `isNotNull` só se de fato não sobrarem usos —
`isNotNull` continua em `workoutSummary`, `dayFor` também). `service.ts` fica com:
`Focus`, `ExerciseInput`, `WorkoutInput`, `WorkoutWithExercises`, `listWorkouts`,
`createWorkout`, `updateWorkout`, `deactivateWorkout`, `mondayOf`, `addDaysStr`,
`summarizeWorkouts`, `weekTargetFor`, `workoutSummary`.

- [ ] **Step 8: Atualizar os imports das rotas**

Nas quatro rotas, trocar `from "@/server/workout/service"` por `from "@/server/workout/session"`
apenas para os símbolos que se moveram:

- `api/sessions/active/route.ts` → `getActiveSession`
- `api/sessions/[id]/complete/route.ts` → `completeSession`
- `api/sessions/[id]/sets/[setId]/route.ts` → `updateSet`
- `api/workouts/[id]/sessions/route.ts` → `startSession`

- [ ] **Step 9: Mover os testes de sessão de `service.test.ts`**

Recortar de `service.test.ts` o `describe("startSession / completeSession (db em arquivo)")`
inteiro e colar em `session.test.ts`, ajustando o import: `startSession`, `getActiveSession`,
`updateSet`, `completeSession` vêm de `./session`; `createWorkout` continua vindo de
`./service`. Em `service.test.ts` fica só `summarizeWorkouts` — remover os imports órfãos.

- [ ] **Step 10: Rodar a suíte de treino**

Run: `cd apps/web && bun test src/server/workout/`
Expected: PASS em `session.test.ts`, `service.test.ts` e `catalog.test.ts`.

- [ ] **Step 11: Typecheck**

Run: `bun check-types`
Expected: sem erros. **Não commitar.**

---

### Task 3: Adicionar, trocar e remover na sessão

**Files:**
- Modify: `apps/web/src/server/workout/session.ts`
- Modify: `apps/web/src/server/workout/session.test.ts`

**Interfaces:**
- Consumes: `SessionDetail`, `buildSessionDetail`, `lastPerformance` (Task 2).
- Produces:
  - `type SessionExerciseInput = { name: string; targetSets: number; targetReps: number; restSeconds: number; catalogId?: string | null; muscleGroup?: Focus | null }`
  - `addSessionExercise(db, userId, sessionId, input): Promise<SessionDetail | null>`
  - `swapSessionExercise(db, userId, sessionId, sessionExerciseId, input): Promise<{ session: SessionDetail; discardedDoneSets: number } | null>`
  - `removeSessionExercise(db, userId, sessionId, sessionExerciseId): Promise<SessionDetail | null>`
  - `null` significa 404 (sessão inexistente, já concluída, de outro usuário, ou linha inexistente).

- [ ] **Step 1: Escrever os testes**

Adicionar a `session.test.ts`:

```ts
describe("ajustes na sessão ativa", () => {
  async function setup() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    return { db, userId, w, s };
  }

  const CRUCIFIXO = {
    name: "Crucifixo",
    targetSets: 3,
    targetReps: 12,
    restSeconds: 45,
    catalogId: "0025",
  };

  test("adicionar entra no fim da lista com as séries criadas", async () => {
    const { db, userId, s } = await setup();

    const detail = await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);
    expect(detail!.exercises).toHaveLength(2);

    const added = detail!.exercises[1];
    expect(added.name).toBe("Crucifixo");
    expect(added.origin).toBe("added");
    expect(added.exerciseId).toBeNull();
    expect(added.position).toBe(1);
    expect(added.sets).toHaveLength(3);
    expect(added.sets[0].reps).toBe(12); // sem histórico → reps-alvo
  });

  test("trocar preserva a posição, marca replaced e descarta as séries", async () => {
    const { db, userId, s } = await setup();
    const original = s.exercises[0];
    await updateSet(db, userId, s.session.id, original.sets[0].id, {
      reps: 10,
      load: 30,
      done: true,
    });

    const result = await swapSessionExercise(
      db,
      userId,
      s.session.id,
      original.id,
      CRUCIFIXO,
    );
    expect(result!.discardedDoneSets).toBe(1);

    const swapped = result!.session.exercises[0];
    expect(result!.session.exercises).toHaveLength(1);
    expect(swapped.id).toBe(original.id); // mesma linha, mesmo slot
    expect(swapped.position).toBe(0);
    expect(swapped.name).toBe("Crucifixo");
    expect(swapped.origin).toBe("replaced");
    expect(swapped.sets).toHaveLength(3);
    expect(swapped.sets.every((set) => !set.done)).toBe(true);
  });

  test("trocar mantém o vínculo com o exercício do template", async () => {
    const { db, userId, w, s } = await setup();
    await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, CRUCIFIXO);

    const [row] = await db.select().from(sessionExercise);
    expect(row.exerciseId).toBe(w.exercises[0].id);
  });

  test("remover apaga a linha e as séries dela", async () => {
    const { db, userId, s } = await setup();

    const detail = await removeSessionExercise(db, userId, s.session.id, s.exercises[0].id);
    expect(detail!.exercises).toHaveLength(0);
    expect(await db.select().from(setLog)).toHaveLength(0);
  });

  test("ajustes não tocam no template: a próxima sessão nasce com a lista original", async () => {
    const { db, userId, w, s } = await setup();
    await addSessionExercise(db, userId, s.session.id, CRUCIFIXO);
    await completeSession(db, userId, s.session.id);

    const next = await startSession(db, userId, w.id);
    if (next === "already_active" || next === "not_found") throw new Error("unreachable");
    expect(next.exercises).toHaveLength(1);
    expect(next.exercises[0].name).toBe("Supino");
  });

  test("sessão concluída não aceita ajuste", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);
    expect(await addSessionExercise(db, userId, s.session.id, CRUCIFIXO)).toBeNull();
  });
});
```

Acrescentar `setLog` ao import de `@bloomy/db/schema/workout` e
`addSessionExercise`, `removeSessionExercise`, `swapSessionExercise` ao import de `./session`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/web && bun test src/server/workout/session.test.ts`
Expected: FAIL — `addSessionExercise is not a function` (ou erro de import).

- [ ] **Step 3: Implementar o guard e o input**

Em `session.ts`:

```ts
export type SessionExerciseInput = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  catalogId?: string | null;
  muscleGroup?: SessionExerciseRow["muscleGroup"];
};

/** Sessão em andamento do usuário, por id. Null = 404 (inexistente, alheia ou concluída). */
async function activeSessionById(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<WorkoutSession | null> {
  const [s] = await db
    .select()
    .from(workoutSession)
    .where(
      and(
        eq(workoutSession.id, sessionId),
        eq(workoutSession.userId, userId),
        isNull(workoutSession.completedAt),
      ),
    );
  return s ?? null;
}

/** Séries de um exercício da sessão, pré-preenchidas com o último desempenho do nome. */
function buildSetRows(
  sessionId: string,
  userId: string,
  row: { id: string; name: string; targetSets: number; targetReps: number },
  last: { reps: number | null; load: number | null } | null,
) {
  return Array.from({ length: row.targetSets }, (_, i) => ({
    sessionId,
    sessionExerciseId: row.id,
    exerciseId: null,
    userId,
    exerciseName: row.name,
    setIndex: i + 1,
    reps: last?.reps ?? row.targetReps,
    load: last?.load ?? null,
    done: false,
  }));
}
```

- [ ] **Step 4: Implementar `addSessionExercise`**

```ts
export async function addSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  input: SessionExerciseInput,
): Promise<SessionDetail | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const [last, [{ maxPosition }]] = await Promise.all([
    lastPerformance(db, userId, input.name),
    db
      .select({ maxPosition: max(sessionExercise.position) })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, sessionId)),
  ]);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sessionExercise)
      .values({
        sessionId,
        userId,
        exerciseId: null, // não existe no template
        name: input.name,
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        restSeconds: input.restSeconds,
        position: (maxPosition ?? -1) + 1,
        catalogId: input.catalogId ?? null,
        muscleGroup: input.catalogId ? null : (input.muscleGroup ?? null),
        origin: "added",
      })
      .returning();
    await tx.insert(setLog).values(buildSetRows(sessionId, userId, row, last));
  });

  return buildSessionDetail(db, session, userId);
}
```

- [ ] **Step 5: Implementar `swapSessionExercise`**

```ts
export async function swapSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
  input: SessionExerciseInput,
): Promise<{ session: SessionDetail; discardedDoneSets: number } | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const [current] = await db
    .select()
    .from(sessionExercise)
    .where(
      and(
        eq(sessionExercise.id, sessionExerciseId),
        eq(sessionExercise.sessionId, sessionId),
        eq(sessionExercise.userId, userId),
      ),
    );
  if (!current) return null;

  const [last, [{ n: discardedDoneSets }]] = await Promise.all([
    lastPerformance(db, userId, input.name),
    db
      .select({ n: count() })
      .from(setLog)
      .where(and(eq(setLog.sessionExerciseId, sessionExerciseId), eq(setLog.done, true))),
  ]);

  await db.transaction(async (tx) => {
    // delete explícito: o enforcement de FK não é garantido no libsql
    await tx.delete(setLog).where(eq(setLog.sessionExerciseId, sessionExerciseId));
    // exerciseId permanece: é o slot do template, e é ele que o "salvar no treino" atualiza
    await tx
      .update(sessionExercise)
      .set({
        name: input.name,
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        restSeconds: input.restSeconds,
        catalogId: input.catalogId ?? null,
        muscleGroup: input.catalogId ? null : (input.muscleGroup ?? null),
        origin: "replaced",
      })
      .where(eq(sessionExercise.id, sessionExerciseId));
    await tx.insert(setLog).values(
      buildSetRows(
        sessionId,
        userId,
        { ...input, id: sessionExerciseId },
        last,
      ),
    );
  });

  return { session: await buildSessionDetail(db, session, userId), discardedDoneSets };
}
```

- [ ] **Step 6: Implementar `removeSessionExercise`**

```ts
export async function removeSessionExercise(
  db: Db,
  userId: string,
  sessionId: string,
  sessionExerciseId: string,
): Promise<SessionDetail | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const removed = await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(sessionExercise)
      .where(
        and(
          eq(sessionExercise.id, sessionExerciseId),
          eq(sessionExercise.sessionId, sessionId),
          eq(sessionExercise.userId, userId),
        ),
      )
      .returning();
    if (deleted.length === 0) return false;
    // delete explícito: o enforcement de FK não é garantido no libsql
    await tx.delete(setLog).where(eq(setLog.sessionExerciseId, sessionExerciseId));
    return true;
  });
  if (!removed) return null;

  return buildSessionDetail(db, session, userId);
}
```

- [ ] **Step 7: Rodar os testes**

Run: `cd apps/web && bun test src/server/workout/session.test.ts`
Expected: PASS em todas as suítes.

- [ ] **Step 8: Typecheck**

Run: `bun check-types`
Expected: sem erros. **Não commitar.**

---

### Task 4: Contagem de ajustes e "salvar no treino"

**Files:**
- Modify: `apps/web/src/server/workout/session.ts`
- Modify: `apps/web/src/server/workout/session.test.ts`

**Interfaces:**
- Consumes: `activeSessionById`, `SessionDetail` (Tasks 2 e 3); `WorkoutWithExercises` de `./service`.
- Produces:
  - `type SessionAdjustments = { added: number; replaced: number; removed: number }`
  - `sessionAdjustments(db, session): Promise<SessionAdjustments>`
  - `applySessionToWorkout(db, userId, sessionId): Promise<WorkoutWithExercises | null>`
  - `completeSession` passa a retornar `adjustments: SessionAdjustments` junto de
    `completedAt`, `durationSec`, `exerciseCount`, `summary`.

- [ ] **Step 1: Escrever os testes**

Adicionar a `session.test.ts`:

```ts
describe("salvar no treino", () => {
  async function setupComAjustes() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Voador", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    // troca o Supino, remove o Voador, adiciona o Crucifixo
    await swapSessionExercise(db, userId, s.session.id, s.exercises[0].id, {
      name: "Supino inclinado",
      targetSets: 3,
      targetReps: 10,
      restSeconds: 60,
      catalogId: "0030",
    });
    await removeSessionExercise(db, userId, s.session.id, s.exercises[1].id);
    await addSessionExercise(db, userId, s.session.id, {
      name: "Crucifixo",
      targetSets: 3,
      targetReps: 12,
      restSeconds: 45,
      catalogId: "0025",
    });
    return { db, userId, w, sessionId: s.session.id };
  }

  test("completeSession conta os ajustes e os exercícios da sessão", async () => {
    const { db, userId, sessionId } = await setupComAjustes();

    const done = await completeSession(db, userId, sessionId);
    expect(done!.exerciseCount).toBe(2); // Supino inclinado + Crucifixo
    expect(done!.adjustments).toEqual({ added: 1, replaced: 1, removed: 1 });
  });

  test("sem ajuste, a contagem é zero", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Costas",
      focus: "back",
      exercises: [
        { name: "Remada", targetSets: 1, targetReps: 12, restSeconds: 45, position: 0 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");

    const done = await completeSession(db, userId, s.session.id);
    expect(done!.adjustments).toEqual({ added: 0, replaced: 0, removed: 0 });
  });

  test("applySessionToWorkout reflete troca, remoção e adição no template", async () => {
    const { db, userId, w, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const updated = await applySessionToWorkout(db, userId, sessionId);
    expect(updated!.exercises.map((e) => e.name)).toEqual([
      "Supino inclinado",
      "Crucifixo",
    ]);
    expect(updated!.exercises.map((e) => e.position)).toEqual([0, 1]);
    // o slot trocado reusa a linha original do template, não duplica
    expect(updated!.exercises[0].id).toBe(w.exercises[0].id);
    expect(updated!.exercises[0].targetSets).toBe(3);
  });

  test("applySessionToWorkout é idempotente", async () => {
    const { db, userId, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const first = await applySessionToWorkout(db, userId, sessionId);
    const second = await applySessionToWorkout(db, userId, sessionId);
    expect(second!.exercises.map((e) => e.name)).toEqual(
      first!.exercises.map((e) => e.name),
    );
    expect(second!.exercises).toHaveLength(2);
  });

  test("não aplicar deixa o template intacto", async () => {
    const { db, userId, w, sessionId } = await setupComAjustes();
    await completeSession(db, userId, sessionId);

    const [fresh] = (await listWorkouts(db, userId)).filter((x) => x.id === w.id);
    expect(fresh.exercises.map((e) => e.name)).toEqual(["Supino", "Voador"]);
  });
});
```

Acrescentar `applySessionToWorkout` e `sessionAdjustments` ao import de `./session`, e
`listWorkouts` ao import de `./service`.

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd apps/web && bun test src/server/workout/session.test.ts`
Expected: FAIL — `applySessionToWorkout is not a function`.

- [ ] **Step 3: Implementar `sessionAdjustments`**

```ts
export type SessionAdjustments = { added: number; replaced: number; removed: number };

/** Diferença entre a lista da sessão e o template. `removed`: itens do template ausentes. */
export async function sessionAdjustments(
  db: Db,
  session: WorkoutSession,
): Promise<SessionAdjustments> {
  const [rows, templateRows] = await Promise.all([
    db
      .select({ exerciseId: sessionExercise.exerciseId, origin: sessionExercise.origin })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id)),
    db
      .select({ id: exercise.id })
      .from(exercise)
      .where(eq(exercise.workoutId, session.workoutId)),
  ]);

  const kept = new Set(rows.flatMap((r) => (r.exerciseId ? [r.exerciseId] : [])));
  return {
    added: rows.filter((r) => r.origin === "added").length,
    replaced: rows.filter((r) => r.origin === "replaced").length,
    removed: templateRows.filter((t) => !kept.has(t.id)).length,
  };
}
```

- [ ] **Step 4: Incluir `adjustments` no retorno de `completeSession`**

Ajustar a assinatura e o `Promise.all` (que na Task 2 já passou a contar `sessionExercise`):

```ts
export async function completeSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<{
  completedAt: Date;
  durationSec: number;
  exerciseCount: number;
  adjustments: SessionAdjustments;
  summary: Awaited<ReturnType<typeof workoutSummary>>;
} | null> {
```

e, depois de obter `session`:

```ts
  const [exCount, summary, adjustments] = await Promise.all([
    db
      .select({ n: count() })
      .from(sessionExercise)
      .where(eq(sessionExercise.sessionId, session.id)),
    workoutSummary(db, userId, completedAt),
    sessionAdjustments(db, session),
  ]);

  const durationSec = Math.round(
    (completedAt.getTime() - session.startedAt.getTime()) / 1000,
  );
  return { completedAt, durationSec, exerciseCount: exCount[0].n, adjustments, summary };
```

- [ ] **Step 5: Implementar `applySessionToWorkout`**

Aceita sessão concluída (é chamada da tela de fim), então não usa `activeSessionById`.

```ts
export async function applySessionToWorkout(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<WorkoutWithExercises | null> {
  const [session] = await db
    .select()
    .from(workoutSession)
    .where(and(eq(workoutSession.id, sessionId), eq(workoutSession.userId, userId)));
  if (!session) return null;

  const rows = await db
    .select()
    .from(sessionExercise)
    .where(eq(sessionExercise.sessionId, sessionId))
    .orderBy(asc(sessionExercise.position));

  return db.transaction(async (tx) => {
    const [w] = await tx
      .select()
      .from(workout)
      .where(and(eq(workout.id, session.workoutId), eq(workout.userId, userId)));
    if (!w) return null;

    // update pontual em vez de replace-all: replace-all zeraria set_log.exercise_id
    // das sessões antigas (onDelete: "set null")
    const kept = new Set<string>();
    for (const [i, row] of rows.entries()) {
      const values = {
        name: row.name,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        restSeconds: row.restSeconds,
        position: i,
        catalogId: row.catalogId,
        muscleGroup: row.muscleGroup,
      };
      if (row.exerciseId) {
        await tx.update(exercise).set(values).where(eq(exercise.id, row.exerciseId));
        kept.add(row.exerciseId);
      } else {
        const [created] = await tx
          .insert(exercise)
          .values({ ...values, workoutId: w.id, userId })
          .returning();
        // liga a linha da sessão ao exercício criado: torna a chamada idempotente
        await tx
          .update(sessionExercise)
          .set({ exerciseId: created.id })
          .where(eq(sessionExercise.id, row.id));
        kept.add(created.id);
      }
    }

    const current = await tx
      .select({ id: exercise.id })
      .from(exercise)
      .where(eq(exercise.workoutId, w.id));
    const stale = current.filter((e) => !kept.has(e.id)).map((e) => e.id);
    if (stale.length) await tx.delete(exercise).where(inArray(exercise.id, stale));

    const [updatedWorkout] = await tx
      .update(workout)
      .set({ updatedAt: new Date() })
      .where(eq(workout.id, w.id))
      .returning();

    const exercises = await tx
      .select()
      .from(exercise)
      .where(eq(exercise.workoutId, w.id))
      .orderBy(asc(exercise.position));
    return { ...updatedWorkout, exercises };
  });
}
```

Acrescentar `inArray` ao import do `drizzle-orm` e
`import { workoutSummary, type WorkoutWithExercises } from "./service";`.

- [ ] **Step 6: Rodar os testes**

Run: `cd apps/web && bun test src/server/workout/`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `bun check-types`
Expected: sem erros. **Não commitar.**

---

### Task 5: Rotas e tipos do client

**Files:**
- Create: `apps/web/src/app/api/sessions/[id]/exercises/route.ts`
- Create: `apps/web/src/app/api/sessions/[id]/exercises/[sessionExerciseId]/route.ts`
- Create: `apps/web/src/app/api/sessions/[id]/apply-to-workout/route.ts`
- Modify: `apps/web/src/lib/api-types.ts`

**Interfaces:**
- Consumes: `addSessionExercise`, `swapSessionExercise`, `removeSessionExercise`,
  `applySessionToWorkout` (Tasks 3 e 4).
- Produces:
  - `POST /api/sessions/:id/exercises` → `{ session: SessionDetail }`
  - `PUT /api/sessions/:id/exercises/:sessionExerciseId` → `{ session: SessionDetail; discardedDoneSets: number }`
  - `DELETE /api/sessions/:id/exercises/:sessionExerciseId` → `{ session: SessionDetail }`
  - `POST /api/sessions/:id/apply-to-workout` → `{ workout: WorkoutWithExercises }`
  - Em `api-types.ts`: `SessionExercise` ganha `id: string` e `origin`, `exerciseId` vira
    nullable; novo `SessionAdjustments`.

- [ ] **Step 1: Atualizar os tipos do client**

Em `apps/web/src/lib/api-types.ts`, substituir `SessionExercise` e adicionar
`SessionAdjustments` logo depois de `SessionDetail`:

```ts
export type SessionExercise = {
  id: string; // linha de session_exercise — é o alvo dos ajustes do dia
  exerciseId: string | null; // origem no template; null = só desta sessão
  name: string;
  targetSets: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  origin: "template" | "added" | "replaced";
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};
```

```ts
export type SessionAdjustments = { added: number; replaced: number; removed: number };
```

Em `SetLog`, acrescentar o campo que o back passou a devolver:

```ts
  sessionExerciseId: string | null;
```

- [ ] **Step 2: Criar a rota de adicionar**

`apps/web/src/app/api/sessions/[id]/exercises/route.ts`:

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { FOCUS_VALUES } from "@/lib/api-types";
import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { addSessionExercise } from "@/server/workout/session";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(0).max(600),
  catalogId: z.string().nullable().optional(),
  muscleGroup: z.enum(FOCUS_VALUES).nullable().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const session = await addSessionExercise(db, userId, id, parsed.data);
  if (!session) return notFound();

  return Response.json({ session }, { status: 201 });
}
```

- [ ] **Step 3: Criar a rota de trocar e remover**

`apps/web/src/app/api/sessions/[id]/exercises/[sessionExerciseId]/route.ts`:

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { FOCUS_VALUES } from "@/lib/api-types";
import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { removeSessionExercise, swapSessionExercise } from "@/server/workout/session";

const BODY_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(0).max(600),
  catalogId: z.string().nullable().optional(),
  muscleGroup: z.enum(FOCUS_VALUES).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionExerciseId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id, sessionExerciseId } = await params;
  const result = await swapSessionExercise(
    db,
    userId,
    id,
    sessionExerciseId,
    parsed.data,
  );
  if (!result) return notFound();

  return Response.json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionExerciseId: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id, sessionExerciseId } = await params;
  const session = await removeSessionExercise(db, userId, id, sessionExerciseId);
  if (!session) return notFound();

  return Response.json({ session });
}
```

- [ ] **Step 4: Criar a rota de salvar no treino**

`apps/web/src/app/api/sessions/[id]/apply-to-workout/route.ts`:

```ts
import { db } from "@bloomy/db";

import { notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { applySessionToWorkout } from "@/server/workout/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const workout = await applySessionToWorkout(db, userId, id);
  if (!workout) return notFound();

  return Response.json({ workout });
}
```

- [ ] **Step 5: Typecheck e suíte inteira**

Run: `bun check-types`
Expected: sem erros.

Run: `cd apps/web && bun test`
Expected: PASS (`api-types.test.ts` só cobre `FOCUS_LABELS`, que não muda aqui).
**Não commitar.**

---

### Task 6: Mutações de ajuste no `useSessao`

**Files:**
- Modify: `apps/web/src/app/(app)/treino/hooks/useSessao.ts`

**Interfaces:**
- Consumes: as quatro rotas da Task 5; `SessionExercise`, `SessionDetail`,
  `SessionAdjustments`, `CatalogExercise` de `@/lib/api-types`.
- Produces, no retorno de `useSessao()`:
  - `adjust: AdjustState` onde
    `type AdjustState = { mode: "add" } | { mode: "swap"; id: string; name: string; doneSets: number } | null`
  - `openAdd(): void`, `openSwap(ex: SessionExercise): void`, `closeAdjust(): void`
  - `pickExercise(ex: CatalogExercise): Promise<void>` — resolve `add` ou `swap` conforme `adjust`
  - `removeExercise(sessionExerciseId: string): Promise<void>`
  - `applyToWorkout(): Promise<void>`, `applying: boolean`, `applied: boolean`
  - `finishSummary` passa a incluir `adjustments: SessionAdjustments`

- [ ] **Step 1: Adicionar os tipos e o estado**

No topo de `useSessao.ts`, ao lado dos types existentes:

```ts
type AdjustState =
  | { mode: "add" }
  | { mode: "swap"; id: string; name: string; doneSets: number }
  | null;
type FinishSummary = {
  durationSec: number;
  exerciseCount: number;
  adjustments: SessionAdjustments;
  summary: WorkoutSummary;
};

// Defaults de um exercício escolhido do catálogo — os mesmos do TreinoModal.
const CATALOG_DEFAULTS = { targetSets: 3, targetReps: 12, restSeconds: 45 };
```

Ampliar o import de tipos:

```ts
import type {
  CatalogExercise,
  SessionAdjustments,
  SessionDetail,
  SessionExercise,
  WorkoutSummary,
} from "@/lib/api-types";
```

E o estado, junto dos outros `useState`:

```ts
  const [adjust, setAdjust] = useState<AdjustState>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
```

- [ ] **Step 2: Implementar abrir e fechar o ajuste**

```ts
  const openAdd = useCallback(() => setAdjust({ mode: "add" }), []);
  const openSwap = useCallback(
    (ex: SessionExercise) =>
      setAdjust({
        mode: "swap",
        id: ex.id,
        name: ex.name,
        doneSets: ex.sets.filter((s) => s.done).length,
      }),
    [],
  );
  const closeAdjust = useCallback(() => setAdjust(null), []);
```

- [ ] **Step 3: Implementar `pickExercise`**

```ts
  // Um único caminho para adicionar e trocar: o modo vem do estado `adjust`.
  const pickExercise = useCallback(
    async (picked: CatalogExercise) => {
      if (!detail || !adjust) return;
      const body = {
        name: picked.namePt,
        catalogId: picked.id,
        muscleGroup: null,
        ...CATALOG_DEFAULTS,
      };
      const sessionId = detail.session.id;
      try {
        if (adjust.mode === "add") {
          const { session } = await api.post<{ session: SessionDetail }>(
            `/api/sessions/${sessionId}/exercises`,
            body,
          );
          setData({ session });
        } else {
          const { session } = await api.put<{
            session: SessionDetail;
            discardedDoneSets: number;
          }>(`/api/sessions/${sessionId}/exercises/${adjust.id}`, body);
          setData({ session });
        }
        setAdjust(null);
      } catch (e) {
        toastError(
          e,
          adjust.mode === "add"
            ? "Não foi possível adicionar o exercício"
            : "Não foi possível trocar o exercício",
        );
      }
    },
    [detail, adjust, setData],
  );
```

- [ ] **Step 4: Implementar `removeExercise` e `applyToWorkout`**

```ts
  const removeExercise = useCallback(
    async (sessionExerciseId: string) => {
      if (!detail) return;
      try {
        // o client expõe `del`, não `delete` (ver apps/web/src/lib/api.ts)
        const { session } = await api.del<{ session: SessionDetail }>(
          `/api/sessions/${detail.session.id}/exercises/${sessionExerciseId}`,
        );
        setData({ session });
      } catch (e) {
        toastError(e, "Não foi possível remover o exercício");
      }
    },
    [detail, setData],
  );

  // Chamado da tela de fim: a sessão já está concluída, `detail` ainda tem o id.
  const applyToWorkout = useCallback(async () => {
    if (!detail) return;
    setApplying(true);
    try {
      await api.post(`/api/sessions/${detail.session.id}/apply-to-workout`);
      setApplied(true);
    } catch (e) {
      toastError(e, "Não foi possível salvar no treino");
    } finally {
      setApplying(false);
    }
  }, [detail]);
```


- [ ] **Step 5: Limpar o estado no `reset` e exportar**

Em `reset`, acrescentar `setAdjust(null)`, `setApplied(false)` e `setApplying(false)`.
No objeto de retorno, acrescentar: `adjust`, `openAdd`, `openSwap`, `closeAdjust`,
`pickExercise`, `removeExercise`, `applyToWorkout`, `applying`, `applied`.

- [ ] **Step 6: Typecheck**

Run: `bun check-types`
Expected: erros esperados apenas em `ExercicioList.tsx` / `SessaoAtiva.tsx` por causa de
`ex.exerciseId` agora nullable — são resolvidos na Task 7. Qualquer erro dentro de
`useSessao.ts` precisa ser corrigido agora. **Não commitar.**

---

### Task 7: Swipe, botão de adicionar e confirmação de troca

**Files:**
- Modify: `apps/web/src/components/swipeable-row.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/ExercicioList.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/BuscaExercicio.tsx`

**Interfaces:**
- Consumes: `adjust`, `openAdd`, `openSwap`, `closeAdjust`, `pickExercise`,
  `removeExercise` (Task 6).
- Produces: `SwipeableRow` com `editIcon?: ReactNode` e `editLabel?: string`;
  `ExercicioList` com `onSwapExercise: (ex: SessionExercise) => void`,
  `onRemoveExercise: (sessionExerciseId: string) => void`, `onAddExercise: () => void`;
  `BuscaExercicio` com `onCustom?: () => void`.

- [ ] **Step 1: Tornar o slot de edição do `SwipeableRow` configurável**

Adicionar as props (default mantém o comportamento atual para Corpo e Saúde):

```ts
export function SwipeableRow({
  onEdit,
  onDelete,
  editIcon,
  editLabel = "Editar",
  children,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editIcon?: ReactNode;
  editLabel?: string;
  children: ReactNode;
}) {
```

E no botão de editar, trocar `aria-label="Editar"` por `aria-label={editLabel}` e o ícone por:

```tsx
          {editIcon ?? <PencilSimpleIcon size={22} weight="fill" />}
```

- [ ] **Step 2: Tornar `onCustom` opcional no `BuscaExercicio`**

Na assinatura, `onCustom?: () => void`. E o botão só renderiza quando existe:

```tsx
        {onCustom ? (
          <button
            type="button"
            onClick={onCustom}
            className="mt-1 flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-3 text-sm font-bold text-pink-deep"
          >
            <PlusIcon size={16} weight="bold" /> Adicionar exercício personalizado
          </button>
        ) : null}
```

- [ ] **Step 3: Envolver os itens da lista em `SwipeableRow`**

Em `ExercicioList.tsx`, ampliar as props:

```ts
  onSwapExercise,
  onRemoveExercise,
  onAddExercise,
}: {
  // … props existentes
  onSwapExercise: (ex: SessionExercise) => void;
  onRemoveExercise: (sessionExerciseId: string) => void;
  onAddExercise: () => void;
}) {
```

E o `map`, com `key={ex.id}` (antes era `ex.exerciseId`, que agora pode ser null) e badge
"só hoje" nos itens ajustados:

```tsx
        {exercises.map((ex, i) => {
          const done = isExerciseDone(ex);
          return (
            <SwipeableRow
              key={ex.id}
              onEdit={() => onSwapExercise(ex)}
              editIcon={<ArrowsClockwiseIcon size={22} weight="bold" />}
              editLabel="Trocar exercício"
              onDelete={() => onRemoveExercise(ex.id)}
            >
              <button
                type="button"
                onClick={() => onOpenExercise(i)}
                className="flex w-full items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
              >
                {ex.catalogId ? (
                  <GifThumb id={ex.catalogId} alt="" className="size-10.5 rounded-[14px]" />
                ) : (
                  <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
                )}
                <div className="flex flex-1 flex-col">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                    {ex.name}
                    {ex.origin === "template" ? null : (
                      <span className="rounded-full bg-lilac-tint px-2 py-0.5 text-xs font-bold text-lilac-deep">
                        só hoje
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-semibold text-ink-read">
                    {doneCount(ex)}/{ex.targetSets} séries
                    {ex.lastPerformance?.load != null
                      ? ` · ${ex.lastPerformance.load} kg`
                      : ""}
                  </span>
                </div>
                {done ? (
                  <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
                ) : (
                  <CaretRightIcon size={20} className="text-ink-faint" />
                )}
              </button>
            </SwipeableRow>
          );
        })}
```

Imports novos: `ArrowsClockwiseIcon` de `@phosphor-icons/react`, `PlusIcon` idem,
`SwipeableRow` de `@/components/swipeable-row`.

- [ ] **Step 4: Adicionar o botão "Adicionar exercício"**

Logo depois do `</div>` que fecha a lista, antes do label do descanso automático:

```tsx
      <button
        type="button"
        onClick={onAddExercise}
        className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-3 text-sm font-bold text-pink-deep"
      >
        <PlusIcon size={16} weight="bold" /> Adicionar exercício
      </button>
```

- [ ] **Step 5: Ligar busca e confirmação no `SessaoAtiva`**

Imports novos: `BottomSheet` de `@/components/bottom-sheet`, `ArrowsClockwiseIcon` de
`@phosphor-icons/react`, `BuscaExercicio` de `./BuscaExercicio`.

O catálogo passa a ser sempre necessário (a busca vive aqui agora) — **remover a linha
`const needsCatalog = ...`**, que fica sem uso:

```tsx
  const { catalog } = useCatalogo(true);
```

Antes do `if (view === "fim")`, tratar o estado de ajuste:

```tsx
  const { detail, view, activeEx, finishSummary, adjust } = sessao;

  if (!detail) return null;

  // Troca com séries feitas: confirma antes de abrir a busca.
  if (adjust?.mode === "swap" && adjust.doneSets > 0 && !confirmedSwap) {
    return (
      <BottomSheet
        open
        onOpenChange={(open) => {
          if (!open) sessao.closeAdjust();
        }}
        title="Trocar exercício"
        tone="pink"
        icon={<ArrowsClockwiseIcon size={22} weight="bold" />}
        footer={
          <button
            type="button"
            onClick={() => setConfirmedSwap(true)}
            className="w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn"
          >
            Trocar e descartar
          </button>
        }
      >
        <p className="text-sm font-semibold text-ink-read">
          {adjust.doneSets === 1
            ? "A série já registrada de "
            : `As ${adjust.doneSets} séries já registradas de `}
          <span className="font-bold text-ink">{adjust.name}</span>
          {" serão perdidas."}
        </p>
      </BottomSheet>
    );
  }

  if (adjust) {
    return (
      <div className="px-5.5 pt-6 pb-28">
        <BuscaExercicio
          onBack={sessao.closeAdjust}
          onPick={(picked) => sessao.pickExercise(picked)}
        />
      </div>
    );
  }
```

O `confirmedSwap` é estado local, declarado com os outros `useState`, e volta a `false` quando
o ajuste fecha:

```tsx
  const [confirmedSwap, setConfirmedSwap] = useState(false);
  useEffect(() => {
    if (!adjust) setConfirmedSwap(false);
  }, [adjust]);
```

- [ ] **Step 6: Passar os handlers ao `ExercicioList`**

No `return` final do `SessaoAtiva`:

```tsx
      onSwapExercise={sessao.openSwap}
      onRemoveExercise={sessao.removeExercise}
      onAddExercise={sessao.openAdd}
```

- [ ] **Step 7: Typecheck**

Run: `bun check-types`
Expected: sem erros — incluindo `TreinoModal.tsx`, que continua passando `onCustom`.
**Não commitar.**

---

### Task 8: "Salvar no treino" na tela de fim e verificação visual

**Files:**
- Modify: `apps/web/src/app/(app)/treino/components/SessaoFim.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx`

**Interfaces:**
- Consumes: `finishSummary.adjustments`, `applyToWorkout`, `applying`, `applied` (Task 6).
- Produces: `SessaoFim` com `adjustments: SessionAdjustments`,
  `onApplyToWorkout: () => void`, `applying: boolean`, `applied: boolean`.

- [ ] **Step 1: Ampliar as props do `SessaoFim`**

```ts
export function SessaoFim({
  durationSec,
  exerciseCount,
  summary,
  adjustments,
  onApplyToWorkout,
  applying,
  applied,
  onRestart,
}: {
  durationSec: number;
  exerciseCount: number;
  summary: WorkoutSummary;
  adjustments: SessionAdjustments;
  onApplyToWorkout: () => void;
  applying: boolean;
  applied: boolean;
  onRestart: () => void;
}) {
  const adjustCount = adjustments.added + adjustments.replaced + adjustments.removed;
```

Import: `import type { SessionAdjustments, WorkoutSummary } from "@/lib/api-types";`

- [ ] **Step 2: Inserir o bloco de escolha**

Entre o strip de dias da semana e o botão "Voltar ao início":

```tsx
      {adjustCount > 0 ? (
        <div className="flex w-full flex-col gap-3 rounded-card bg-white p-4 shadow-card-sm">
          <p className="text-sm font-semibold text-ink-read">
            Você ajustou{" "}
            <span className="font-bold text-ink">
              {adjustCount === 1 ? "1 exercício" : `${adjustCount} exercícios`}
            </span>{" "}
            hoje. Salvar essas mudanças no treino?
          </p>
          {applied ? (
            <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-green-deep">
              <CheckCircleIcon size={18} weight="fill" /> Salvo no treino
            </span>
          ) : (
            <button
              type="button"
              onClick={onApplyToWorkout}
              disabled={applying}
              className="w-full rounded-full bg-pink-bright py-3 font-display font-bold text-white shadow-btn transition-opacity disabled:opacity-70"
            >
              {applying ? "Salvando…" : "Salvar no treino"}
            </button>
          )}
        </div>
      ) : null}
```

Não há botão "Manter treino": o "Voltar ao início" logo abaixo já é a saída sem salvar, e o
default é não alterar nada.

- [ ] **Step 3: Passar as props no `SessaoAtiva`**

No bloco `if (view === "fim" && finishSummary)`:

```tsx
      <SessaoFim
        durationSec={finishSummary.durationSec}
        exerciseCount={finishSummary.exerciseCount}
        summary={finishSummary.summary}
        adjustments={finishSummary.adjustments}
        onApplyToWorkout={sessao.applyToWorkout}
        applying={sessao.applying}
        applied={sessao.applied}
        onRestart={onExit}
      />
```

- [ ] **Step 4: Typecheck e suíte completa**

Run: `bun check-types`
Expected: sem erros.

Run: `cd apps/web && bun test`
Expected: PASS.

- [ ] **Step 5: Verificação visual real**

Subir o dev server pelo skill `/dev-up` na porta 3001 e percorrer, em `/treino`:

1. iniciar um treino;
2. swipe → em um exercício sem série feita → escolher outro do catálogo → confirmar que
   substituiu no mesmo lugar, com badge "só hoje" e séries zeradas;
3. marcar uma série, swipe → nesse exercício → confirmar que aparece o aviso de descarte;
4. "+ Adicionar exercício" → escolher do catálogo → confirmar que entrou no fim;
5. swipe ← em um item → confirmar que saiu da lista;
6. concluir o treino → confirmar o bloco "Você ajustou N exercícios hoje" → "Salvar no treino"
   → voltar e confirmar que o treino agora reflete a lista ajustada;
7. iniciar de novo sem salvar em outra sessão → confirmar que a lista voltou à original.

`bun check-types` verde não prova UI funcionando. Sem esses sete passos conferidos na tela, a
task não está pronta. **Não commitar.**

---

## Notas para a revisão final

- `docs/README.md` (spec do Diário) descreve a sessão como lista fixa vinda do treino — vale
  atualizar o trecho depois que a implementação estiver aprovada.
- Nenhuma ADR nova: a mudança não altera as decisões de ADR-0001 (REST fino + serviços) nem
  ADR-0002 (coluna `day`). O split `service.ts`/`session.ts` segue o padrão já documentado.
