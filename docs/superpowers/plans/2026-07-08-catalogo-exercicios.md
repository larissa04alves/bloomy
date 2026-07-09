# Catálogo de exercícios (com GIF) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um catálogo global de exercícios (nome PT + grupo muscular + GIF de execução) pesquisável/filtrável ao montar o treino, com "ver grande" e GIF durante o treino; exercícios fora do catálogo seguem como texto livre com grupo muscular opcional.

**Architecture:** Catálogo semeado de `omercotkd/exercises-gifs` numa tabela nova `exercise_catalog`; GIFs no Cloudflare R2 (URL via base configurável). Busca é **client-side com Fuse.js** sobre o catálogo carregado uma vez. `exercise` (linha de treino) ganha `catalogId` (nullable) e `muscleGroup` (nullable). Segue o padrão da aba Treino: REST fino + serviço (ADR-0001), telas PT sem lógica no `.tsx` (hooks), domínio rosa.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Drizzle/libsql (Turso), Zod, Tailwind 4 (`@bloomy/ui`), Phosphor Icons, **Fuse.js** (novo), Cloudflare R2 (`@aws-sdk/client-s3` p/ upload no seed). Testes: `bun run test` de `apps/web` (roda com `--conditions react-server`); `packages/db` para o seed/helpers de dados.

## Global Constraints

- **NÃO commitar** sem ordem explícita da usuária (regra `CLAUDE.md` raiz). Cada task termina em checkpoint verde e deixa mudanças **não-commitadas**; **não há passo de commit** neste plano (a usuária commita e revisa). Ignore os "Commit" do template do skill — aqui é proibido.
- **Ler antes de editar:** `Read` cada arquivo antes de `Edit` (`cat`/`sed` não contam pro harness); se `Edit` falhar com `string not found`, re-`Read` antes de re-tentar.
- **Migrations sempre:** `bun db:generate` + (quando a usuária mandar) `bun db:migrate`. NUNCA `drizzle-kit push` (`packages/db/CLAUDE.md`).
- **Telas PT sem lógica no `.tsx`:** `page.tsx`/componentes só renderizam; fetch/estado/handlers nos hooks (`apps/web/CLAUDE.md`).
- **Domínio rosa** (`tone="pink"`, `bg-pink-bright #e08ab0`, `text-pink-deep #c76e9e`, `bg-pink-tint #fbeaf2`); **nunca vermelho de sistema** (erro/coral). `prefers-reduced-motion` com variante `motion-reduce:`.
- **Tudo em PT-BR pro usuário.** `name` (EN) é interno; `namePt` é o exibido. Inglês nunca aparece na UI.
- **8 grupos musculares** = `Focus` existente: `chest|back|legs|shoulders|glutes|arms|abs|cardio` → labels `Peito|Costas|Pernas|Ombros|Glúteos|Braços|Abdômen|Cardio` (`FOCUS_LABELS` em `apps/web/src/lib/api-types.ts`).
- **Fonte dos dados:** repo `omercotkd/exercises-gifs` — `exercises.csv` (1.324 linhas; colunas achatadas `secondaryMuscles/0..5`, `instructions/0..10`) + `assets/{id}.gif` (360×360; 1.323 arquivos; **id `0609` sem GIF → dropar**). Junção só por `id` (zero-padded, ex.: `"0025"`).
- **GIF:** hospedado no R2, servido via `<img>` simples (não `next/image`). URL = `${EXERCISE_GIF_BASE}/{id}.gif`. **Sem passos escritos (`instructions`) no v1.**
- **Atribuição:** exibir "© Gym Visual" na tela de ver-grande.
- **Dep de catálogo:** libs novas vão em `package.json` raiz (`workspaces.catalog`) e usam `"catalog:"` nos pacotes (`CLAUDE.md` raiz).

Comandos de verificação:
- Typecheck: `bun check-types` (raiz)
- Testes web: `cd apps/web && bun run test` (script já injeta `--conditions react-server`) — filtrar: `bun run test <padrão>` NÃO passa a condition; usar `bun test --conditions react-server src/<caminho>` para focar.
- Testes db: `cd packages/db && bun test <padrão>`
- Dev server (verificação visual): porta 3001 (`bun dev:web`), rota `/treino`.

---

### Task 1: Schema do catálogo + colunas em `exercise` + migration

**Files:**
- Modify: `packages/db/src/schema/workout.ts`
- Generate: `packages/db/src/migrations/00NN_*.sql` (via `bun db:generate`)

**Interfaces:**
- Produces: tabela `exerciseCatalog` (Drizzle) e colunas `exercise.catalogId`, `exercise.muscleGroup`. Tipos inferidos `ExerciseCatalog = typeof exerciseCatalog.$inferSelect`.

- [ ] **Step 1: Adicionar a tabela `exerciseCatalog`**

Em `packages/db/src/schema/workout.ts`, após a tabela `exercise` (antes de `workoutSession`), adicionar:

```ts
export const exerciseCatalog = sqliteTable("exercise_catalog", {
  id: text("id").primaryKey(), // id do dataset ("0025") — também a chave do GIF
  name: text("name").notNull(), // inglês, interno
  namePt: text("name_pt").notNull(), // exibição PT
  group: text("group")
    .$type<"chest" | "back" | "legs" | "shoulders" | "glutes" | "arms" | "abs" | "cardio">()
    .notNull(),
  bodyPart: text("body_part").notNull(),
  target: text("target").notNull(),
  equipment: text("equipment").notNull(),
  secondaryMuscles: text("secondary_muscles", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: timestampMs("created_at"),
});
```

- [ ] **Step 2: Adicionar colunas em `exercise`**

Na tabela `exercise` (mesmo arquivo), adicionar dentro do objeto de colunas, após `position`:

```ts
    catalogId: text("catalog_id").references(() => exerciseCatalog.id, {
      onDelete: "set null",
    }),
    muscleGroup: text("muscle_group").$type<
      "chest" | "back" | "legs" | "shoulders" | "glutes" | "arms" | "abs" | "cardio"
    >(),
```

> `exerciseCatalog` é declarado **depois** de `exercise` no arquivo, mas `references(() => exerciseCatalog.id)` é lazy (arrow), então a ordem não quebra. Se o TS reclamar de uso-antes-de-declarar, mover `exerciseCatalog` para antes de `exercise`.

