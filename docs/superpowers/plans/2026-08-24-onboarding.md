# Onboarding de 3 passos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o fluxo de onboarding em 3 passos (água + porção, refeições, dias de treino) que grava as metas do usuário no primeiro acesso, com gate por `profile.onboardingCompletedAt`.

**Architecture:** Sete tasks em ordem de dependência, cada uma deixando o app funcionando. As três primeiras são servidor (constante compartilhada → serviço → rota) e não mudam nada visível. As três seguintes constroem a rota `/onboarding` de baixo pra cima (helpers puros → hook + layout do passo → telas), acessível manualmente ao fim da task 6. **O gate no `(app)/layout.tsx` é a última task de propósito:** ligá-lo antes de a rota existir jogaria todo usuário num 404.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Drizzle + libsql/Turso · zod · Tailwind 4 · Phosphor Icons · `bun test`

**Spec:** `docs/superpowers/specs/2026-08-24-onboarding-design.md`

## Global Constraints

- **NUNCA commitar.** O `CLAUDE.md` do projeto exige que a Larissa faça os commits depois de revisar. Este plano substitui passos de commit por **checkpoints de verificação**; entregue tudo como mudanças não-commitadas.
- **Nenhuma migration.** `onboarding_completed_at` veio na `0002` e `water_portion_ml` na `0017`. Se `bun db:generate` gerar arquivo novo, algo mudou no schema sem intenção — reverta.
- **Telas em PT, código em EN.** `page.tsx` só renderiza; lógica, consts e handlers vão para `hooks/` (`apps/web/CLAUDE.md`).
- **Serviços recebem `db: Db` por parâmetro**, levam `import "server-only"` e nunca importam de `app/`. Rotas são wrappers finos: zod → `requireUserId` → serviço (ADR-0001).
- **Faixas são contrato, passos são UI.** Água 500–5000 ml (passo 100) · porção 100–2000 ml (passo 50) · refeições 1–8 · treino 1–7. Fonte: `GOAL_LIMITS` (`server/goals/service.ts`) e `PORTION_LIMITS` (`server/profile/service.ts`) — **nunca redigite os números no zod**, importe as constantes.
- **Defaults: água 2000 ml · porção 500 ml · refeições 3 · treino 4 dias.** Nenhum outro valor.
- **Tamanho de fonte: só a escala nomeada do Tailwind** (`text-xs`, `text-sm`, `text-base`, `text-lg`…). **Nunca** `text-[13px]`. Não existe `text-md`.
- **Erros de API:** `{ "error": string }` + status. 401 já é tratado no `lib/api.ts`.
- **Rodar testes de dentro de `apps/web`** — o script injeta `--conditions react-server`, que neutraliza `server-only` nos imports. `bun test` na raiz não faz isso.
- **Ler cada arquivo antes de editar** (`cat`/`sed`/`head` NÃO contam para o harness). Se um `Edit` falhar com `string not found`, re-`Read` antes de tentar de novo — nunca editar de memória.
- **Sem teste de componente.** A convenção do repo é testar helpers e hooks puros. Tasks de UI terminam em `check-types` + verificação visual na rota.
- **Vocabulário: "copo" e "garrafa" não aparecem em texto de tela.** A hidratação fala em **ml** (decisão 4 da spec de Metas, mantida na decisão 6 desta).

---

## File Structure

**Servidor**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/src/lib/api-types.ts` | *(modificar)* `DEFAULT_GOAL_TARGETS` (alvos iniciais, client+server) e `OnboardingBody` (DTO do POST) |
| `apps/web/src/server/goals/service.ts` | *(modificar)* `DEFAULT_GOALS` deriva de `DEFAULT_GOAL_TARGETS` |
| `apps/web/src/server/onboarding/service.ts` | *(criar)* `isOnboarded` (leitura do gate) e `completeOnboarding` (escrita transacional) |
| `apps/web/src/server/onboarding/service.test.ts` | *(criar)* gate em 3 estados + idempotência do upsert + isolamento por usuário |
| `apps/web/src/app/api/onboarding/route.ts` | *(criar)* `POST` — zod com as faixas reais → serviço |
| `apps/web/src/app/(app)/layout.tsx` | *(modificar)* gate: onboarding pendente → `/onboarding` |
| `apps/web/src/server/today/service.ts:49-50` | *(modificar)* fallbacks passam a ler a constante |
| `apps/web/src/app/(app)/corpo/hooks/useGoals.ts:21-22` | *(modificar)* idem |
| `apps/web/src/app/(app)/metas/hooks/useMetas.ts:85-87` | *(modificar)* idem |

**Rota `/onboarding`**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/src/app/onboarding/page.tsx` | *(criar)* server: gate (sem sessão → `/login`; concluído → `/home`) |
| `apps/web/src/app/onboarding/components/FluxoOnboarding.tsx` | *(criar)* client: escolhe o passo atual |
| `apps/web/src/app/onboarding/components/PassoLayout.tsx` | *(criar)* progresso + "Passo N de 3" + Pular + hero + CTA + Voltar |
| `apps/web/src/app/onboarding/components/PassoAgua.tsx` | *(criar)* 2 steppers em ml + hint de porções + gotas |
| `apps/web/src/app/onboarding/components/PassoRefeicoes.tsx` | *(criar)* stepper 1–8 + chips decorativos |
| `apps/web/src/app/onboarding/components/PassoTreino.tsx` | *(criar)* `SeletorDias` + hint |
| `apps/web/src/app/onboarding/components/SeletorDias.tsx` | *(criar)* 7 círculos, devolve só a contagem |
| `apps/web/src/app/onboarding/hooks/useOnboarding.ts` | *(criar)* state, navegação, submit, skip |
| `apps/web/src/app/onboarding/hooks/format.ts` | *(criar)* `porcoesHint`, `diasHint`, `onboardingPayload` (puros) |
| `apps/web/src/app/onboarding/hooks/format.test.ts` | *(criar)* testes dos três helpers |
| `packages/ui/src/styles/globals.css` | *(modificar)* token `--animate-fade-in` + entrada no bloco `prefers-reduced-motion` |

---

## Task 1: `DEFAULT_GOAL_TARGETS` como fonte única

**Files:**
- Modify: `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/server/goals/service.ts:7-11`
- Modify: `apps/web/src/server/today/service.ts:49-50`
- Modify: `apps/web/src/app/(app)/corpo/hooks/useGoals.ts:21-22`
- Modify: `apps/web/src/app/(app)/metas/hooks/useMetas.ts:85-87`
- Test: `apps/web/src/server/goals/service.test.ts` *(acrescentar um teste)*

**Interfaces:**
- Consumes: nada
- Produces:
  - `DEFAULT_GOAL_TARGETS: { readonly water: 2000; readonly meals: 3; readonly workout: 4 }` em `@/lib/api-types`
  - `OnboardingBody = { waterMl: number; portionMl: number; meals: number; workoutDays: number }` em `@/lib/api-types`
  - `DEFAULT_GOALS` inalterado em forma e valores — só a origem dos números muda

- [ ] **Step 1: Escrever o teste que falha**

Em `apps/web/src/server/goals/service.test.ts`, acrescente o import e o teste dentro do `describe("ensureGoals")` que já existe:

```ts
import { DEFAULT_GOAL_TARGETS, type GoalDomain } from "@/lib/api-types";
```

```ts
  test("os alvos iniciais saem de DEFAULT_GOAL_TARGETS", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const goals = await ensureGoals(db, userId);
    const target = (domain: GoalDomain) => goals.find((g) => g.domain === domain)!.target;

    expect(target("water")).toBe(DEFAULT_GOAL_TARGETS.water);
    expect(target("meals")).toBe(DEFAULT_GOAL_TARGETS.meals);
    expect(target("workout")).toBe(DEFAULT_GOAL_TARGETS.workout);
  });
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/goals/service.test.ts
```

Esperado: FALHA no import — `DEFAULT_GOAL_TARGETS` não existe em `api-types.ts`.

- [ ] **Step 3: Criar as constantes compartilhadas**

Em `apps/web/src/lib/api-types.ts`, logo **acima** de `export const DEFAULT_PORTION_ML = 500;` (linha 56):

```ts
/** Alvos iniciais de cada meta. Compartilhado de propósito: `DEFAULT_GOALS` (servidor)
 *  deriva daqui, e as telas usam como fallback de render antes do fetch — o número não
 *  pode existir em dois lugares. */
export const DEFAULT_GOAL_TARGETS = {
  water: 2000,
  meals: 3,
  workout: 4,
} as const satisfies Record<GoalDomain, number>;
```

E no fim do bloco de tipos de metas (depois de `export type Goal = {...}`), o DTO do POST:

```ts
/** Corpo do `POST /api/onboarding`. Os quatro valores são obrigatórios: o client sempre
 *  tem todos em mãos (default ou escolhido), então campo opcional só criaria um segundo
 *  lugar onde o default é decidido. */
export type OnboardingBody = {
  waterMl: number;
  portionMl: number;
  meals: number;
  workoutDays: number;
};
```

- [ ] **Step 4: Derivar `DEFAULT_GOALS` da constante**

Em `apps/web/src/server/goals/service.ts`, acrescente o import e troque o array (linhas 7–11):

```ts
import { DEFAULT_GOAL_TARGETS } from "@/lib/api-types";
```

```ts
export const DEFAULT_GOALS = [
  { domain: "water", target: DEFAULT_GOAL_TARGETS.water, unit: "ml", period: "day" },
  { domain: "meals", target: DEFAULT_GOAL_TARGETS.meals, unit: "count", period: "day" },
  { domain: "workout", target: DEFAULT_GOAL_TARGETS.workout, unit: "days", period: "week" },
] as const;
```

Importar `@/lib/api-types` de dentro de um módulo `server-only` é o padrão do repo — `server/shared/units.ts:1` já faz exatamente isso com `DEFAULT_PORTION_ML`.

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/goals/service.test.ts
```

Esperado: PASSA — todos os testes do arquivo, inclusive os que já existiam.

- [ ] **Step 6: Substituir os três fallbacks hardcoded**

`apps/web/src/server/today/service.ts` — acrescente `DEFAULT_GOAL_TARGETS` ao import de `@/lib/api-types` (ou crie o import se não houver) e troque as linhas 49–50:

```ts
  const waterGoalMl = goals.find((g) => g.domain === "water")?.target ?? DEFAULT_GOAL_TARGETS.water;
  const mealsTarget = goals.find((g) => g.domain === "meals")?.target ?? DEFAULT_GOAL_TARGETS.meals;
```

`apps/web/src/app/(app)/corpo/hooks/useGoals.ts` — acrescente `DEFAULT_GOAL_TARGETS` ao import existente de `@/lib/api-types` e troque as linhas 21–22:

```ts
    waterGoalMl: target("water", DEFAULT_GOAL_TARGETS.water),
    mealsTarget: target("meals", DEFAULT_GOAL_TARGETS.meals),
```

`apps/web/src/app/(app)/metas/hooks/useMetas.ts` — acrescente `DEFAULT_GOAL_TARGETS` ao import existente de `@/lib/api-types` e troque as linhas 85–87:

```ts
  const waterGoalMl = targetOf("water", DEFAULT_GOAL_TARGETS.water);
  const mealsTarget = targetOf("meals", DEFAULT_GOAL_TARGETS.meals);
  const workoutTarget = targetOf("workout", DEFAULT_GOAL_TARGETS.workout);
```

- [ ] **Step 7: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test
```

Esperado: ambos limpos. Confirme que o literal `2000` como alvo de meta não sobrou:

```bash
cd /home/larissa/Projects/bloomy && grep -rn '"water", 2000\|?? 2000\|water: 2000' apps/web/src
```