- [ ] **Step 3: Exportar o tipo**

No fim de `workout.ts`, junto dos outros `$inferSelect`:

```ts
export type ExerciseCatalog = typeof exerciseCatalog.$inferSelect;
```

- [ ] **Step 4: Gerar a migration**

Run: `bun db:generate`
Expected: cria `packages/db/src/migrations/00NN_*.sql` com `CREATE TABLE exercise_catalog` + `ALTER TABLE exercise ADD catalog_id` + `ADD muscle_group`. Conferir com `Read` que **não** dropa/renomeia nada existente.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. **NÃO** rodar `db:migrate` ainda (depende do R2/seed e da ordem da usuária). Deixar não-commitado.

---

### Task 2: Helper puro de mapeamento de grupo muscular (TDD)

**Files:**
- Create: `packages/db/src/seed/muscle-group.ts`
- Test: `packages/db/src/seed/muscle-group.test.ts`

**Interfaces:**
- Produces: `type Focus`, `mapMuscleGroup(target: string, bodyPart: string): Focus`.

- [ ] **Step 1: Escrever o teste que falha**

Create `packages/db/src/seed/muscle-group.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { mapMuscleGroup } from "./muscle-group";

describe("mapMuscleGroup", () => {
  it("mapeia target/bodyPart do dataset p/ um dos 8 grupos", () => {
    expect(mapMuscleGroup("pectorals", "chest")).toBe("chest");
    expect(mapMuscleGroup("lats", "back")).toBe("back");
    expect(mapMuscleGroup("quads", "upper legs")).toBe("legs");
    expect(mapMuscleGroup("calves", "lower legs")).toBe("legs");
    expect(mapMuscleGroup("delts", "shoulders")).toBe("shoulders");
    expect(mapMuscleGroup("glutes", "upper legs")).toBe("glutes");
    expect(mapMuscleGroup("biceps", "upper arms")).toBe("arms");
    expect(mapMuscleGroup("forearms", "lower arms")).toBe("arms");
    expect(mapMuscleGroup("abs", "waist")).toBe("abs");
    expect(mapMuscleGroup("cardiovascular system", "cardio")).toBe("cardio");
  });
  it("cai num fallback sensato p/ desconhecido", () => {
    expect(mapMuscleGroup("???", "neck")).toBe("shoulders"); // neck → ombros
    expect(mapMuscleGroup("???", "???")).toBe("abs"); // último recurso
  });
});
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `cd packages/db && bun test muscle-group`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Create `packages/db/src/seed/muscle-group.ts`:

```ts
export type Focus =
  | "chest" | "back" | "legs" | "shoulders" | "glutes" | "arms" | "abs" | "cardio";

// target tem prioridade (mais específico); bodyPart é o reforço.
const BY_TARGET: Record<string, Focus> = {
  pectorals: "chest",
  lats: "back", "upper back": "back", traps: "back", "spine": "back",
  quads: "legs", hamstrings: "legs", calves: "legs", adductors: "legs", abductors: "legs",
  glutes: "glutes",
  delts: "shoulders", "serratus anterior": "shoulders",
  biceps: "arms", triceps: "arms", forearms: "arms",
  abs: "abs",
  "cardiovascular system": "cardio",
};

const BY_BODYPART: Record<string, Focus> = {
  chest: "chest",
  back: "back",
  "upper legs": "legs", "lower legs": "legs",
  shoulders: "shoulders", neck: "shoulders",
  "upper arms": "arms", "lower arms": "arms",
  waist: "abs",
  cardio: "cardio",
};

/** Mapeia (target, bodyPart) crus do dataset p/ 1 dos 8 grupos. */
export function mapMuscleGroup(target: string, bodyPart: string): Focus {
  const t = target.trim().toLowerCase();
  const b = bodyPart.trim().toLowerCase();
  if (t === "glutes") return "glutes"; // glúteos antes de cair em "legs" pelo bodyPart
  return BY_TARGET[t] ?? BY_BODYPART[b] ?? "abs";
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `cd packages/db && bun test muscle-group`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

> Nota: a tabela `BY_TARGET`/`BY_BODYPART` deve cobrir **todos** os valores distintos de `target`/`bodyPart` do CSV. Na Task 4, após parsear o CSV, logar os valores distintos e conferir que nenhum caiu no fallback `"abs"` indevidamente; ajustar as tabelas aqui se aparecer valor novo.

---

### Task 3: Parser do CSV achatado (TDD)

**Files:**
- Create: `packages/db/src/seed/parse-csv.ts`
- Test: `packages/db/src/seed/parse-csv.test.ts`

**Interfaces:**
- Produces: `type RawExercise = { id, name, bodyPart, target, equipment, secondaryMuscles: string[] }`, `parseExercisesCsv(csv: string): RawExercise[]` (dropa linhas sem id e reconstrói arrays achatados).

- [ ] **Step 1: Escrever o teste que falha**

Create `packages/db/src/seed/parse-csv.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { parseExercisesCsv } from "./parse-csv";

const CSV = `bodyPart,equipment,id,name,target,secondaryMuscles/0,secondaryMuscles/1
waist,body weight,0001,3/4 sit-up,abs,hip flexors,lower back
chest,barbell,0025,barbell bench press,pectorals,triceps,`;

describe("parseExercisesCsv", () => {
  it("reconstrói arrays achatados e ignora colunas vazias", () => {
    const rows = parseExercisesCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: "0001", name: "3/4 sit-up", bodyPart: "waist", target: "abs",
      equipment: "body weight", secondaryMuscles: ["hip flexors", "lower back"],
    });
    expect(rows[1].secondaryMuscles).toEqual(["triceps"]); // célula vazia dropada
  });
});
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run: `cd packages/db && bun test parse-csv`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Create `packages/db/src/seed/parse-csv.ts`. Usar um parser CSV robusto (aspas/vírgulas). Adicionar dep `csv-parse` ao catálogo (raiz) ou usar `Bun`-friendly. Implementação com `csv-parse/sync`:

```ts
import { parse } from "csv-parse/sync";

export type RawExercise = {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
};

export function parseExercisesCsv(csv: string): RawExercise[] {
  const records = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return records
    .filter((r) => r.id?.trim())
    .map((r) => {
      const secondaryMuscles = Object.keys(r)
        .filter((k) => k.startsWith("secondaryMuscles/"))
        .sort()
        .map((k) => r[k]?.trim())
        .filter((v): v is string => Boolean(v));
      return {
        id: r.id.trim(),
        name: r.name.trim(),
        bodyPart: r.bodyPart.trim(),
        target: r.target.trim(),
        equipment: r.equipment.trim(),
        secondaryMuscles,
      };
    });
}
```

Adicionar `csv-parse` ao `workspaces.catalog` da raiz e `"catalog:"` em `packages/db/package.json` (`bun add csv-parse` de dentro de `packages/db` após declarar o catálogo, ou editar os `package.json` e `bun install`).

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `cd packages/db && bun test parse-csv`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 4: Arquivo de dados PT (namePt + group revisável)

**Files:**
- Create: `packages/db/src/seed/catalog-pt.json` (dados) — `Record<id, { namePt: string; group: Focus }>`
- Create: `packages/db/src/seed/catalog-pt.ts` (loader tipado + validação)
- Test: `packages/db/src/seed/catalog-pt.test.ts`

**Interfaces:**
- Consumes: `parseExercisesCsv` (Task 3), `Focus` (Task 2).
- Produces: `CATALOG_PT: Record<string, { namePt: string; group: Focus }>`.

- [ ] **Step 1: Gerar o `catalog-pt.json`**

Baixar o CSV do repo (pin de commit) e, para **cada** um dos 1.323 exercícios (após dropar `0609`), produzir `{ namePt, group }`:
- `namePt`: tradução PT-BR do `name` (terminologia de academia; ex.: `"barbell bench press"` → `"supino reto com barra"`, `"leg extension"` → `"cadeira extensora"`). Gerar a lista completa (determinística) e revisar os comuns com a usuária.
- `group`: `mapMuscleGroup(target, bodyPart)` (Task 2).

Salvar como JSON `id → { namePt, group }`. Este arquivo é **commitável e revisável** (a usuária corrige nomes aqui).

> Este é o principal artefato de curadoria. Não cabe inline no plano (1.323 entradas); é gerado no momento da implementação a partir do CSV + terminologia PT, e revisado. O teste abaixo garante cobertura/consistência.

- [ ] **Step 2: Escrever o teste (cobertura/consistência)**

Create `packages/db/src/seed/catalog-pt.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { CATALOG_PT } from "./catalog-pt";

const GROUPS = new Set(["chest","back","legs","shoulders","glutes","arms","abs","cardio"]);

describe("CATALOG_PT", () => {
  it("tem ~1323 entradas, todas com namePt não-vazio e group válido", () => {
    const entries = Object.entries(CATALOG_PT);
    expect(entries.length).toBeGreaterThanOrEqual(1300);
    for (const [id, v] of entries) {
      expect(id).toMatch(/^\d{4}$/);
      expect(v.namePt.trim().length).toBeGreaterThan(0);
      expect(GROUPS.has(v.group)).toBe(true);
    }
  });
  it("não inclui o id 0609 (sem GIF)", () => {
    expect(CATALOG_PT["0609"]).toBeUndefined();
  });
});
```

- [ ] **Step 3: Implementar o loader**

Create `packages/db/src/seed/catalog-pt.ts`:

```ts
import type { Focus } from "./muscle-group";
import data from "./catalog-pt.json";

export const CATALOG_PT = data as Record<string, { namePt: string; group: Focus }>;
```

Garantir `resolveJsonModule` no tsconfig do `packages/db` (adicionar se faltar).

- [ ] **Step 4: Rodar o teste (deve passar)**

Run: `cd packages/db && bun test catalog-pt`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types`. Não-commitado.

---

### Task 5: Setup R2 + script de seed (download → upload GIF → insert catálogo)

**Files:**
- Create: `packages/db/src/seed/seed-catalog.ts` (script one-shot)
- Create/Modify: `packages/db/package.json` (script `db:seed:catalog`), `apps/web/.env` (vars R2 + `EXERCISE_GIF_BASE`)

**Interfaces:**
- Consumes: `parseExercisesCsv`, `mapMuscleGroup`, `CATALOG_PT`, `createDb` (`@bloomy/db/client`), `exerciseCatalog` (schema).

- [ ] **Step 1: Setup do R2 (manual, guiado — a usuária executa)**

Passos (a implementação **para e pede** à usuária executar, pois exige login):
1. Criar conta/bucket no Cloudflare R2 (ex.: bucket `bloomy-exercises`).
2. Ativar **Public access (r2.dev)** do bucket → copiar o domínio `https://pub-xxxx.r2.dev`.
3. Criar um API Token R2 (Access Key ID + Secret) com permissão de escrita no bucket.
4. Preencher em `apps/web/.env`:
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=bloomy-exercises
EXERCISE_GIF_BASE=https://pub-xxxx.r2.dev
```
5. Registrar `EXERCISE_GIF_BASE` no `packages/env` (schema zod do web) como var pública client-safe (prefixo conforme o padrão do `packages/env`; conferir como as vars públicas são expostas lá antes de nomear).

- [ ] **Step 2: Escrever o script de seed**

Create `packages/db/src/seed/seed-catalog.ts` (roda com `bun`, lê env de `apps/web/.env`). Dep de upload: `@aws-sdk/client-s3` (R2 é S3-compatível) no catálogo raiz.

```ts
import { readFileSync } from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { createDb } from "../client";
import { exerciseCatalog } from "../schema/workout";
import { parseExercisesCsv } from "./parse-csv";
import { mapMuscleGroup } from "./muscle-group";
import { CATALOG_PT } from "./catalog-pt";

const REPO = "https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main"; // pin no commit real na impl
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  const csv = await (await fetch(`${REPO}/exercises.csv`)).text();
  const rows = parseExercisesCsv(csv).filter((r) => CATALOG_PT[r.id]); // dropa 0609 e não-mapeados
  const db = createDb({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN });

  for (const r of rows) {
    // upload do GIF (idempotente — sobrescreve)
    const gif = new Uint8Array(await (await fetch(`${REPO}/assets/${r.id}.gif`)).arrayBuffer());
    await R2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET, Key: `${r.id}.gif`, Body: gif, ContentType: "image/gif",
    }));
    const pt = CATALOG_PT[r.id];
    await db.insert(exerciseCatalog).values({
      id: r.id, name: r.name, namePt: pt.namePt, group: pt.group,
      bodyPart: r.bodyPart, target: r.target, equipment: r.equipment,
      secondaryMuscles: r.secondaryMuscles,
    }).onConflictDoUpdate({
      target: exerciseCatalog.id,
      set: { name: r.name, namePt: pt.namePt, group: pt.group, bodyPart: r.bodyPart,
             target: r.target, equipment: r.equipment, secondaryMuscles: r.secondaryMuscles },
    });
  }
  console.log(`seed ok: ${rows.length} exercícios`);
}
main().then(() => process.exit(0));
```

Adicionar em `packages/db/package.json` scripts: `"db:seed:catalog": "bun src/seed/seed-catalog.ts"`.
Confirmar o nome exato das envs de conexão (`DATABASE_URL`/token) lendo `packages/db/src/index.ts` e `client.ts` antes de rodar.

- [ ] **Step 3: Aplicar migration + rodar o seed (a usuária autoriza)**

**Parar e pedir** à usuária:
Run: `bun db:migrate` (aplica a migration da Task 1 no Turso)
Run: `cd packages/db && bun run db:seed:catalog`
Expected: log "seed ok: 1323 exercícios"; bucket R2 com 1.323 `.gif`; tabela `exercise_catalog` populada.

- [ ] **Step 4: Verificar**

Run (spot-check): consultar 1 linha (`bun db:studio` ou um `select` rápido) e abrir `${EXERCISE_GIF_BASE}/0025.gif` no navegador → o GIF carrega. `bun check-types` verde. Não-commitado.

---

### Task 6: Tipos de domínio + endpoint `GET /api/exercises`

**Files:**
- Modify: `apps/web/src/lib/api-types.ts` (append `CatalogExercise`; estender `Exercise`)
- Create: `apps/web/src/server/workout/catalog.ts` (serviço `listCatalog`)
- Create: `apps/web/src/app/api/exercises/route.ts`
- Test: `apps/web/src/server/workout/catalog.test.ts`

**Interfaces:**
- Consumes: `exerciseCatalog` (schema), `Db`.
- Produces: `type CatalogExercise = { id; name; namePt; group: Focus; bodyPart; target; secondaryMuscles: string[] }`; `Exercise` ganha `catalogId: string | null; muscleGroup: Focus | null`; `GET /api/exercises` → `{ exercises: CatalogExercise[] }`; serviço `listCatalog(db): Promise<CatalogExercise[]>`.

- [ ] **Step 1: Estender os tipos**

Em `apps/web/src/lib/api-types.ts`, no bloco Treino, adicionar:

```ts
export type CatalogExercise = {
  id: string;
  name: string;
  namePt: string;
  group: Focus;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
};
```

e estender `Exercise`:

```ts
export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  muscleGroup: Focus | null;
};
```

- [ ] **Step 2: Escrever o teste do serviço (deve falhar)**

Create `apps/web/src/server/workout/catalog.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { createTestDb } from "@bloomy/db/test-helpers"; // conferir helper real usado nos testes de workout
import { exerciseCatalog } from "@bloomy/db/schema/workout";