Esperado: nenhuma linha (o `2000` que sobra em `api-types.ts`, `WaterModal.tsx`, `DiarioCard.tsx` e nas rotas de check-in é outra coisa — `max`, `maxLength` — e deve ficar).

---

## Task 2: `server/onboarding/service.ts` — gate e escrita transacional

**Files:**
- Create: `apps/web/src/server/onboarding/service.ts`
- Create: `apps/web/src/server/onboarding/service.test.ts`

**Interfaces:**
- Consumes: `OnboardingBody` e `DEFAULT_GOAL_TARGETS` de `@/lib/api-types` (Task 1); `ensureGoals` de `@/server/goals/service` e `ensureProfile` de `@/server/profile/service` (só nos testes)
- Produces:
  - `isOnboarded(db: Db, userId: string): Promise<boolean>`
  - `completeOnboarding(db: Db, userId: string, input: OnboardingBody): Promise<{ goals: Goal[]; profile: Profile }>` — `Goal` de `@bloomy/db/schema/goals`, `Profile` de `@bloomy/db/schema/profile`

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/server/onboarding/service.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { goal } from "@bloomy/db/schema/goals";

import { DEFAULT_GOAL_TARGETS, type OnboardingBody } from "@/lib/api-types";
import { ensureGoals } from "@/server/goals/service";
import { ensureProfile } from "@/server/profile/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";

import { completeOnboarding, isOnboarded } from "./service";

afterAll(cleanupTestDbs);

const INPUT: OnboardingBody = { waterMl: 2500, portionMl: 250, meals: 4, workoutDays: 5 };

const targetOf = (goals: { domain: string; target: number }[], domain: string) =>
  goals.find((g) => g.domain === domain)!.target;

describe("isOnboarded", () => {
  test("sem linha de profile conta como pendente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await isOnboarded(db, userId)).toBe(false);
  });

  test("profile criado mas nunca concluído segue pendente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureProfile(db, userId);

    expect(await isOnboarded(db, userId)).toBe(false);
  });

  test("depois de completeOnboarding fica concluído", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await completeOnboarding(db, userId, INPUT);

    expect(await isOnboarded(db, userId)).toBe(true);
  });
});

describe("completeOnboarding", () => {
  test("cria as 3 metas, grava a porção e marca a conclusão", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const { goals, profile } = await completeOnboarding(db, userId, INPUT);

    expect(goals.map((g) => g.domain).sort()).toEqual(["meals", "water", "workout"]);
    expect(targetOf(goals, "water")).toBe(2500);
    expect(targetOf(goals, "meals")).toBe(4);
    expect(targetOf(goals, "workout")).toBe(5);
    expect(profile.waterPortionMl).toBe(250);
    expect(profile.onboardingCompletedAt).not.toBeNull();
  });

  test("sobrescreve metas já criadas pelo ensureGoals sem violar o UNIQUE", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureGoals(db, userId); // já existem 2000/3/4

    const { goals } = await completeOnboarding(db, userId, INPUT);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
    expect(targetOf(goals, "workout")).toBe(5);
  });

  test("segunda chamada é idempotente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await completeOnboarding(db, userId, INPUT);

    const { goals } = await completeOnboarding(db, userId, INPUT);

    expect(goals).toHaveLength(3);
    expect(targetOf(goals, "water")).toBe(2500);
  });

  test("não toca nas metas de outro usuário", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    await ensureGoals(db, other);

    await completeOnboarding(db, owner, INPUT);

    const rows = await db.select().from(goal).where(eq(goal.userId, other));
    expect(targetOf(rows, "water")).toBe(DEFAULT_GOAL_TARGETS.water);
    expect(await isOnboarded(db, other)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/onboarding/service.test.ts
```

Esperado: FALHA — `./service` não existe.

- [ ] **Step 3: Escrever o serviço**

Crie `apps/web/src/server/onboarding/service.ts`:

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { profile, type Profile } from "@bloomy/db/schema/profile";
import { eq } from "drizzle-orm";

import type { OnboardingBody } from "@/lib/api-types";

/**
 * Estado do gate. Só lê: `ensureProfile` faz INSERT, e usá-lo no layout viraria uma
 * escrita a cada navegação dentro de `(app)`. Linha de profile ausente conta como
 * pendente — o profile só nasce quando alguém toca `/api/profile`.
 */
export async function isOnboarded(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ completedAt: profile.onboardingCompletedAt })
    .from(profile)
    .where(eq(profile.userId, userId));

  return row?.completedAt != null;
}

/**
 * Grava as 3 metas, a porção e a conclusão numa transação. Idempotente: reenvio
 * (duplo clique, aba antiga) regrava os mesmos valores em vez de estourar o
 * `UNIQUE(user_id, domain)`.
 */
export async function completeOnboarding(
  db: Db,
  userId: string,
  input: OnboardingBody,
): Promise<{ goals: Goal[]; profile: Profile }> {
  const now = new Date();
  const rows = [
    { domain: "water", target: input.waterMl, unit: "ml", period: "day" },
    { domain: "meals", target: input.meals, unit: "count", period: "day" },
    { domain: "workout", target: input.workoutDays, unit: "days", period: "week" },
  ] as const;

  return db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(goal)
        .values({ ...row, userId })
        .onConflictDoUpdate({
          target: [goal.userId, goal.domain],
          set: { target: row.target, updatedAt: now },
        });
    }

    // Inline com `tx` em vez de chamar `ensureProfile`: o helper recebe `Db`, e o `tx`
    // do drizzle não é assinável a esse tipo. Mesmo padrão das transações que já
    // existem em `health/service.ts` e `workout/session.ts`.
    await tx.insert(profile).values({ userId }).onConflictDoNothing();
    const [updated] = await tx
      .update(profile)
      .set({
        waterPortionMl: input.portionMl,
        onboardingCompletedAt: now,
        updatedAt: now,
      })
      .where(eq(profile.userId, userId))
      .returning();

    const goals = await tx.select().from(goal).where(eq(goal.userId, userId));
    return { goals, profile: updated };
  });
}
```

As faixas **não** são revalidadas aqui: o zod da rota (Task 3) barra com os mesmos `GOAL_LIMITS`/`PORTION_LIMITS`, e diferente do `PUT /api/goals/[id]` o handler sabe qual domínio é cada número — não existe o problema que obrigou `updateGoal` a validar por dentro.

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/onboarding/service.test.ts
```

Esperado: PASSA — 8 testes.

Se o teste de idempotência falhar com `UNIQUE constraint failed`, o `onConflictDoUpdate` está com o `target` errado: precisa ser `[goal.userId, goal.domain]`, as duas colunas do índice `goal_user_domain_idx`.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test
```

Esperado: ambos limpos. Nada mudou de comportamento visível — o serviço existe mas ninguém o chama ainda.

---

## Task 3: `POST /api/onboarding`

**Files:**
- Create: `apps/web/src/app/api/onboarding/route.ts`

**Interfaces:**
- Consumes: `completeOnboarding` (Task 2), `GOAL_LIMITS` de `@/server/goals/service`, `PORTION_LIMITS` de `@/server/profile/service`
- Produces: `POST /api/onboarding` com body `OnboardingBody` → `{ goals, profile }` · 401 sem sessão · 400 em body inválido

- [ ] **Step 1: Escrever a rota**

Crie `apps/web/src/app/api/onboarding/route.ts`:

```ts
import { db } from "@bloomy/db";
import { z } from "zod";

import { invalidBody, parseJson, requireUserId, unauthorized } from "@/server/shared/api";
import { GOAL_LIMITS } from "@/server/goals/service";
import { completeOnboarding } from "@/server/onboarding/service";
import { PORTION_LIMITS } from "@/server/profile/service";

// As faixas vêm das constantes dos serviços — redigitar os números aqui criaria uma
// segunda fonte de verdade que sai de sincronia no primeiro ajuste.
const BODY_SCHEMA = z.object({
  waterMl: z.number().int().min(GOAL_LIMITS.water.min).max(GOAL_LIMITS.water.max),
  portionMl: z.number().int().min(PORTION_LIMITS.min).max(PORTION_LIMITS.max),
  meals: z.number().int().min(GOAL_LIMITS.meals.min).max(GOAL_LIMITS.meals.max),
  workoutDays: z.number().int().min(GOAL_LIMITS.workout.min).max(GOAL_LIMITS.workout.max),
});

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  // Sem guarda de "já concluiu": a rota é idempotente de propósito (decisão 14 da spec)
  // e quem já concluiu não chega na tela — o gate da page redireciona.
  const { goals, profile } = await completeOnboarding(db, userId, parsed.data);
  return Response.json({ goals, profile });
}
```

- [ ] **Step 2: Subir o dev server**

```bash
cd /home/larissa/Projects/bloomy && bun dev:web
```

Rode em background (ou pelo `/dev-up`) e deixe rodando até o fim do plano.

- [ ] **Step 3: Verificar a rota com curl**

O fallback `DEV_USER_EMAIL` do `server/shared/api.ts` responde como o usuário do `.env` quando não há sessão, então curl funciona sem cookie. Body válido:

```bash
curl -s -X POST localhost:3001/api/onboarding \
  -H 'content-type: application/json' \
  -d '{"waterMl":2500,"portionMl":250,"meals":4,"workoutDays":5}' | head -c 400
```

Esperado: JSON com `goals` (3 itens, alvos 2500/4/5) e `profile` com `waterPortionMl: 250` e `onboardingCompletedAt` preenchido.

Body fora da faixa:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3001/api/onboarding \
  -H 'content-type: application/json' \
  -d '{"waterMl":90000,"portionMl":250,"meals":4,"workoutDays":5}'
```

Esperado: `400`.

Body incompleto:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3001/api/onboarding \
  -H 'content-type: application/json' -d '{"waterMl":2500}'
```

Esperado: `400`.

- [ ] **Step 4: Desfazer o efeito do curl no banco de dev**

O curl marcou o usuário de dev como concluído e mudou as metas dele. Antes de seguir, devolva ao estado pendente pelo studio (`bun db:studio`): em `profile`, limpe `onboarding_completed_at` e volte `water_portion_ml` para 500; em `goal`, volte os alvos para 2000/3/4. Isso é necessário para poder testar o fluxo real nas tasks 6 e 7.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: limpo.

---

## Task 4: Helpers puros do onboarding

**Files:**
- Create: `apps/web/src/app/onboarding/hooks/format.ts`
- Create: `apps/web/src/app/onboarding/hooks/format.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_GOAL_TARGETS` e `OnboardingBody` de `@/lib/api-types` (Task 1); `portions` de `@/server/shared/units`
- Produces:
  - `OnboardingState = { step: 1 | 2 | 3; waterMl: number; portionMl: number; meals: number; workoutDays: Set<number> }`
  - `porcoesHint(goalMl: number, portionMl: number): string`
  - `diasHint(count: number): string`
  - `onboardingPayload(state: OnboardingState): OnboardingBody`

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/app/onboarding/hooks/format.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { diasHint, onboardingPayload, porcoesHint, type OnboardingState } from "./format";

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
  step: 1,
  waterMl: 2000,
  portionMl: 500,
  meals: 3,
  workoutDays: new Set(),
  ...over,
});

describe("porcoesHint", () => {
  it("divide a meta pela porção", () => {
    expect(porcoesHint(2000, 500)).toBe("≈ 4 porções por dia");
    expect(porcoesHint(2000, 250)).toBe("≈ 8 porções por dia");
  });
  it("usa o singular quando a meta cabe numa porção", () => {
    expect(porcoesHint(500, 500)).toBe("≈ 1 porção por dia");
  });
});