import { listCatalog } from "./catalog";

describe("listCatalog", () => {
  test("retorna o catálogo inteiro mapeado p/ CatalogExercise", async () => {
    const db = await createTestDb();
    await db.insert(exerciseCatalog).values({
      id: "0025", name: "barbell bench press", namePt: "Supino reto com barra",
      group: "chest", bodyPart: "chest", target: "pectorals", equipment: "barbell",
      secondaryMuscles: ["triceps", "shoulders"],
    });
    const list = await listCatalog(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: "0025", namePt: "Supino reto com barra", group: "chest",
      secondaryMuscles: ["triceps", "shoulders"],
    });
    expect(list[0]).not.toHaveProperty("createdAt");
  });
});
```

> Conferir em `apps/web/src/server/workout/service.test.ts` como `createTestDb` é importado/criado (Fase 1 criou um helper); replicar exatamente. Se o helper vier de outro caminho, ajustar o import.

- [ ] **Step 3: Rodar (deve falhar)**

Run: `cd apps/web && bun test catalog`
Expected: FAIL — `listCatalog` não existe.

- [ ] **Step 4: Implementar o serviço**

Create `apps/web/src/server/workout/catalog.ts`:

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { exerciseCatalog } from "@bloomy/db/schema/workout";
import { asc } from "drizzle-orm";

import type { CatalogExercise } from "@/lib/api-types";

export async function listCatalog(db: Db): Promise<CatalogExercise[]> {
  const rows = await db.select().from(exerciseCatalog).orderBy(asc(exerciseCatalog.namePt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    namePt: r.namePt,
    group: r.group,
    bodyPart: r.bodyPart,
    target: r.target,
    secondaryMuscles: r.secondaryMuscles,
  }));
}
```

- [ ] **Step 5: Implementar a rota**

Create `apps/web/src/app/api/exercises/route.ts`:

```ts
import { db } from "@bloomy/db";

import { requireUserId, unauthorized } from "@/server/shared/api";
import { listCatalog } from "@/server/workout/catalog";

export async function GET(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();
  return Response.json({ exercises: await listCatalog(db) });
}
```

- [ ] **Step 6: Rodar o teste (deve passar) + checkpoint**

Run: `cd apps/web && bun test catalog` → PASS.
Run: `bun check-types` (raiz) → sem erros. Não-commitado.

---

### Task 7: Hook do catálogo + busca Fuse (client)

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/useCatalogo.ts`
- Create: `apps/web/src/app/(app)/treino/hooks/buscaExercicios.ts` (wrapper puro do Fuse)
- Test: `apps/web/src/app/(app)/treino/hooks/buscaExercicios.test.ts`
- Modify: `package.json` (raiz, catalog `fuse.js`) + `apps/web/package.json` (`"fuse.js": "catalog:"`)

**Interfaces:**
- Consumes: `api.get`, `useResource`, `CatalogExercise`, `Focus`.
- Produces: `useCatalogo()` → `{ catalog: CatalogExercise[], loading }`; `buildFuse(list)` e `searchExercises(fuse, list, { q, group }): CatalogExercise[]`.

- [ ] **Step 1: Adicionar a dep `fuse.js`**

No `package.json` raiz, em `workspaces.catalog`, adicionar `"fuse.js": "^7.1.0"` (versão com `ignoreDiacritics`). Em `apps/web/package.json` deps: `"fuse.js": "catalog:"`. Run: `bun install`.

- [ ] **Step 2: Escrever o teste do wrapper (deve falhar)**

Create `apps/web/src/app/(app)/treino/hooks/buscaExercicios.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import type { CatalogExercise } from "@/lib/api-types";

import { buildFuse, searchExercises } from "./buscaExercicios";

const cat: CatalogExercise[] = [
  { id: "1", name: "barbell bench press", namePt: "Supino reto com barra", group: "chest", bodyPart: "chest", target: "pectorals", secondaryMuscles: [] },
  { id: "2", name: "leg extension", namePt: "Cadeira extensora", group: "legs", bodyPart: "upper legs", target: "quads", secondaryMuscles: [] },
  { id: "3", name: "lat pulldown", namePt: "Puxada frontal", group: "back", bodyPart: "back", target: "lats", secondaryMuscles: [] },
];