describe("diasHint", () => {
  it("anuncia o default quando nada foi escolhido", () => {
    expect(diasHint(0)).toBe("Sem dias escolhidos — vamos usar 4 dias por semana");
  });
  it("concorda em número", () => {
    expect(diasHint(1)).toBe("1 dia por semana");
    expect(diasHint(5)).toBe("5 dias por semana");
  });
});

describe("onboardingPayload", () => {
  it("manda a contagem de dias marcados", () => {
    const payload = onboardingPayload(state({ workoutDays: new Set([0, 1, 3, 4, 5]) }));
    expect(payload).toEqual({ waterMl: 2000, portionMl: 500, meals: 3, workoutDays: 5 });
  });
  it("nenhum dia marcado cai no default, nunca em zero", () => {
    expect(onboardingPayload(state()).workoutDays).toBe(4);
  });
  it("carrega os valores escolhidos nos outros passos", () => {
    const payload = onboardingPayload(state({ waterMl: 3000, portionMl: 250, meals: 5 }));
    expect(payload.waterMl).toBe(3000);
    expect(payload.portionMl).toBe(250);
    expect(payload.meals).toBe(5);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/app/onboarding/hooks/format.test.ts
```

Esperado: FALHA — `./format` não existe.

- [ ] **Step 3: Escrever os helpers**

Crie `apps/web/src/app/onboarding/hooks/format.ts`:

```ts
import { DEFAULT_GOAL_TARGETS, type OnboardingBody } from "@/lib/api-types";
import { portions } from "@/server/shared/units";

export type OnboardingState = {
  step: 1 | 2 | 3;
  waterMl: number;
  portionMl: number;
  meals: number;
  /** Índices 0..6 (segunda→domingo). Vazio = ninguém escolheu; cai no default. */
  workoutDays: Set<number>;
};

/**
 * Hint vivo do passo 1. Duplica o `portionHint` de `metas/hooks/format.ts` de propósito:
 * importar helper de uma pasta de rota para outra acoparia duas telas sem relação, e o
 * arredondamento — a parte que precisa ser única — mora em `portions()`.
 */
export function porcoesHint(goalMl: number, portionMl: number): string {
  const { target } = portions(0, goalMl, portionMl);
  return target === 1 ? "≈ 1 porção por dia" : `≈ ${target} porções por dia`;
}

/** Hint do passo 3. Zero anuncia o default em vez de aplicá-lo em silêncio. */
export function diasHint(count: number): string {
  if (count === 0) {
    return `Sem dias escolhidos — vamos usar ${DEFAULT_GOAL_TARGETS.workout} dias por semana`;
  }
  return count === 1 ? "1 dia por semana" : `${count} dias por semana`;
}

/** State → body do POST. Zero dias vira o default: `GOAL_LIMITS.workout.min` é 1. */
export function onboardingPayload(state: OnboardingState): OnboardingBody {
  return {
    waterMl: state.waterMl,
    portionMl: state.portionMl,
    meals: state.meals,
    workoutDays:
      state.workoutDays.size === 0 ? DEFAULT_GOAL_TARGETS.workout : state.workoutDays.size,
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/app/onboarding/hooks/format.test.ts
```

Esperado: PASSA — 7 testes.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test
```

Esperado: ambos limpos.

---

## Task 5: Token de fade, `PassoLayout` e `useOnboarding`

**Files:**
- Modify: `packages/ui/src/styles/globals.css:124-143`
- Create: `apps/web/src/app/onboarding/components/PassoLayout.tsx`
- Create: `apps/web/src/app/onboarding/hooks/useOnboarding.ts`

**Interfaces:**
- Consumes: `OnboardingState`, `onboardingPayload` (Task 4); `api.post` de `@/lib/api`; `toastError` de `@/lib/toast`; `TONE`/`Tone` de `@/lib/tone`
- Produces:
  - classe `animate-fade-in`
  - `PassoLayout` com props `{ step: 1|2|3; tone: Tone; icon: ReactNode; title: string; subtitle: string; ctaLabel: string; pending: boolean; onNext: () => void; onSkip: () => void; onBack?: () => void; children: ReactNode }`
  - `useOnboarding()` → `{ state, pending, setWaterMl, setPortionMl, setMeals, toggleDay, advance, back, skip }`

- [ ] **Step 1: Adicionar o token de fade**

Em `packages/ui/src/styles/globals.css`, depois do bloco `--animate-rise-in` (que termina na linha 135) e **antes** do `}` que fecha o `@theme`:

```css
  --animate-fade-in: fade-in 0.15s ease-out both;
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
```

E acrescente a classe ao bloco de acessibilidade que já existe (linha ~138):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-grow-stem,
  .animate-bloom-pop,
  .animate-rise-in,
  .animate-fade-in {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Escrever o `PassoLayout`**

Crie `apps/web/src/app/onboarding/components/PassoLayout.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

/** Moldura comum dos 3 passos: progresso, "Passo N de 3", Pular, hero, CTA e Voltar.
 *  O conteúdo específico de cada passo entra por `children`. */
export function PassoLayout({
  step,
  tone,
  icon,
  title,
  subtitle,
  ctaLabel,
  pending,
  onNext,
  onSkip,
  onBack,
  children,
}: {
  step: 1 | 2 | 3;
  tone: Tone;
  icon: ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  pending: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const t = TONE[tone];

  return (
    <div className="flex min-h-dvh flex-col px-7 pt-4 pb-8">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              n <= step ? "bg-lilac" : "bg-control-off",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs font-bold text-ink-faint">Passo {step} de 3</span>
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-xs font-bold text-lilac-deep disabled:opacity-60"
        >
          Pular
        </button>
      </div>

      {/* `key={step}` re-monta o bloco a cada passo, o que redispara o fade. */}
      <div
        key={step}
        className="animate-fade-in flex flex-1 flex-col items-center justify-center text-center"
      >
        <div className={cn("grid size-28 place-items-center rounded-full", t.tint, t.deep)}>
          {icon}
        </div>
        <h1 className="max-w-64 pt-5 font-display text-2xl font-bold text-ink">{title}</h1>
        <p className="max-w-64 pt-2 pb-7 text-sm font-semibold text-ink-read">{subtitle}</p>
        {children}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={pending}
        className="w-full rounded-control bg-lilac py-4 font-display font-bold text-white shadow-btn disabled:opacity-60"
      >
        {ctaLabel}
      </button>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="pt-3 text-sm font-bold text-ink-read disabled:opacity-60"
        >
          Voltar
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Escrever o hook**

Crie `apps/web/src/app/onboarding/hooks/useOnboarding.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import {
  DEFAULT_GOAL_TARGETS,
  DEFAULT_PORTION_ML,
  type Goal,
  type Profile,
} from "@/lib/api-types";
import { toastError } from "@/lib/toast";

import { onboardingPayload, type OnboardingState } from "./format";

export function useOnboarding() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    waterMl: DEFAULT_GOAL_TARGETS.water,
    portionMl: DEFAULT_PORTION_ML,
    meals: DEFAULT_GOAL_TARGETS.meals,
    workoutDays: new Set(),
  });

  /** Único caminho de escrita: o "Pular" é este mesmo submit, antecipado. */
  const finish = useCallback(
    async (current: OnboardingState) => {
      setPending(true);
      try {
        await api.post<{ goals: Goal[]; profile: Profile }>(
          "/api/onboarding",
          onboardingPayload(current),
        );
        // `replace`, não `push`: concluído o fluxo, o botão voltar do browser não deve
        // reabri-lo. Quem tentar cai no gate da page e volta pra Home.
        router.replace("/home");
      } catch (e) {
        setPending(false);
        toastError(e, "Não foi possível salvar suas metas. Tente de novo.");
      }
      // Sem `setPending(false)` no sucesso: a navegação desmonta a tela.
    },
    [router],
  );

  const advance = useCallback(() => {
    if (state.step === 3) {
      void finish(state);
      return;
    }
    setState((s) => ({ ...s, step: (s.step + 1) as 2 | 3 }));
  }, [state, finish]);

  const back = useCallback(() => {
    setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as 1 | 2 }));
  }, []);

  const toggleDay = useCallback((index: number) => {
    setState((s) => {
      const next = new Set(s.workoutDays);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...s, workoutDays: next };
    });
  }, []);

  return {
    state,
    pending,
    setWaterMl: useCallback((waterMl: number) => setState((s) => ({ ...s, waterMl })), []),
    setPortionMl: useCallback((portionMl: number) => setState((s) => ({ ...s, portionMl })), []),
    setMeals: useCallback((meals: number) => setState((s) => ({ ...s, meals })), []),
    toggleDay,
    advance,
    back,
    skip: useCallback(() => void finish(state), [state, finish]),
  };
}
```

- [ ] **Step 4: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test
```

Esperado: ambos limpos. Nada renderiza ainda — as telas vêm na Task 6.

---

## Task 6: As três telas e a rota `/onboarding`

**Files:**
- Create: `apps/web/src/app/onboarding/components/SeletorDias.tsx`
- Create: `apps/web/src/app/onboarding/components/PassoAgua.tsx`
- Create: `apps/web/src/app/onboarding/components/PassoRefeicoes.tsx`
- Create: `apps/web/src/app/onboarding/components/PassoTreino.tsx`
- Create: `apps/web/src/app/onboarding/components/FluxoOnboarding.tsx`
- Create: `apps/web/src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: `PassoLayout`, `useOnboarding` (Task 5); `porcoesHint`, `diasHint` (Task 4); `isOnboarded` (Task 2); `Stepper` de `@/components/stepper`; `portions` de `@/server/shared/units`
- Produces: rota `/onboarding` renderizável, com gate próprio

- [ ] **Step 1: Escrever o `SeletorDias`**

Crie `apps/web/src/app/onboarding/components/SeletorDias.tsx`:

```tsx
"use client";

import { cn } from "@bloomy/ui/lib/utils";

/** Segunda→domingo. A inicial repete (S, T, Q, Q, S, S, D) — o `aria-label` desambigua. */
const DIAS = [
  { letra: "S", nome: "Segunda-feira" },
  { letra: "T", nome: "Terça-feira" },
  { letra: "Q", nome: "Quarta-feira" },
  { letra: "Q", nome: "Quinta-feira" },
  { letra: "S", nome: "Sexta-feira" },
  { letra: "S", nome: "Sábado" },
  { letra: "D", nome: "Domingo" },
];

/** Escolha visual dos dias. Só a contagem sai daqui: `goal.workout` guarda um número,
 *  e nenhuma tela do app consome dia-da-semana hoje (decisão 7 da spec). */