describe("searchExercises", () => {
  const fuse = buildFuse(cat);
  it("acha por prefixo/typo ignorando acento", () => {
    expect(searchExercises(fuse, cat, { q: "supin", group: null }).map((e) => e.id)).toContain("1");
    expect(searchExercises(fuse, cat, { q: "extensora", group: null }).map((e) => e.id)).toContain("2");
  });
  it("filtra por grupo (sem query devolve o grupo todo)", () => {
    const legs = searchExercises(fuse, cat, { q: "", group: "legs" });
    expect(legs.map((e) => e.id)).toEqual(["2"]);
  });
  it("combina query + grupo", () => {
    expect(searchExercises(fuse, cat, { q: "puxada", group: "back" }).map((e) => e.id)).toEqual(["3"]);
    expect(searchExercises(fuse, cat, { q: "supino", group: "legs" })).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Rodar (deve falhar)**

Run: `cd apps/web && bun test buscaExercicios`
Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar o wrapper**

Create `apps/web/src/app/(app)/treino/hooks/buscaExercicios.ts`:

```ts
import Fuse from "fuse.js";

import type { CatalogExercise, Focus } from "@/lib/api-types";

export function buildFuse(list: CatalogExercise[]): Fuse<CatalogExercise> {
  return new Fuse(list, {
    keys: [
      { name: "namePt", weight: 2 },
      { name: "name", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    ignoreDiacritics: true,
    minMatchCharLength: 2,
  });
}

/** Filtra por grupo (exato) e busca (fuzzy). Query vazia → lista filtrada por grupo. */
export function searchExercises(
  fuse: Fuse<CatalogExercise>,
  list: CatalogExercise[],
  { q, group }: { q: string; group: Focus | null },
): CatalogExercise[] {
  const base = q.trim().length >= 2 ? fuse.search(q.trim()).map((r) => r.item) : list;
  return group ? base.filter((e) => e.group === group) : base;
}
```

- [ ] **Step 5: Rodar o teste (deve passar)**

Run: `cd apps/web && bun test buscaExercicios`
Expected: PASS.

- [ ] **Step 6: Implementar o hook de fetch**

Create `apps/web/src/app/(app)/treino/hooks/useCatalogo.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { CatalogExercise } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useCatalogo() {
  const { data, loading } = useResource<{ exercises: CatalogExercise[] }>(
    useCallback(() => api.get<{ exercises: CatalogExercise[] }>("/api/exercises"), []),
  );
  return { catalog: data?.exercises ?? [], loading };
}
```

- [ ] **Step 7: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 8: Helper de GIF + view de busca dentro do modal

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/gif.ts` (`gifUrl(id)`)
- Create: `apps/web/src/app/(app)/treino/components/BuscaExercicio.tsx`
- Create: `apps/web/src/app/(app)/treino/components/GifViewer.tsx` (ver-grande)
- Test: `apps/web/src/app/(app)/treino/hooks/gif.test.ts`

**Interfaces:**
- Consumes: `useCatalogo`, `buildFuse`/`searchExercises`, `CatalogExercise`, `FOCUS_LABELS`, `FOCUS_VALUES`, `IconChip`.
- Produces: `gifUrl(id: string): string`; `BuscaExercicio({ onPick, onCustom, onBack })`; `GifViewer({ exercise, onClose })`.

- [ ] **Step 1: Teste do `gifUrl` (deve falhar)**

Create `apps/web/src/app/(app)/treino/hooks/gif.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { gifUrl } from "./gif";

describe("gifUrl", () => {
  it("monta a URL do GIF a partir da base + id", () => {
    // NEXT_PUBLIC_EXERCISE_GIF_BASE definido no ambiente de teste? senão testar via arg.
    expect(gifUrl("0025")).toMatch(/\/0025\.gif$/);
  });
});
```

- [ ] **Step 2: Rodar (deve falhar)**

Run: `cd apps/web && bun test gif`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `gifUrl`**

Create `apps/web/src/app/(app)/treino/hooks/gif.ts`:

```ts
// Base pública do R2 exposta ao client. Conferir em packages/env o nome/expo da var pública.
const BASE = process.env.NEXT_PUBLIC_EXERCISE_GIF_BASE ?? "";

export function gifUrl(id: string): string {
  return `${BASE}/${id}.gif`;
}
```

> Ajustar o nome da env conforme o padrão de var pública do `packages/env`/Next (prefixo `NEXT_PUBLIC_`). Se o teste rodar sem env, ele valida só o sufixo `/{id}.gif` (já coberto acima).

- [ ] **Step 4: Rodar (deve passar)**

Run: `cd apps/web && bun test gif` → PASS.

- [ ] **Step 5: Implementar `GifViewer` (ver-grande)**

Create `apps/web/src/app/(app)/treino/components/GifViewer.tsx`. Overlay: backdrop escuro + painel branco (`rounded-card-lg`), GIF grande (aspect-square), `namePt`, chips de músculos (grupo + `secondaryMuscles` via mapa PT), "© Gym Visual", botão fechar. `prefers-reduced-motion` não afeta GIF (é a mídia). Estrutura:

```tsx
"use client";

import { XIcon } from "@phosphor-icons/react";

import type { CatalogExercise } from "@/lib/api-types";
import { FOCUS_LABELS } from "@/lib/api-types";

import { gifUrl } from "../hooks/gif";

export function GifViewer({ exercise, onClose }: { exercise: CatalogExercise; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 px-4 pb-6">
      <div className="w-full max-w-105 rounded-card-lg bg-white p-4 pb-6 shadow-sheet">
        <button type="button" aria-label="Fechar" onClick={onClose}
          className="ml-auto grid size-9 place-items-center rounded-full bg-lilac-tint-soft text-ink-read">
          <XIcon size={16} weight="bold" />
        </button>
        <img src={gifUrl(exercise.id)} alt={exercise.namePt}
          className="mt-1 aspect-square w-full rounded-card object-cover" />
        <h2 className="mt-4 font-display text-xl font-bold text-ink">{exercise.namePt}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-pink-tint px-3 py-1 text-[12px] font-bold text-pink-deep">
            {FOCUS_LABELS[exercise.group]}
          </span>
          {exercise.secondaryMuscles.map((m) => (
            <span key={m} className="rounded-full bg-pink-tint px-3 py-1 text-[12px] font-bold text-pink-deep">{m}</span>
          ))}
        </div>
        <p className="mt-3 text-right text-[10px] text-ink-faint">© Gym Visual</p>
      </div>
    </div>
  );
}
```

> `secondaryMuscles` são EN crus. Se quiser PT aqui, aplicar um mapa `MUSCLE_LABELS` (pequeno) — opcional no v1; pode exibir só o chip do grupo (PT garantido) e omitir secundários se a usuária preferir. Confirmar na verificação visual.

- [ ] **Step 6: Implementar `BuscaExercicio` (view de busca)**

Create `apps/web/src/app/(app)/treino/components/BuscaExercicio.tsx`. Header (voltar), barra de busca + botão de filtro (Phosphor `FunnelIcon`), chips de grupo (toggláveis, aparecem ao abrir o filtro), lista de resultados (thumb `gifUrl` + `namePt` + chip do grupo + `⤢`), e no fim "＋ Adicionar exercício personalizado". Usa `useCatalogo` + `useMemo(buildFuse)` + `searchExercises`. Estado local: `q`, `group`, `filterOpen`, `preview` (para abrir `GifViewer`). Toda a lógica no componente (é client); `page.tsx` continua fino. Props: `onPick(ex: CatalogExercise)`, `onCustom()`, `onBack()`.

Pontos-chave (código essencial):

```tsx
"use client";

import { ArrowLeftIcon, FunnelIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { IconChip } from "@/components/icon-chip";
import { type CatalogExercise, type Focus, FOCUS_LABELS, FOCUS_VALUES } from "@/lib/api-types";

import { buildFuse, searchExercises } from "../hooks/buscaExercicios";
import { useCatalogo } from "../hooks/useCatalogo";
import { gifUrl } from "../hooks/gif";
import { GifViewer } from "./GifViewer";

export function BuscaExercicio({
  onPick, onCustom, onBack,
}: { onPick: (ex: CatalogExercise) => void; onCustom: () => void; onBack: () => void }) {
  const { catalog, loading } = useCatalogo();
  const fuse = useMemo(() => buildFuse(catalog), [catalog]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<Focus | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [preview, setPreview] = useState<CatalogExercise | null>(null);

  const results = useMemo(() => searchExercises(fuse, catalog, { q, group }).slice(0, 60), [fuse, catalog, q, group]);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center gap-3">
        <button type="button" aria-label="Voltar" onClick={onBack}
          className="grid size-9 place-items-center rounded-full bg-lilac-tint text-lilac-deep">
          <ArrowLeftIcon size={18} weight="bold" />
        </button>
        <h2 className="font-display text-lg font-bold text-ink">Escolher exercício</h2>
      </header>

      <div className="flex items-stretch gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-control border border-hairline bg-white px-3 focus-within:border-pink-bright">
          <MagnifyingGlassIcon size={17} className="text-pink-deep" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="buscar exercício…"
            className="w-full bg-transparent py-2.5 text-[14px] font-semibold text-ink outline-none placeholder:text-ink-faint" />
        </label>
        <button type="button" aria-label="Filtrar por grupo" onClick={() => setFilterOpen((v) => !v)}
          className={`relative grid w-11 place-items-center rounded-control border ${group ? "border-pink-bright bg-pink-tint text-pink-deep" : "border-hairline bg-white text-ink-read"}`}>
          <FunnelIcon size={18} weight={group ? "fill" : "regular"} />
          {group ? <span className="absolute -right-1.5 -top-1.5 grid size-4.5 place-items-center rounded-full bg-pink-bright text-[10px] font-extrabold text-white">1</span> : null}
        </button>
      </div>

      {filterOpen ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={group === null} onClick={() => setGroup(null)}>Todos</Chip>
          {FOCUS_VALUES.map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{FOCUS_LABELS[g]}</Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        {loading ? <p className="py-6 text-center text-[13px] font-semibold text-ink-read">Carregando…</p> : null}
        {results.map((ex) => (
          <div key={ex.id} className="flex items-center gap-3 rounded-card p-2">
            <button type="button" onClick={() => setPreview(ex)} aria-label={`Ver ${ex.namePt}`}>
              <img src={gifUrl(ex.id)} alt="" className="size-12 rounded-control object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            </button>
            <button type="button" onClick={() => onPick(ex)} className="flex flex-1 flex-col items-start text-left">
              <span className="text-[14px] font-bold text-ink">{ex.namePt}</span>
              <span className="mt-0.5 rounded-full bg-pink-tint px-2 py-0.5 text-[11px] font-bold text-pink-deep">{FOCUS_LABELS[ex.group]}</span>
            </button>
            <button type="button" aria-label="Ver execução" onClick={() => setPreview(ex)} className="text-ink-faint">⤢</button>
          </div>
        ))}
        {!loading && results.length === 0 ? (
          <p className="py-6 text-center text-[13px] font-semibold text-ink-read">Nada encontrado.</p>
        ) : null}
        <button type="button" onClick={onCustom}
          className="mt-1 flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-3 text-[13px] font-bold text-pink-deep">
          <PlusIcon size={16} weight="bold" /> Adicionar exercício personalizado
        </button>
      </div>

      {preview ? <GifViewer exercise={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-none rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${active ? "border-pink-bright bg-pink-bright text-white" : "border-hairline bg-lilac-tint-soft text-ink-read"}`}>
      {children}
    </button>
  );
}
```

- [ ] **Step 7: Checkpoint**

Run: `bun check-types` → sem erros (atenção ao aviso 71007 em `BuscaExercicio`/`GifViewer` por props de função — é ruído tolerado como em `swipeable-row`; só remover `"use client"` se o componente não usar hooks). Não-commitado.

---

### Task 9: Integrar no `TreinoModal` (view-swap, card catálogo/custom, wiring)

**Files:**
- Modify: `apps/web/src/app/(app)/treino/components/TreinoModal.tsx`
- Modify: `apps/web/src/app/(app)/treino/hooks/useTreinos.ts` (`WorkoutInput` ganha catalogId/muscleGroup)
- Modify: `apps/web/src/app/api/workouts/route.ts` e `apps/web/src/app/api/workouts/[id]/route.ts` (zod)
- Modify: `apps/web/src/server/workout/service.ts` (persistir catalogId/muscleGroup)

**Interfaces:**
- Consumes: `BuscaExercicio`, `GifViewer`, `CatalogExercise`, `gifUrl`, `FOCUS_LABELS`/`FOCUS_VALUES`.
- Produces: `WorkoutInput.exercises[]` ganha `catalogId: string | null; muscleGroup: Focus | null`.

- [ ] **Step 1: Estender `WorkoutInput` (front) + zod (rotas) + serviço**

`apps/web/src/app/(app)/treino/hooks/useTreinos.ts` — `WorkoutInput.exercises` item passa a:

```ts
{
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  position: number;
  catalogId: string | null;
  muscleGroup: Focus | null;
}
```
(importar `Focus` de `@/lib/api-types`).

Nas duas rotas (`route.ts` e `[id]/route.ts`), estender `EXERCISE_SCHEMA`:

```ts
const EXERCISE_SCHEMA = z.object({
  name: z.string().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(50),
  restSeconds: z.number().int().min(0).max(600),
  position: z.number().int().min(0),
  catalogId: z.string().nullable().optional(),
  muscleGroup: z.enum(FOCUS_VALUES).nullable().optional(),
});
```
(importar `FOCUS_VALUES` de `@/lib/api-types`).

Em `apps/web/src/server/workout/service.ts`: `ExerciseInput` ganha `catalogId?: string | null; muscleGroup?: Focus | null`; e nos dois `rows.map` (create + update) incluir `catalogId: e.catalogId ?? null, muscleGroup: e.muscleGroup ?? null`.

- [ ] **Step 2: `TreinoModal` — estado de view + tipo de linha**

Em `TreinoModal.tsx`, `ExRow` passa a carregar a origem:

```ts
type ExRow = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  catalogId: string | null;
  muscleGroup: Focus | null; // só p/ custom
};
```

Adicionar estado `const [view, setView] = useState<"form" | "busca">("form")`. Ajustar `useEffect` de seed do `editing` p/ preencher `catalogId`/`muscleGroup` a partir de `editing.exercises`. `submit()` mapeia os novos campos.

- [ ] **Step 3: `TreinoModal` — render condicional da view de busca**

No corpo do `BottomSheet`, quando `view === "busca"`, renderizar `<BuscaExercicio onBack={() => setView("form")} onPick={...} onCustom={...} />` (e ocultar o footer padrão nessa view — passar `footer={view === "form" ? <botão> : null}`). `onPick(ex)` adiciona uma linha `{ name: ex.namePt, catalogId: ex.id, muscleGroup: null, targetSets:3, targetReps:12, restSeconds:45 }` e volta pra `form`. `onCustom()` adiciona `NEW_ROW` (custom) e volta. O botão "Adicionar exercício" no form passa a `onClick={() => setView("busca")}`.

- [ ] **Step 4: `TreinoModal` — card catálogo vs custom**

No `map` de `rows`, ramificar por `r.catalogId`:
- **Catálogo:** thumb `gifUrl(r.catalogId)` (fallback ícone se falhar) + `r.name` como **label fixo** (não input) + chip do grupo (resolver via catálogo: guardar `group` na linha OU derivar; simplificar guardando `muscleGroup`/group no pick — ver nota) + "⤢ ver execução" (abre `GifViewer`) + os 3 `NumField`.
- **Custom:** ícone 🏋️ + input de nome editável + seletor de grupo opcional (8 `Chip`, seta `muscleGroup`) + os 3 `NumField`.

> Nota de dado: para exibir o chip/GIF do card do catálogo sem novo fetch, guardar na `ExRow` também `namePt`/`group`/`id` do `CatalogExercise` escolhido (campos só-de-UI, não enviados). Enviar ao back apenas `name`(=namePt), `catalogId`, `muscleGroup`(null p/ catálogo), séries/reps/descanso, position. O chip do catálogo usa o `group` guardado na linha.

- [ ] **Step 5: Ajustar `submit()`**

```ts
exercises: cleanRows.map((r, i) => ({
  name: r.name.trim(),
  targetSets: r.targetSets,
  targetReps: r.targetReps,
  restSeconds: r.restSeconds,
  position: i,
  catalogId: r.catalogId,
  muscleGroup: r.catalogId ? null : r.muscleGroup,
})),
```
`cleanRows` filtra por nome não-vazio (catálogo sempre tem nome; custom precisa digitar).

- [ ] **Step 6: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 10: GIF durante o treino em andamento

**Files:**
- Modify: `apps/web/src/app/(app)/treino/components/ExercicioList.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/SerieList.tsx`
- Modify: `apps/web/src/lib/api-types.ts` (SessionExercise ganha `catalogId`)
- Modify: `apps/web/src/server/workout/service.ts` (`SessionExercise` + `buildSessionDetail` expõem `catalogId`)

**Interfaces:**
- Consumes: `gifUrl`, `GifViewer`, `CatalogExercise` (para preview — buscar do catálogo ou montar mínimo).
- Produces: `SessionExercise` ganha `catalogId: string | null`.

- [ ] **Step 1: Expor `catalogId` na sessão**

Em `apps/web/src/lib/api-types.ts`, `SessionExercise` ganha `catalogId: string | null`.
Em `service.ts`: o tipo `SessionExercise` ganha `catalogId`; em `buildSessionDetail`, incluir `catalogId: ex.catalogId`.

- [ ] **Step 2: `ExercicioList` — thumb por exercício**

No card de cada exercício, se `ex.catalogId` → `<img src={gifUrl(ex.catalogId)}>` (size-12, `rounded-control`, `onError` → cai pro `IconChip barbell`); senão o `IconChip barbell` atual. Resto (nome, "N séries · carga", check/caret) igual.

- [ ] **Step 3: `SerieList` — thumb no header + ver execução**

No header, antes do nome, se `exercise.catalogId` → thumb `gifUrl` (toca → abre `GifViewer`); e um botão "⤢ ver execução" (chip rosa) que abre o `GifViewer`. O `GifViewer` precisa de um `CatalogExercise`; como a sessão só tem `catalogId`/`name`/`group` limitados, montar um objeto mínimo `{ id: catalogId, namePt: exercise.name, group: (derivar/omitir), secondaryMuscles: [] , ... }` OU (melhor) reusar o `useCatalogo` p/ achar o `CatalogExercise` pelo id. Decisão: **usar `useCatalogo`** no `SessaoAtiva` e passar o `CatalogExercise` resolvido; se não achar, esconder o ver-grande. Manter `SerieList`/`ExercicioList` recebendo só o que precisam via props (telas PT sem lógica).

> Ajuste em `SessaoAtiva.tsx`: já usa `useDescanso`; adicionar `useCatalogo` e uma função `catalogById(id)` para resolver o preview, passando p/ as views. Confirmar que não vira lógica de negócio pesada (é lookup puro).

- [ ] **Step 4: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 11: Verificação visual final (aceitação)

**Files:** nenhum (verificação).

- [ ] **Step 1: Typecheck + testes**

Run: `bun check-types` (raiz) → sem erros.
Run: `cd apps/web && bun run test` → tudo verde (inclui `catalog`, `buscaExercicios`, `gif`).
Run: `cd packages/db && bun test` → `muscle-group`, `parse-csv`, `catalog-pt` verdes.

- [ ] **Step 2: E2E na porta 3001** (após migration + seed aplicados; a usuária sobe o dev server)

Percorrer, confirmando fidelidade (rosa, sem vermelho, cantos) e comportamento:
1. `/treino` → "Novo treino" → "Adicionar exercício" abre a **view de busca** (dentro do sheet).
2. Digitar "supin" → acha "Supino…" (fuzzy/sem acento); tocar no **filtro** → escolher "Peito" → lista filtra; combinar texto+grupo.
3. Tocar no thumb/⤢ → **ver grande** (GIF 360, nome PT, músculos, © Gym Visual); fechar.
4. Escolher um do catálogo → card com **GIF + nome fixo + chip do grupo** + séries/reps/intervalo.
5. "＋ personalizado" → card **custom** com nome editável + **seletor de grupo opcional** (escolher vira o chip).
6. Salvar → aparece na lista. **Iniciar** → lista de exercícios com **thumb** por exercício; abrir → tela de séries com **thumb + ver execução**.
7. Marcar **Feito** → **contador de descanso** dispara com o tempo do exercício.
8. GIF que falhe → cai pro ícone 🏋️ (não quebra).

Expected: fluxo completo contra a API/dados reais. Deixar **não-commitado** para revisão da usuária.

---

## Self-Review

**Spec coverage:**
- Fonte `omercotkd` + seed + drop 0609 → Tasks 3,4,5. ✓
- GIF no R2 + base configurável → Task 5 (setup), Task 8 (`gifUrl`). ✓
- DB `exercise_catalog` + `exercise.catalogId`/`muscleGroup` → Task 1. ✓
- namePt (todos) + group mapeado, arquivo revisável → Tasks 2,4. ✓
- `GET /api/exercises` catálogo inteiro → Task 6. ✓
- Busca Fuse client-side (pesos, threshold 0.4, ignoreDiacritics) + filtro grupo → Task 7. ✓
- Tela de busca = view-swap no sheet, filtro-botão → Tasks 8,9. ✓
- Card catálogo (nome fixo+GIF) vs custom (nome editável+grupo opcional) → Task 9. ✓
- Ver-grande sem passos, © Gym Visual → Task 8. ✓
- GIF no treino em andamento → Task 10. ✓
- Sem `instructions`; sem `searchText`; domínio rosa; sem vermelho → Global Constraints + tasks. ✓

**Placeholder scan:** o único conteúdo não-inline é o `catalog-pt.json` (1.323 traduções) — inviável no plano, especificado como artefato gerado+revisado com teste de cobertura (Task 4). Nomes de env (`NEXT_PUBLIC_EXERCISE_GIF_BASE`) e helper de teste (`createTestDb`) marcados p/ confirmar no código real antes de usar. Sem TODO/TBD soltos.

**Type consistency:** `Focus` reusado (schema inline + `api-types`); `CatalogExercise` idêntico em serviço/hook/componentes; `Exercise`/`SessionExercise` ganham `catalogId`/`muscleGroup` consistentemente; `WorkoutInput` estendido bate com zod e serviço; `gifUrl(id)`/`buildFuse`/`searchExercises` com assinaturas usadas igual em Task 7/8.

## Riscos conhecidos (pré-implementação)

- **Bloqueios que exigem a usuária:** setup do R2 (Task 5.1) e aplicar migration/seed (Task 5.3) — o executor **para e pede**.
- **Curadoria PT** (Task 4) é o maior esforço manual; qualidade revisável.
- Confirmar no código real: nome/expo da var pública de env (`packages/env`), helper `createTestDb` dos testes de workout, e assinatura de `useResource`/`api` (já usados na Fase 5).