export function SeletorDias({
  selected,
  onToggle,
}: {
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {DIAS.map((dia, i) => (
        <button
          key={dia.nome}
          type="button"
          aria-label={dia.nome}
          aria-pressed={selected.has(i)}
          onClick={() => onToggle(i)}
          className={cn(
            "grid size-9 place-items-center rounded-full text-sm font-bold transition-colors",
            selected.has(i) ? "bg-pink-bright text-white" : "bg-pink-tint text-ink-faint",
          )}
        >
          {dia.letra}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Escrever o `PassoAgua`**

Crie `apps/web/src/app/onboarding/components/PassoAgua.tsx`:

```tsx
"use client";

import { DropIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";
import { portions } from "@/server/shared/units";

import { porcoesHint } from "../hooks/format";
import { PassoLayout } from "./PassoLayout";

/** Acima disso a fileira de gotas vira ruído numa coluna de 342 px — mesmo teto da Corpo. */
const MAX_GOTAS = 12;

export function PassoAgua({
  waterMl,
  portionMl,
  pending,
  onWaterMl,
  onPortionMl,
  onNext,
  onSkip,
}: {
  waterMl: number;
  portionMl: number;
  pending: boolean;
  onWaterMl: (ml: number) => void;
  onPortionMl: (ml: number) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { target } = portions(0, waterMl, portionMl);

  return (
    <PassoLayout
      step={1}
      tone="lilac"
      icon={<DropIcon size={52} weight="fill" />}
      title="Quanto de água por dia?"
      subtitle="A gente conta as porções ao longo do dia."
      ctaLabel="Continuar"
      pending={pending}
      onNext={onNext}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">Meta do dia</span>
          <Stepper
            value={waterMl}
            min={500}
            max={5000}
            step={100}
            unit="ml"
            onChange={onWaterMl}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">Cada porção</span>
          <Stepper
            value={portionMl}
            min={100}
            max={2000}
            step={50}
            unit="ml"
            onChange={onPortionMl}
          />
        </div>
        <p className="text-sm font-semibold text-ink-faint">{porcoesHint(waterMl, portionMl)}</p>
        <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
          {Array.from({ length: Math.min(target, MAX_GOTAS) }, (_, i) => (
            <DropIcon key={i} size={20} weight="fill" className="text-lilac" />
          ))}
        </div>
      </div>
    </PassoLayout>
  );
}
```

As faixas repetem os números de `GOAL_LIMITS`/`PORTION_LIMITS` porque aquelas constantes moram em módulo `server-only`. É o mesmo compromisso já documentado em `metas/hooks/useMetas.ts`: o servidor segue dono da regra, aqui é só o alcance do stepper.

- [ ] **Step 3: Escrever o `PassoRefeicoes`**

Crie `apps/web/src/app/onboarding/components/PassoRefeicoes.tsx`:

```tsx
"use client";

import { ForkKnifeIcon } from "@phosphor-icons/react";

import { Stepper } from "@/components/stepper";

import { PassoLayout } from "./PassoLayout";

export function PassoRefeicoes({
  meals,
  pending,
  onMeals,
  onNext,
  onBack,
  onSkip,
}: {
  meals: number;
  pending: boolean;
  onMeals: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={2}
      tone="green"
      icon={<ForkKnifeIcon size={50} weight="fill" />}
      title="Quantas refeições por dia?"
      subtitle="Sem contar calorias — só pra você não esquecer."
      ctaLabel="Continuar"
      pending={pending}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col gap-6">
        <Stepper value={meals} min={1} max={8} step={1} onChange={onMeals} />
        {/* Chips decorativos: ilustram o que "3 refeições" costuma ser, não são escolha. */}
        <div className="flex justify-center gap-2" aria-hidden>
          {["Café", "Almoço", "Jantar"].map((label) => (
            <span
              key={label}
              className="rounded-full bg-green-tint px-3.5 py-2 text-xs font-bold text-green-deep"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </PassoLayout>
  );
}
```

- [ ] **Step 4: Escrever o `PassoTreino`**

Crie `apps/web/src/app/onboarding/components/PassoTreino.tsx`:

```tsx
"use client";

import { BarbellIcon } from "@phosphor-icons/react";

import { diasHint } from "../hooks/format";
import { PassoLayout } from "./PassoLayout";
import { SeletorDias } from "./SeletorDias";

export function PassoTreino({
  selected,
  pending,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: {
  selected: Set<number>;
  pending: boolean;
  onToggle: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  return (
    <PassoLayout
      step={3}
      tone="pink"
      icon={<BarbellIcon size={50} weight="fill" />}
      title="Quantos dias de treino?"
      subtitle="Escolha os dias que você costuma treinar."
      ctaLabel="Começar a usar"
      pending={pending}
      onNext={onNext}
      onBack={onBack}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col items-center gap-4">
        <SeletorDias selected={selected} onToggle={onToggle} />
        <p className="max-w-64 text-sm font-bold text-pink-deep">{diasHint(selected.size)}</p>
      </div>
    </PassoLayout>
  );
}
```

- [ ] **Step 5: Escrever o `FluxoOnboarding`**

Crie `apps/web/src/app/onboarding/components/FluxoOnboarding.tsx`:

```tsx
"use client";

import { useOnboarding } from "../hooks/useOnboarding";
import { PassoAgua } from "./PassoAgua";
import { PassoRefeicoes } from "./PassoRefeicoes";
import { PassoTreino } from "./PassoTreino";

export function FluxoOnboarding() {
  const {
    state,
    pending,
    setWaterMl,
    setPortionMl,
    setMeals,
    toggleDay,
    advance,
    back,
    skip,
  } = useOnboarding();

  if (state.step === 1) {
    return (
      <PassoAgua
        waterMl={state.waterMl}
        portionMl={state.portionMl}
        pending={pending}
        onWaterMl={setWaterMl}
        onPortionMl={setPortionMl}
        onNext={advance}
        onSkip={skip}
      />
    );
  }

  if (state.step === 2) {
    return (
      <PassoRefeicoes
        meals={state.meals}
        pending={pending}
        onMeals={setMeals}
        onNext={advance}
        onBack={back}
        onSkip={skip}
      />
    );
  }

  return (
    <PassoTreino
      selected={state.workoutDays}
      pending={pending}
      onToggle={toggleDay}
      onNext={advance}
      onBack={back}
      onSkip={skip}
    />
  );
}
```

- [ ] **Step 6: Escrever a `page.tsx` com o gate**

Crie `apps/web/src/app/onboarding/page.tsx`:

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";
import { db } from "@bloomy/db";

import { isOnboarded } from "@/server/onboarding/service";

import { FluxoOnboarding } from "./components/FluxoOnboarding";

/** Fora do grupo `(app)`: sem tab bar, porque o fluxo é linear. Gate próprio — sem ele,
 *  quem já concluiu poderia digitar a URL e sobrescrever as próprias metas sem querer. */
export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (await isOnboarded(db, session.user.id)) redirect("/home");

  return <FluxoOnboarding />;
}
```

- [ ] **Step 7: Verificação visual da rota**

Com o dev server rodando, abra `http://localhost:3001/onboarding` (logada, com `onboarding_completed_at` nulo — o estado que a Task 3 Step 4 restaurou) e confira:

- Passo 1: hero lilás com gota, dois steppers em ml, hint "≈ 4 porções por dia"; mudar a porção para 250 faz o hint virar "≈ 8 porções por dia" e a fileira de gotas acompanha (teto de 12)
- "Continuar" → passo 2 com fade; chips Café/Almoço/Jantar; stepper de 1 a 8
- "Voltar" → passo 1 **com os valores preservados**
- Passo 3: nenhum dia marcado e hint "Sem dias escolhidos — vamos usar 4 dias por semana"; marcar 5 dias → "5 dias por semana"
- "Começar a usar" → vai para `/home`
- `bun db:studio`: `goal` com os alvos escolhidos, `profile` com a porção e `onboarding_completed_at` preenchido
- reabrir `/onboarding` → redireciona para `/home`

Se a Home rebater de volta para o onboarding, é cache do router do Next: acrescente `router.refresh()` antes do `router.replace("/home")` em `useOnboarding`.

- [ ] **Step 8: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test
```

Esperado: ambos limpos.

Depois de verificar, **volte o usuário de dev ao estado pendente** pelo `bun db:studio` (limpar `onboarding_completed_at`) — a Task 7 precisa desse estado para testar o gate.

---

## Task 7: Gate no `(app)/layout.tsx`

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `isOnboarded` (Task 2), rota `/onboarding` (Task 6)
- Produces: gate ativo — nenhum usuário com onboarding pendente alcança as abas

- [ ] **Step 1: Ligar o gate**

Em `apps/web/src/app/(app)/layout.tsx`, acrescente os imports e a segunda guarda:

```tsx
import { db } from "@bloomy/db";

import { isOnboarded } from "@/server/onboarding/service";
```

```tsx
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Segundo gate: quem nunca escolheu as metas passa pelo onboarding antes das abas.
  // `isOnboarded` só lê — `ensureProfile` viraria uma escrita a cada navegação.
  if (!(await isOnboarded(db, session.user.id))) redirect("/onboarding");
```

- [ ] **Step 2: Verificação visual do gate**

Com o dev server rodando e o usuário de dev em estado pendente:

- abrir `http://localhost:3001/home` → redireciona para `/onboarding`
- abrir `http://localhost:3001/corpo` → redireciona para `/onboarding`
- **"Pular" no passo 1** → cai na Home e o `bun db:studio` mostra 2000 / 3 / 4 e porção 500
- navegar pelas abas → nenhuma volta pro onboarding
- `/metas` mostra os três alvos gravados no fluxo; `/corpo` mostra a meta e a porção escolhidas (a prova de que "as telas se adequam" não exigiu mudar tela nenhuma)
- em modo de movimento reduzido (Hyprland/Brave: `prefers-reduced-motion: reduce` via DevTools → Rendering → Emulate CSS media feature), a troca de passos não anima

- [ ] **Step 3: Confirmar que nenhuma migration foi gerada**

```bash
cd /home/larissa/Projects/bloomy && bun db:generate && git status --short packages/db/src/migrations
```

Esperado: nenhum arquivo novo em `migrations/` (o schema não mudou). Se aparecer, reverta o arquivo e investigue.

- [ ] **Step 4: Checkpoint final**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && bun test && git status --short
```

Esperado: typecheck e testes limpos; `git status` listando apenas os arquivos deste plano, **não commitados** — a Larissa revisa e commita.

---

## Notas de auto-revisão

- **Cobertura da spec:** decisões 1–2 → Task 2 + Task 7 · decisão 3 → Task 6 Step 6 · decisão 4 → Task 5/6 · decisões 5–6 → Task 6 Step 2 · decisões 7–8 → Task 6 Steps 1 e 4 + Task 4 · decisão 9 → Task 5 Step 3 (state inicial) · decisões 10–11 → Task 1 · decisão 12 (sem backfill) → nenhuma task, por definição · decisões 13–14 → Task 2 + Task 3 · decisão 15 → `skip` no Task 5 Step 3 · decisão 16 → `finish` no Task 5 Step 3 · decisão 17 → Task 5 Step 1.
- **Ordem não é estética:** o gate (Task 7) depende da rota existir (Task 6); ligá-lo antes deixaria todo usuário em 404. O curl da Task 3 suja o banco de dev, por isso o Step 4 daquela task restaura o estado pendente — sem isso, as verificações visuais das Tasks 6 e 7 não têm como rodar.
- **Nomes conferidos entre tasks:** `DEFAULT_GOAL_TARGETS`, `OnboardingBody`, `isOnboarded`, `completeOnboarding`, `porcoesHint`, `diasHint`, `onboardingPayload`, `OnboardingState`, `PassoLayout`, `SeletorDias`, `useOnboarding` — usados com a mesma grafia em toda parte.
- **Sem teste de rota:** o repo não tem nenhum; a Task 3 verifica por `curl` usando o fallback `DEV_USER_EMAIL`, e a regra de faixa já está coberta pelos testes de serviço.
- **Uma divergência de texto em relação ao protótipo:** o subtítulo do passo 1 é *"A gente conta as porções ao longo do dia."*, não *"A gente te lembra de beber ao longo do dia."* — lembretes não existem no app ainda, e prometer notificação que não chega é pior que texto neutro. Os subtítulos dos passos 2 e 3 seguem o protótipo palavra por palavra.
- **Tokens conferidos no `globals.css`:** `--color-control-off`, `--color-pink-bright`, `--radius-control`, `--shadow-btn` existem; `bg-control-off` e `rounded-control` são usos válidos.
