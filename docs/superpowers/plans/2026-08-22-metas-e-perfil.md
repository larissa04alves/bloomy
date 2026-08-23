# Tela de metas + dropdown do perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tela `/metas` (painel de alvos), passar toda a hidratação para ml com porção configurável, e vestir o dropdown do perfil com os tokens do design system.

**Architecture:** Três etapas sequenciais, cada uma deixando o app consistente. (1) Dropdown recebe tokens, sem ativar o link. (2) `profile.waterPortionMl` nasce e `garrafas()` vira `portions()`, propagando ml por Corpo e Hoje. (3) A tela `/metas` edita os 3 alvos via bottom sheet com stepper e ativa o link do dropdown. A ordem não é estética: a tela de Metas edita um campo que só existe depois da etapa 2.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Drizzle + libsql/Turso · zod · Tailwind 4 · vaul (bottom sheet) · Phosphor Icons · `bun test`

**Spec:** `docs/superpowers/specs/2026-08-22-metas-e-perfil-design.md`

## Global Constraints

- **NUNCA commitar.** O `CLAUDE.md` do projeto exige que a Larissa faça os commits depois de revisar. Este plano substitui os passos de commit por **checkpoints de verificação**; entregue tudo como mudanças não-commitadas.
- **Migrations sempre `bun db:generate` + `bun db:migrate` da raiz. NUNCA `drizzle-kit push`** (`packages/db/CLAUDE.md`). `db:generate` sem `db:migrate` não dá erro na subida — estoura 500 só quando a feature é usada.
- **Telas em PT, código em EN.** `page.tsx` só renderiza; lógica, consts e handlers vão para `hooks/use<Tela>.ts` (`apps/web/CLAUDE.md`).
- **Serviços recebem `db: Db` por parâmetro**, levam `import "server-only"` e nunca importam de `app/`. Rotas são wrappers finos: zod → `requireUserId` → serviço (ADR-0001).
- **Tamanho de fonte: só a escala nomeada do Tailwind** (`text-xs`, `text-sm`, `text-base`, `text-lg`…). **Nunca** `text-[13px]`. Não existe `text-md`. Cor arbitrária (`text-[#c9a8b8]`) é permitida.
- **Erros de API:** `{ "error": string }` + status. 401 já é tratado no `lib/api.ts`.
- **Rodar testes de dentro de `apps/web`** — o script injeta `--conditions react-server`, que neutraliza `server-only` nos imports. `bun test` na raiz não faz isso.
- **Ler cada arquivo antes de editar** (`cat`/`sed`/`head` NÃO contam para o harness). Se um `Edit` falhar com `string not found`, re-`Read` antes de tentar de novo — nunca editar de memória.
- **Sem teste de componente.** A convenção do repo é testar helpers e hooks puros (`saude/hooks/format.test.ts`, `treino/hooks/session.test.ts`). Tasks de UI terminam em `check-types` + verificação visual na rota, não em teste automatizado.
- **Vocabulário: "garrafa" e "copo" não aparecem em nenhum texto de tela.** A hidratação fala em **ml**.

---

## File Structure

**Etapa 1 — dropdown**

| Arquivo | Responsabilidade |
|---|---|
| `apps/web/src/app/(app)/home/components/PerfilMenu.tsx` | *(modificar)* menu do avatar: header com nome, 3 itens com ícone, sign-out |

**Etapa 2 — ml + porção configurável**

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/src/schema/profile.ts` | *(modificar)* coluna `water_portion_ml` |
| `packages/db/src/migrations/00NN_*.sql` | *(gerar)* `ALTER TABLE profile ADD COLUMN` |
| `apps/web/src/server/profile/service.ts` | *(modificar)* `ProfileUpdate` aceita `waterPortionMl` |
| `apps/web/src/server/profile/service.test.ts` | *(criar)* default e update do campo novo |
| `apps/web/src/app/api/profile/route.ts` | *(modificar)* zod do PATCH |
| `apps/web/src/lib/api-types.ts` | *(modificar)* `DEFAULT_PORTION_ML`, `Profile`, `TodayPayload.water` |
| `apps/web/src/server/shared/units.ts` + `.test.ts` | *(modificar)* `garrafas()` → `portions()` |
| `apps/web/src/server/today/service.ts` + `.test.ts` | *(modificar)* payload de água com ml |
| `apps/web/src/app/(app)/corpo/hooks/useGoals.ts` | *(modificar)* busca goals **e** profile |
| `apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts` | *(modificar)* recebe `portionMl` |
| `apps/web/src/app/(app)/corpo/page.tsx` | *(modificar)* botão soma a porção |
| `apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx` | *(modificar)* texto em ml; gotas até 12, barra acima |
| `apps/web/src/app/(app)/corpo/components/ResumoCard.tsx` | *(modificar)* rótulo `ml` |
| `apps/web/src/app/(app)/corpo/components/WaterModal.tsx` | *(modificar)* atalhos sem rótulo "Garrafa" |
| `apps/web/src/app/(app)/home/components/RituaisGrid.tsx` | *(modificar)* subtítulo em ml |
| `apps/web/src/app/(app)/home/hooks/format.ts` + `.test.ts` | *(modificar)* fixture e comentário |

**Etapa 3 — tela `/metas`**

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/src/schema/goals.ts` | *(modificar)* `domain` sem `mind` |
| `packages/db/src/migrations/00NN_remove_mind_goal.sql` | *(criar, custom)* `DELETE FROM goal` |
| `apps/web/src/server/goals/service.ts` | *(modificar)* `GOAL_LIMITS`, `UpdateGoalResult` |
| `apps/web/src/server/goals/service.test.ts` | *(criar)* limites, not_found, sem `mind` |
| `apps/web/src/server/shared/api.ts` | *(modificar)* helper `unprocessable()` |
| `apps/web/src/app/api/goals/[id]/route.ts` | *(modificar)* mapeia 404/422 |
| `apps/web/src/app/(app)/metas/hooks/format.ts` + `.test.ts` | *(criar)* rótulos PT, hint de porções — puro |
| `apps/web/src/app/(app)/metas/hooks/useMetas.ts` | *(criar)* fetch + mutações otimistas |
| `apps/web/src/app/(app)/metas/components/MetaCard.tsx` | *(criar)* card com pill de ajuste |
| `apps/web/src/app/(app)/metas/components/MetaSheet.tsx` | *(criar)* sheet com N steppers |
| `apps/web/src/app/(app)/metas/page.tsx` | *(criar)* header + lista + sheets |

---

## Task 1: Dropdown do perfil vestido

**Files:**
- Modify: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: `PerfilMenu({ name }: { name: string | null })` — assinatura **inalterada**. O item "Metas" continua `disabled` nesta etapa; a Task 9 o ativa.

- [ ] **Step 1: Ler o arquivo inteiro antes de editar**

Leia `apps/web/src/app/(app)/home/components/PerfilMenu.tsx` com a ferramenta Read. Toda a lógica de `signOut` (o `const { error } = await authClient.signOut()` e os dois comentários que explicam por que ela existe) **permanece intacta** — esta task só mexe em estrutura visual.

- [ ] **Step 2: Trocar imports de ícone**

Adicione `BellIcon`, `SignOutIcon` e `TargetIcon` ao import de `@phosphor-icons/react`, que hoje traz só `UserIcon`:

```tsx
import { BellIcon, SignOutIcon, TargetIcon, UserIcon } from "@phosphor-icons/react";
```

- [ ] **Step 3: Substituir o `DropdownMenuContent` inteiro**

Troque o bloco que hoje começa em `{/* w-44 sobrescreve... */}` e vai até `</DropdownMenuContent>` por:

```tsx
{/* w-56 sobrescreve o w-(--anchor-width) do shadcn: o âncora é um avatar de 46px */}
<DropdownMenuContent
  align="end"
  className="w-56 rounded-card border-hairline p-1.5 shadow-card"
>
  {name ? (
    <>
      <div className="truncate px-2.5 py-1.5 font-display text-sm font-bold text-ink">
        {name}
      </div>
      <DropdownMenuSeparator className="bg-hairline" />
    </>
  ) : null}

  <DropdownMenuItem
    disabled
    className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold focus:bg-lilac-tint-soft"
  >
    <TargetIcon size={18} weight="fill" />
    Metas
    <span className="ml-auto text-xs text-ink-faint">em breve</span>
  </DropdownMenuItem>

  <DropdownMenuItem
    disabled
    className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold focus:bg-lilac-tint-soft"
  >
    <BellIcon size={18} weight="fill" />
    Notificações
    <span className="ml-auto text-xs text-ink-faint">em breve</span>
  </DropdownMenuItem>

  <DropdownMenuSeparator className="bg-hairline" />

  <DropdownMenuItem
    className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold text-coral focus:bg-coral-tint focus:text-coral"
    disabled={signingOut}
    onClick={async () => {
      setSigningOut(true);
      try {
        // O better-auth devolve `{ error }` em falha HTTP em vez de lançar —
        // só o erro de rede cai no catch. Sem checar, um 500 mandaria a pessoa
        // pro /login achando que saiu, com a sessão ainda válida.
        const { error } = await authClient.signOut();
        if (error) {
          setSigningOut(false);
          toastError(error, "Não foi possível sair. Tente de novo.");
          return;
        }
        router.replace("/login");
        // sem reset no sucesso: a navegação desmonta o menu antes que o
        // rótulo tenha chance de piscar de volta pra "Sair".
      } catch (e) {
        setSigningOut(false);
        toastError(e, "Não foi possível sair. Tente de novo.");
      }
    }}
  >
    <SignOutIcon size={18} weight="fill" />
    {signingOut ? "Saindo…" : "Sair"}
  </DropdownMenuItem>
</DropdownMenuContent>
```

Note o `name ? … : null`: com sessão sem nome o header e o separador somem, em vez de renderizar uma linha vazia.

- [ ] **Step 4: Verificar tipos**

```bash
bun check-types
```

Esperado: sem erros.

- [ ] **Step 5: Verificação visual (obrigatória)**

Suba o dev server e abra `/home`. Confirme, no dropdown do avatar:
1. o nome aparece no topo, em Quicksand bold;
2. os 3 itens têm ícone à esquerda e o badge "em breve" alinhado à direita nos dois primeiros;
3. "Sair" está em coral e continua funcionando (deslogar redireciona para `/login`);
4. o menu tem cantos `rounded-card` e sombra lilás, não a sombra cinza padrão.

`check-types` verde não prova UI — esta verificação é parte da task.

- [ ] **Step 6: Checkpoint (não commitar)**

```bash
cd /home/larissa/Projects/bloomy && git status --short
```

Esperado: só `PerfilMenu.tsx` modificado. Deixe sem commitar — a Larissa revisa e commita.

---

## Task 2: `profile.waterPortionMl` (banco + serviço + rota)

**Files:**
- Modify: `packages/db/src/schema/profile.ts`
- Modify: `apps/web/src/server/profile/service.ts`
- Modify: `apps/web/src/app/api/profile/route.ts`
- Create: `apps/web/src/server/profile/service.test.ts`
- Generate: `packages/db/src/migrations/00NN_*.sql`

**Interfaces:**
- Consumes: nada da Task 1
- Produces:
  - `profile.waterPortionMl: number` (coluna `water_portion_ml`, default 500, NOT NULL)
  - `ProfileUpdate = { restSeconds?: number; autoRest?: boolean; completeOnboarding?: boolean; waterPortionMl?: number }`
  - `PATCH /api/profile` aceita `{ waterPortionMl: number }` (int, 100–2000)
  - `GET /api/profile` → `{ profile: Profile }` com o campo novo

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/server/profile/service.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { ensureProfile, updateProfile } from "./service";

afterAll(cleanupTestDbs);

describe("waterPortionMl", () => {
  test("nasce com 500 ml", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const profile = await ensureProfile(db, userId);

    expect(profile.waterPortionMl).toBe(500);
  });

  test("update altera só a porção, sem tocar no descanso", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    await ensureProfile(db, userId);

    const updated = await updateProfile(db, userId, { waterPortionMl: 250 });

    expect(updated.waterPortionMl).toBe(250);
    expect(updated.restSeconds).toBe(45);
    expect(updated.autoRest).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/profile/service.test.ts
```

Esperado: FALHA — `waterPortionMl` não existe no tipo nem na tabela.

- [ ] **Step 3: Adicionar a coluna no schema**

Em `packages/db/src/schema/profile.ts`, insira a linha logo depois de `autoRest`:

```ts
  autoRest: integer("auto_rest", { mode: "boolean" }).default(true).notNull(),
  /** ml por porção de água — quanto o botão "+" da Corpo adiciona de uma vez. */
  waterPortionMl: integer("water_portion_ml").default(500).notNull(),
```

- [ ] **Step 4: Gerar e aplicar a migration**

```bash
cd /home/larissa/Projects/bloomy && bun db:generate && bun db:migrate
```

Esperado: um `.sql` novo em `packages/db/src/migrations/` com `ALTER TABLE profile ADD ...` e uma entrada nova no `meta/_journal.json`. **Não use `db:push`.**

- [ ] **Step 5: Propagar no serviço**

Em `apps/web/src/server/profile/service.ts`, adicione o campo ao tipo e ao `set`:

```ts
export type ProfileUpdate = {
  restSeconds?: number;
  autoRest?: boolean;
  completeOnboarding?: boolean;
  waterPortionMl?: number;
};
```

e dentro do `.set({ ... })` do `updateProfile`, junto dos outros spreads condicionais:

```ts
      ...(input.waterPortionMl !== undefined && { waterPortionMl: input.waterPortionMl }),
```

- [ ] **Step 6: Rodar o teste e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/profile/service.test.ts
```

Esperado: PASSA (2 testes).

- [ ] **Step 7: Abrir o campo na rota**

Em `apps/web/src/app/api/profile/route.ts`, adicione ao `PATCH_SCHEMA`:

```ts
const PATCH_SCHEMA = z.object({
  restSeconds: z.number().int().min(15).max(600).optional(),
  autoRest: z.boolean().optional(),
  completeOnboarding: z.boolean().optional(),
  waterPortionMl: z.number().int().min(100).max(2000).optional(),
});
```

Os limites 100–1000 são contrato — o passo de 50 do stepper é só UI.

- [ ] **Step 8: Verificar tipos e suíte inteira**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src
```

Esperado: tipos limpos, suíte verde.

- [ ] **Step 9: Checkpoint (não commitar)**

`git status --short` deve mostrar: schema, migration nova, `meta/_journal.json`, service, service.test.ts, route.

---

## Task 3: `garrafas()` → `portions()` e ml no payload

**Files:**
- Modify: `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/server/shared/units.ts`
- Modify: `apps/web/src/server/shared/units.test.ts`
- Modify: `apps/web/src/server/today/service.ts`
- Modify: `apps/web/src/server/today/service.test.ts:27,51`
- Modify: `apps/web/src/app/(app)/corpo/hooks/useGoals.ts`
- Modify: `apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts`
- Modify: `apps/web/src/app/(app)/corpo/page.tsx`
- Modify: `apps/web/src/app/(app)/home/hooks/format.test.ts:23`

**Interfaces:**
- Consumes: `profile.waterPortionMl` (Task 2), `GET /api/profile → { profile: Profile }`
- Produces:
  - `DEFAULT_PORTION_ML = 500` (substitui `GARRAFA_ML`)
  - `Profile = { restSeconds: number; autoRest: boolean; waterPortionMl: number; onboardingCompletedAt: string | null }`
  - `portions(totalMl: number, goalMl: number, portionMl: number): { done: number; target: number }`
  - `TodayPayload.water = { totalMl: number; goalMl: number; done: number; target: number }`
  - `useGoals(): { waterGoalMl: number; mealsTarget: number; waterPortionMl: number }`
  - `useHidratacao(goalMl: number, portionMl: number)` — devolve `{ totalMl, done, target, loading, addWater, reload }` como hoje

Esta task é um diff transversal de propósito: renomear a função e mudar o payload no mesmo passo mantém o build compilável de ponta a ponta. O compilador é o guia — nenhum call site pode ficar para trás.

- [ ] **Step 1: Reescrever o teste de `units` (falha primeiro)**

Substitua todo o conteúdo de `apps/web/src/server/shared/units.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { portions } from "./units";

describe("portions", () => {
  it("deriva porções feitas e alvo a partir de ml", () => {
    expect(portions(1500, 2000, 500)).toEqual({ done: 3, target: 4 });
  });
  it("respeita porção diferente de 500", () => {
    expect(portions(1500, 2000, 250)).toEqual({ done: 6, target: 8 });
    expect(portions(600, 2000, 200)).toEqual({ done: 3, target: 10 });
  });
  it("nunca passa do alvo e arredonda", () => {
    expect(portions(2200, 2000, 500)).toEqual({ done: 4, target: 4 });
  });
  it("alvo mínimo 1 mesmo com meta 0", () => {
    expect(portions(0, 0, 500)).toEqual({ done: 0, target: 1 });
  });
  it("porção 0 cai no default em vez de virar Infinity", () => {
    expect(portions(1500, 2000, 0)).toEqual({ done: 3, target: 4 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/shared/units.test.ts
```

Esperado: FALHA — `portions` não é exportada de `./units`.

- [ ] **Step 3: Trocar a constante e os tipos em `api-types.ts`**

Substitua o bloco da linha 55-56:

```ts
/** ml por garrafa — unidade de contagem da hidratação. */
export const GARRAFA_ML = 500;
```

por:

```ts
/** ml por porção — fallback de `profile.waterPortionMl` quando não há profile carregado. */
export const DEFAULT_PORTION_ML = 500;

/** Preferências do usuário (`GET`/`PATCH /api/profile`). */
export type Profile = {
  restSeconds: number;
  autoRest: boolean;
  waterPortionMl: number;
  onboardingCompletedAt: string | null;
};
```

E no `TodayPayload`, troque a linha de água:

```ts
  water: { totalMl: number; goalMl: number; done: number; target: number };
```

Os dois campos derivados (`done`/`target`) ficam no payload em vez de serem calculados no client: o anel da Hoje e as gotas da Corpo precisam do mesmo arredondamento, e ele já é testado no servidor.

- [ ] **Step 4: Reescrever `units.ts`**

```ts
import { DEFAULT_PORTION_ML } from "@/lib/api-types";

/** Porções feitas/alvo a partir de ml. Alvo mínimo 1; done nunca passa do alvo.
 *  Módulo puro (sem React, sem banco) — client-safe, como `day.ts`. */
export function portions(
  totalMl: number,
  goalMl: number,
  portionMl: number,
): { done: number; target: number } {
  // Porção 0 ou negativa viraria Infinity e quebraria o render das gotas. O zod
  // da rota já barra, mas a função é pura e reutilizável — a guarda mora aqui.
  const size = portionMl > 0 ? portionMl : DEFAULT_PORTION_ML;
  const target = Math.max(1, Math.round(goalMl / size));
  const done = Math.min(target, Math.round(totalMl / size));
  return { done, target };
}
```

- [ ] **Step 5: Rodar o teste de `units` e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/shared/units.test.ts
```

Esperado: PASSA (5 testes).

- [ ] **Step 6: Atualizar `today/service.ts`**

Troque o import `import { garrafas } from "@/server/shared/units";` por `import { portions } from "@/server/shared/units";` e adicione `import { ensureProfile } from "@/server/profile/service";`.

No `Promise.all`, acrescente `ensureProfile` como último item e receba na desestruturação:

```ts
  const [water, meals, intakes, checkin, appointment, workouts, active, completed, goals, profile] =
    await Promise.all([
      getWaterDay(db, user.id, day),
      getMealsDay(db, user.id, day),
      getIntakesDay(db, user.id, day),
      getCheckin(db, user.id, day),
      nextAppointment(db, user.id, now),
      listWorkouts(db, user.id),
      getActiveSession(db, user.id),
      completedSessionOn(db, user.id, day),
      ensureGoals(db, user.id),
      ensureProfile(db, user.id),
    ]);
```

E o campo `water` do retorno:

```ts
    water: {
      totalMl: water.totalMl,
      goalMl: waterGoalMl,
      ...portions(water.totalMl, waterGoalMl, profile.waterPortionMl),
    },
```

- [ ] **Step 7: Ajustar `today/service.test.ts`**

As linhas 27 e 51 comparam o objeto inteiro e vão quebrar com os campos novos. Substitua:

```ts
    expect(today.water).toEqual({ done: 0, target: 4 }); // meta default 2000 ml
```
por
```ts
    // meta default 2000 ml, porção default 500 ml
    expect(today.water).toEqual({ totalMl: 0, goalMl: 2000, done: 0, target: 4 });
```

e
```ts
    expect(today.water).toEqual({ done: 4, target: 4 });
```
por
```ts
    expect(today.water).toEqual({ totalMl: 2000, goalMl: 2000, done: 4, target: 4 });
```

Se o total registrado nesse segundo teste não for exatamente 2000 ml, use o valor que o `addWater` do teste soma — leia o arquivo antes de editar.

- [ ] **Step 8: `useGoals` passa a buscar o profile**

Substitua todo o conteúdo de `apps/web/src/app/(app)/corpo/hooks/useGoals.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { DEFAULT_PORTION_ML, type Goal, type GoalDomain, type Profile } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useGoals() {
  const { data } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );
  const { data: profile } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );

  const target = (domain: GoalDomain, fallback: number) =>
    data?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  return {
    waterGoalMl: target("water", 2000),
    mealsTarget: target("meals", 3),
    // fallback enquanto o profile não chegou: a Corpo renderiza antes do fetch
    waterPortionMl: profile?.profile.waterPortionMl ?? DEFAULT_PORTION_ML,
  };
}
```

- [ ] **Step 9: `useHidratacao` recebe a porção**

Em `apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts`, troque o import `garrafas` por `portions` e a assinatura:

```ts
export function useHidratacao(goalMl: number, portionMl: number) {
```

e a linha de derivação:

```ts
  const { done, target } = portions(totalMl, goalMl, portionMl);
```

O resto do hook (otimista + rollback + `toastError`) fica intacto.

- [ ] **Step 10: `corpo/page.tsx` passa a porção adiante**

Troque o import:

```ts
import { type Meal, type MealType } from "@/lib/api-types";
```

(`GARRAFA_ML` sai — a porção agora vem do hook.)

E as duas primeiras linhas do componente:

```tsx
  const { waterGoalMl, mealsTarget, waterPortionMl } = useGoals();
  const hidr = useHidratacao(waterGoalMl, waterPortionMl);
```

E o handler do botão:

```tsx
        onAddPortion={() => hidr.addWater(waterPortionMl)}
```

O nome da prop muda junto com o componente na Task 4 — se o `check-types` reclamar aqui antes da Task 4, é esperado; termine a Task 4 antes de dar o passo de verificação final.

- [ ] **Step 11: Ajustar a fixture de `format.test.ts`**

Em `apps/web/src/app/(app)/home/hooks/format.test.ts`, a função `todayWith` monta um `TodayPayload`. Troque a linha 23:

```ts
    water: { done: 0, target: 4 },
```
por
```ts
    water: { totalMl: 0, goalMl: 2000, done: 0, target: 4 },
```

Os `over` dos testes individuais passam `water: { done: N, target: M }` sem os campos novos — como a fixture faz `as TodayPayload` no fim, isso compila, mas passa a produzir um objeto sem `totalMl`. Para cada `over` com `water`, adicione `totalMl` e `goalMl` coerentes (ex.: `water: { totalMl: 1000, goalMl: 2000, done: 2, target: 4 }`). `dayProgress` só lê `done`/`target`, então os valores de ml não afetam as asserções.

- [ ] **Step 12: Atualizar o comentário de `dayProgress`**

Em `apps/web/src/app/(app)/home/hooks/format.ts`, o bloco de doc acima de `dayProgress` diz "cada garrafa". Troque para:

```ts
/**
 * Progresso do dia somando os rituais em unidades comparáveis: cada porção de
 * água, refeição e remédio vale 1, e o treino do dia vale 1. A conversão de ml
 * para porções já veio pronta do servidor (`water.done`/`water.target`) — aqui
 * ela é só um número. O que não está cadastrado (sem remédio, sem treino) fica
 * fora do total — senão o dia nasceria devendo.
 */
```

O corpo da função **não muda**: ela já lê `today.water.done` e `today.water.target`.

- [ ] **Step 13: Rodar a suíte de servidor**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server src/app/\(app\)/home/hooks
```

Esperado: verde. `check-types` ainda vai acusar `onAddPortion` até a Task 4 — isso é esperado e está registrado no Step 10.

- [ ] **Step 14: Checkpoint (não commitar)**

`git status --short`. Nenhuma ocorrência de `GARRAFA_ML` deve sobrar fora dos componentes que a Task 4 vai tocar:

```bash
cd /home/larissa/Projects/bloomy && grep -rn "GARRAFA_ML\|garrafas(" apps/web/src
```

Esperado: nenhuma linha (a Task 4 lida só com o texto "garrafas", não com o identificador).

---

## Task 4: Corpo falando ml

**Files:**
- Modify: `apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx`
- Modify: `apps/web/src/app/(app)/corpo/components/ResumoCard.tsx`
- Modify: `apps/web/src/app/(app)/corpo/components/WaterModal.tsx`
- Modify: `apps/web/src/app/(app)/corpo/page.tsx`

**Interfaces:**
- Consumes: `useGoals(): { waterGoalMl, mealsTarget, waterPortionMl }` e `useHidratacao(goalMl, portionMl)` (Task 3)
- Produces: `HidratacaoSection({ totalMl, goalMl, done, target, portionMl, onAddPortion, onOpenModal })`

Nenhum teste automatizado — o repo não testa componentes. A verificação é visual e é obrigatória.

- [ ] **Step 1: Reescrever `HidratacaoSection.tsx`**

```tsx
"use client";

import { DropIcon, PlusIcon } from "@phosphor-icons/react";

import { ProgressBar } from "@/components/progress-bar";

/** Acima disso a fileira de gotas vira ruído numa coluna de 342 px — cai para barra. */
const MAX_DROPS = 12;

export function HidratacaoSection({
  totalMl,
  goalMl,
  done,
  target,
  portionMl,
  onAddPortion,
  onOpenModal,
}: {
  totalMl: number;
  goalMl: number;
  done: number;
  target: number;
  portionMl: number;
  onAddPortion: () => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-base font-bold text-ink">Hidratação</h2>
        <span className="font-display text-base font-bold text-lilac-deep">
          {totalMl} de {goalMl} ml
        </span>
      </div>

      {target <= MAX_DROPS ? (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: target }, (_, i) => (
            <DropIcon
              key={i}
              size={28}
              weight="fill"
              className={i < done ? "text-lilac" : "text-control-off"}
            />
          ))}
        </div>
      ) : (
        <ProgressBar value={goalMl > 0 ? totalMl / goalMl : 0} tone="lilac" />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddPortion}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-lilac font-bold text-white shadow-btn"
        >
          <PlusIcon size={18} weight="bold" /> Adicionar {portionMl} ml
        </button>
        <button
          type="button"
          aria-label="Escolher quantidade"
          onClick={onOpenModal}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-lilac-tint text-lilac-deep"
        >
          <DropIcon size={22} weight="fill" />
        </button>
      </div>
    </section>
  );
}
```

O header perdeu a segunda linha (antes era `1500 ml` grande + `3 de 4 garrafas` pequeno): agora `1500 de 2000 ml` diz as duas coisas numa linha só.

- [ ] **Step 2: `ResumoCard` conta ml, não porções**

Em `ResumoCard.tsx`, troque só o rótulo da primeira coluna:

```tsx
    { label: "ml", tone: "lilac", ...agua },
```

O componente já recebe `{ done, target }` genéricos — quem muda o **significado** é o `page.tsx` no Step 4, passando ml em vez de porções. Não altere mais nada aqui.

- [ ] **Step 3: `WaterModal` sem o rótulo "Garrafa"**

Substitua a linha 11:

```tsx
const SHORTCUT_LABELS: Record<number, string> = { 200: "200", 250: "250", 500: "500", 750: "750" };
```

Com todos os rótulos iguais à chave, a constante deixou de ter razão de existir. Remova-a e use o número direto no JSX:

```tsx
        {SHORTCUTS.map((s) => (
          <ChoiceChip key={s} selected={ml === s} onClick={() => setMl(s)}>
            {s}
          </ChoiceChip>
        ))}
```

- [ ] **Step 4: Ligar tudo em `corpo/page.tsx`**

O `ResumoCard` passa a receber ml e a `HidratacaoSection` ganha as props novas:

```tsx
      <ResumoCard
        agua={{ done: hidr.totalMl, target: waterGoalMl }}
        refeicoes={{ done: ref.count, target: mealsTarget }}
        remedios={{ done: rem.taken, target: rem.total }}
      />

      <HidratacaoSection
        totalMl={hidr.totalMl}
        goalMl={waterGoalMl}
        done={hidr.done}
        target={hidr.target}
        portionMl={waterPortionMl}
        onAddPortion={() => hidr.addWater(waterPortionMl)}
        onOpenModal={() => setWaterOpen(true)}
      />
```

- [ ] **Step 5: Verificar tipos**

```bash
bun check-types
```

Esperado: limpo. O erro de `onAddPortion` anotado na Task 3 desaparece aqui.

- [ ] **Step 6: Verificação visual (obrigatória)**

Com o dev server rodando, abra `/corpo`:
1. o cabeçalho da Hidratação diz `N de 2000 ml`;
2. há 4 gotas (meta 2000 ÷ porção 500) e elas acendem conforme você registra;
3. o botão diz **"Adicionar 500 ml"** e cada toque soma 500;
4. o `WaterModal` mostra `200 250 500 750`, sem a palavra "Garrafa";
5. **atenção ao `ResumoCard`:** a coluna de água agora mostra `1500/2000`, quatro dígitos em um terço de 342 px. Se estourar ou quebrar linha, reduza o número de `text-2xl` para `text-xl` **só nessa coluna** e registre a mudança.

- [ ] **Step 7: Checkpoint (não commitar)**

```bash
cd /home/larissa/Projects/bloomy && grep -rni "garrafa" apps/web/src
```

Esperado: nenhuma linha.

---

## Task 5: Hoje falando ml

**Files:**
- Modify: `apps/web/src/app/(app)/home/components/RituaisGrid.tsx`

**Interfaces:**
- Consumes: `TodayPayload.water = { totalMl, goalMl, done, target }` (Task 3)
- Produces: nada novo

- [ ] **Step 1: Trocar o card de Hidratação**

Em `RituaisGrid.tsx`, a variável `aguaCompleta` e o `RitualCard` de água passam a ler ml — mais honesto que porções, onde 1900 de 2000 arredondaria para "meta batida":

```tsx
  const aguaCompleta =
    today.water.totalMl >= today.water.goalMl && today.water.goalMl > 0;
```

```tsx
        <RitualCard
          tone="lilac"
          icon={<DropIcon size={26} weight="fill" />}
          title="Hidratação"
          subtitle={`${today.water.totalMl} de ${today.water.goalMl} ml`}
          progress={ratio(today.water.totalMl, today.water.goalMl)}
          action={
            aguaCompleta
              ? { label: "Meta batida", kind: "check" }
              : { label: "Registrar", kind: "plus" }
          }
          href="/corpo"
        />
```

`ratio()` já protege contra alvo 0 — não mexa nela.

- [ ] **Step 2: Verificar tipos e suíte**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src
```

Esperado: tudo verde. A etapa 2 está fechada.

- [ ] **Step 3: Verificação visual (obrigatória)**

Abra `/home`:
1. o card de Hidratação diz `N de 2000 ml`;
2. a barra de progresso do card acompanha os ml;
3. o anel do topo (`ProgressoDia`) continua contando "N de M metas" com o mesmo número de antes da mudança — a água entra como porções por dentro;
4. registre 500 ml na `/corpo`, volte para `/home` e confirme que os dois números subiram.

- [ ] **Step 4: Checkpoint (não commitar)**

---

## Task 6: Limites de meta e remoção de `mind`

**Files:**
- Modify: `packages/db/src/schema/goals.ts`
- Create: `packages/db/src/migrations/00NN_remove_mind_goal.sql` (via `--custom`)
- Modify: `apps/web/src/server/goals/service.ts`
- Create: `apps/web/src/server/goals/service.test.ts`
- Modify: `apps/web/src/server/shared/api.ts`
- Modify: `apps/web/src/app/api/goals/[id]/route.ts`
- Modify: `apps/web/src/lib/api-types.ts` (tipo `GoalDomain`)

**Interfaces:**
- Consumes: nada das tasks anteriores
- Produces:
  - `GOAL_LIMITS: { water: {min:500,max:5000,step:100}, meals: {min:1,max:8,step:1}, workout: {min:1,max:7,step:1} }`
  - `UpdateGoalResult = { ok: true; goal: Goal } | { ok: false; reason: "not_found" | "out_of_range" }`
  - `updateGoal(db, userId, goalId, target): Promise<UpdateGoalResult>`
  - `GoalDomain = "water" | "meals" | "workout"`
  - `unprocessable(message: string): Response` (422)
  - `PUT /api/goals/[id]` → 200 / 404 / 422

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/server/goals/service.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { goal } from "@bloomy/db/schema/goals";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { ensureGoals, updateGoal } from "./service";

afterAll(cleanupTestDbs);

describe("ensureGoals", () => {
  test("cria as 3 metas com alvo editável e nenhuma de mente", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    const goals = await ensureGoals(db, userId);

    expect(goals.map((g) => g.domain).sort()).toEqual(["meals", "water", "workout"]);
  });
});

describe("updateGoal", () => {
  test("salva target dentro da faixa do domínio", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const water = (await ensureGoals(db, userId)).find((g) => g.domain === "water")!;

    const result = await updateGoal(db, userId, water.id, 3000);

    expect(result.ok).toBe(true);
    expect(result.ok && result.goal.target).toBe(3000);
  });

  test("recusa target fora da faixa e não grava", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const meals = (await ensureGoals(db, userId)).find((g) => g.domain === "meals")!;

    expect(await updateGoal(db, userId, meals.id, 90)).toEqual({
      ok: false,
      reason: "out_of_range",
    });

    const [row] = await db.select().from(goal).where(eq(goal.id, meals.id));
    expect(row.target).toBe(3);
  });

  test("meta de outro usuário responde not_found, sem revelar que existe", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db, "owner");
    const other = await createTestUser(db, "other");
    const water = (await ensureGoals(db, owner)).find((g) => g.domain === "water")!;

    expect(await updateGoal(db, other, water.id, 2500)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  test("id inexistente responde not_found", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);

    expect(await updateGoal(db, userId, "nao-existe", 2500)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/goals/service.test.ts
```

Esperado: FALHA — `ensureGoals` ainda cria `mind` e `updateGoal` devolve `Goal | null`, não o objeto de resultado.

- [ ] **Step 3: Encolher o `domain` no schema**

Em `packages/db/src/schema/goals.ts`:

```ts
    domain: text("domain").$type<"water" | "meals" | "workout">().notNull(),
```

Isso é só tipagem TS — não gera DDL.

- [ ] **Step 4: Reescrever `server/goals/service.ts`**

```ts
import "server-only";

import type { Db } from "@bloomy/db";
import { goal, type Goal } from "@bloomy/db/schema/goals";
import { and, eq } from "drizzle-orm";

export const DEFAULT_GOALS = [
  { domain: "water", target: 2000, unit: "ml", period: "day" },
  { domain: "meals", target: 3, unit: "count", period: "day" },
  { domain: "workout", target: 4, unit: "days", period: "week" },
] as const;

/** Faixa aceita por domínio. O `step` é só afordância de UI; `min`/`max` são contrato. */
export const GOAL_LIMITS = {
  water: { min: 500, max: 5000, step: 100 },
  meals: { min: 1, max: 8, step: 1 },
  workout: { min: 1, max: 7, step: 1 },
} as const;

/** Garante as metas default do usuário e retorna todas as ativas. */
export async function ensureGoals(db: Db, userId: string): Promise<Goal[]> {
  const existing = await db.select().from(goal).where(eq(goal.userId, userId));
  const missing = DEFAULT_GOALS.filter(
    (d) => !existing.some((g) => g.domain === d.domain),
  );

  if (missing.length > 0) {
    // onConflictDoNothing: dois GETs concorrentes no 1º acesso não podem estourar o UNIQUE(user_id, domain)
    await db
      .insert(goal)
      .values(missing.map((d) => ({ ...d, userId })))
      .onConflictDoNothing();
    return db.select().from(goal).where(eq(goal.userId, userId));
  }

  return existing;
}

export type UpdateGoalResult =
  | { ok: true; goal: Goal }
  | { ok: false; reason: "not_found" | "out_of_range" };

/**
 * Atualiza o alvo validando contra a faixa do domínio. A validação mora aqui, e
 * não no zod da rota, porque a faixa depende do domínio — e o handler só recebe
 * um `id`, sem saber de qual meta se trata antes de ler a linha.
 */
export async function updateGoal(
  db: Db,
  userId: string,
  goalId: string,
  target: number,
): Promise<UpdateGoalResult> {
  const [current] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)));

  // Meta de outro usuário também cai aqui: 404 em vez de 403 não revela que existe.
  if (!current) return { ok: false, reason: "not_found" };

  const limits = GOAL_LIMITS[current.domain];
  if (target < limits.min || target > limits.max) {
    return { ok: false, reason: "out_of_range" };
  }

  const [updated] = await db
    .update(goal)
    .set({ target, updatedAt: new Date() })
    .where(and(eq(goal.id, goalId), eq(goal.userId, userId)))
    .returning();

  return { ok: true, goal: updated };
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/goals/service.test.ts
```

Esperado: PASSA (5 testes).

- [ ] **Step 6: Migration custom que apaga as metas de mente**

```bash
cd /home/larissa/Projects/bloomy/packages/db && bunx drizzle-kit generate --custom --name=remove_mind_goal
```

Isso cria um `.sql` vazio com o cabeçalho `-- Custom SQL migration file, put your code below! --` e já registra a entrada no `meta/_journal.json` (mesmo mecanismo do `0013_rename_status_awaiting_result.sql`). Escreva dentro dele:

```sql
-- Custom SQL migration file, put your code below! --
DELETE FROM `goal` WHERE `domain` = 'mind';
```

Depois aplique:

```bash
cd /home/larissa/Projects/bloomy && bun db:migrate
```

- [ ] **Step 7: Adicionar o helper 422**

Em `apps/web/src/server/shared/api.ts`, depois de `conflict`:

```ts
/** 422: o corpo é sintaticamente válido, mas o valor não cabe na regra do recurso. */
export function unprocessable(message: string): Response {
  return Response.json({ error: message }, { status: 422 });
}
```

- [ ] **Step 8: Mapear os status na rota**

Em `apps/web/src/app/api/goals/[id]/route.ts`, troque o import de `notFound` por `notFound, unprocessable` e o trecho final do `PUT`:

```ts
  const { id } = await params;
  const result = await updateGoal(db, userId, id, parsed.data.target);
  if (!result.ok) {
    return result.reason === "not_found"
      ? notFound()
      : unprocessable("meta fora da faixa permitida");
  }

  return Response.json({ goal: result.goal });
```

- [ ] **Step 9: Encolher `GoalDomain` no client**

Em `apps/web/src/lib/api-types.ts`:

```ts
export type GoalDomain = "water" | "meals" | "workout";
```

- [ ] **Step 10: Verificar tipos e suíte inteira**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src
```

Esperado: verde. Se o compilador apontar algum lugar que ainda menciona `"mind"` como domínio de meta, corrija — é exatamente para isso que o tipo encolheu.

- [ ] **Step 11: Checkpoint (não commitar)**

Confirme no banco local que a linha sumiu:

```bash
cd /home/larissa/Projects/bloomy && bun db:studio
```

Na tabela `goal`, nenhuma linha com `domain = 'mind'`.

---

## Task 7: Rótulos da tela de metas (puro)

**Files:**
- Create: `apps/web/src/app/(app)/metas/hooks/format.ts`
- Create: `apps/web/src/app/(app)/metas/hooks/format.test.ts`

**Interfaces:**
- Consumes: `portions()` (Task 3), `GOAL_LIMITS` não é usado aqui
- Produces:
  - `MetaDomain = "water" | "meals" | "workout"`
  - `metaLabel(domain: MetaDomain, target: number): string`
  - `portionHint(goalMl: number, portionMl: number): string`

- [ ] **Step 1: Escrever o teste que falha**

Crie `apps/web/src/app/(app)/metas/hooks/format.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { metaLabel, portionHint } from "./format";

describe("metaLabel", () => {
  it("hidratação fala em ml por dia", () => {
    expect(metaLabel("water", 2000)).toBe("2000 ml por dia");
  });
  it("refeições concordam em número", () => {
    expect(metaLabel("meals", 1)).toBe("1 refeição por dia");
    expect(metaLabel("meals", 3)).toBe("3 refeições por dia");
  });
  it("treino fala em dias por semana", () => {
    expect(metaLabel("workout", 1)).toBe("1 dia por semana");
    expect(metaLabel("workout", 4)).toBe("4 dias por semana");
  });
});

describe("portionHint", () => {
  it("divide a meta pela porção", () => {
    expect(portionHint(2000, 500)).toBe("≈ 4 porções por dia");
    expect(portionHint(2000, 250)).toBe("≈ 8 porções por dia");
  });
  it("usa o singular quando a meta cabe numa porção", () => {
    expect(portionHint(500, 500)).toBe("≈ 1 porção por dia");
  });
  it("nunca desce de 1 porção", () => {
    expect(portionHint(100, 1000)).toBe("≈ 1 porção por dia");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server "src/app/(app)/metas/hooks/format.test.ts"
```

Esperado: FALHA — o módulo `./format` não existe.

- [ ] **Step 3: Implementar**

Crie `apps/web/src/app/(app)/metas/hooks/format.ts`:

```ts
import { portions } from "@/server/shared/units";

export type MetaDomain = "water" | "meals" | "workout";

/** Linha "Meta: …" de cada card, na língua da tela (PT). */
export function metaLabel(domain: MetaDomain, target: number): string {
  switch (domain) {
    case "water":
      return `${target} ml por dia`;
    case "meals":
      return target === 1 ? "1 refeição por dia" : `${target} refeições por dia`;
    case "workout":
      return target === 1 ? "1 dia por semana" : `${target} dias por semana`;
  }
}

/** Hint vivo da sheet de hidratação. Reusa `portions` para arredondar igual ao
 *  resto do app — a Corpo e a Metas nunca podem discordar sobre quantas cabem. */
export function portionHint(goalMl: number, portionMl: number): string {
  const { target } = portions(0, goalMl, portionMl);
  return target === 1 ? "≈ 1 porção por dia" : `≈ ${target} porções por dia`;
}
```

`units.ts` não tem `import "server-only"` — é um módulo puro client-safe, e o `useHidratacao` já o importa do client.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server "src/app/(app)/metas/hooks/format.test.ts"
```

Esperado: PASSA (6 testes).

- [ ] **Step 5: Checkpoint (não commitar)**

---

## Task 8: Componentes da tela de metas

**Files:**
- Create: `apps/web/src/app/(app)/metas/components/MetaCard.tsx`
- Create: `apps/web/src/app/(app)/metas/components/MetaSheet.tsx`
- Create: `apps/web/src/app/(app)/metas/components/MetasSkeleton.tsx`
- Create: `apps/web/src/app/(app)/metas/components/MetasError.tsx`

**Interfaces:**
- Consumes: `BottomSheet`, `Stepper`, `IconChip`, `TONE`/`Tone`
- Produces:
  - `MetaCard({ tone, icon, title, meta, pill, onEdit })`
  - `SheetField = { key: string; label: string; value: number; min: number; max: number; step: number; unit?: string }`
  - `MetaSheet({ open, onOpenChange, title, icon, tone, fields, hint?, onSave })` — `onSave(values: Record<string, number>)`
  - `MetasSkeleton()`, `MetasError({ onRetry })`

Sem teste automatizado (componentes). Verificação visual na Task 9, quando a página existir.

- [ ] **Step 1: `MetaCard.tsx`**

```tsx
"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";
import { TONE, type Tone } from "@/lib/tone";

export function MetaCard({
  tone,
  icon,
  title,
  meta,
  pill,
  onEdit,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  /** Texto após "Meta: " — vem de `metaLabel`. */
  meta: string;
  /** Valor curto dentro da pill (ex.: "2000 ml", "3", "4"). */
  pill: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-white p-4 shadow-card">
      <IconChip tone={tone} icon={icon} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="truncate text-xs font-semibold text-ink-read">Meta: {meta}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ajustar meta de ${title}`}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 text-sm font-bold ${TONE[tone].tint} ${TONE[tone].deep}`}
      >
        {pill}
        <PencilSimpleIcon size={14} weight="fill" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `MetaSheet.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import type { Tone } from "@/lib/tone";

export type SheetField = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export function MetaSheet({
  open,
  onOpenChange,
  title,
  icon,
  tone,
  fields,
  hint,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  tone: Tone;
  fields: SheetField[];
  /** Linha viva sob os steppers (ex.: "≈ 4 porções por dia"). */
  hint?: (values: Record<string, number>) => string;
  onSave: (values: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({});

  // Reabrir descarta o rascunho: os valores voltam do servidor, não do estado
  // anterior — senão um cancelamento deixaria o número errado na próxima abertura.
  useEffect(() => {
    if (open) setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    // `fields` é recriado a cada render do pai; incluí-lo na dependência
    // reinicializaria o rascunho a cada toque no stepper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fallback para o primeiro render, antes do efeito rodar.
  const values: Record<string, number> = {
    ...Object.fromEntries(fields.map((f) => [f.key, f.value])),
    ...draft,
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={icon}
      tone={tone}
      footer={
        <button
          type="button"
          onClick={() => {
            onSave(values);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Salvar
        </button>
      }
    >
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">{f.label}</span>
          <Stepper
            value={values[f.key]!}
            min={f.min}
            max={f.max}
            step={f.step}
            unit={f.unit}
            onChange={(next) => setDraft((d) => ({ ...d, [f.key]: next }))}
          />
        </div>
      ))}
      {hint ? (
        <p className="text-center text-sm font-semibold text-ink-faint">{hint(values)}</p>
      ) : null}
    </BottomSheet>
  );
}
```

- [ ] **Step 3: `MetasSkeleton.tsx`**

```tsx
export function MetasSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="size-9.5 animate-pulse rounded-control bg-lilac-tint" />
        <div className="h-6 w-36 animate-pulse rounded-control bg-lilac-tint" />
        <div className="size-9.5" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-lilac-tint-soft" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `MetasError.tsx`**

```tsx
"use client";

export function MetasError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 text-center">
      <p className="font-display text-lg font-bold text-ink">
        Não conseguimos carregar suas metas
      </p>
      <p className="text-sm font-semibold text-ink-read">
        Pode ser a conexão. Tenta de novo em um instante.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 min-h-11 rounded-control bg-lilac px-5 font-display text-sm font-bold text-white shadow-btn"
      >
        Tentar de novo
      </button>
    </div>
  );
}
```

É quase o `HomeError`, com outra frase. Fica local em vez de subir para `src/components/`: a regra do repo é promover só o que serve a mais de duas telas.

- [ ] **Step 5: Verificar tipos**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: limpo (os componentes ainda não têm consumidor, mas compilam).

- [ ] **Step 6: Checkpoint (não commitar)**

---

## Task 9: Tela `/metas` e ativação do link

**Files:**
- Create: `apps/web/src/app/(app)/metas/hooks/useMetas.ts`
- Create: `apps/web/src/app/(app)/metas/page.tsx`
- Modify: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx`

**Interfaces:**
- Consumes: `metaLabel`/`portionHint` (Task 7), `MetaCard`/`MetaSheet`/`MetasSkeleton`/`MetasError` (Task 8), `GOAL_LIMITS` não é importado no client (os limites são repetidos como literais na página — `service.ts` é `server-only`)
- Produces: rota `/metas`; `PerfilMenu` com o item "Metas" ativo

- [ ] **Step 1: `useMetas.ts`**

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { DEFAULT_PORTION_ML, type Goal, type Profile } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import type { MetaDomain } from "./format";

export function useMetas() {
  const {
    data: goalsData,
    setData: setGoals,
    error: goalsError,
    reload: reloadGoals,
  } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );

  const {
    data: profileData,
    setData: setProfile,
    error: profileError,
    reload: reloadProfile,
  } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );

  const targetOf = (domain: MetaDomain, fallback: number) =>
    goalsData?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  const saveTarget = useCallback(
    async (domain: MetaDomain, target: number) => {
      const current = goalsData;
      const found = current?.goals.find((g) => g.domain === domain);
      if (!current || !found) return;
      if (found.target === target) return;

      // Otimista: a pill já mostra o novo valor quando a sheet fecha.
      setGoals({
        goals: current.goals.map((g) => (g.id === found.id ? { ...g, target } : g)),
      });
      try {
        await api.put(`/api/goals/${found.id}`, { target });
      } catch (e) {
        setGoals(current);
        toastError(e, "Não foi possível salvar a meta");
      }
    },
    [goalsData, setGoals],
  );

  const savePortion = useCallback(
    async (waterPortionMl: number) => {
      const current = profileData;
      if (!current) return;
      if (current.profile.waterPortionMl === waterPortionMl) return;

      setProfile({ profile: { ...current.profile, waterPortionMl } });
      try {
        await api.patch("/api/profile", { waterPortionMl });
      } catch (e) {
        setProfile(current);
        toastError(e, "Não foi possível salvar o tamanho da porção");
      }
    },
    [profileData, setProfile],
  );

  return {
    waterGoalMl: targetOf("water", 2000),
    mealsTarget: targetOf("meals", 3),
    workoutTarget: targetOf("workout", 4),
    waterPortionMl: profileData?.profile.waterPortionMl ?? DEFAULT_PORTION_ML,
    // `ready` em vez de `loading`: a tela só renderiza com os DOIS recursos em mãos,
    // senão a pill de hidratação piscaria o default antes do valor real.
    ready: goalsData !== null && profileData !== null,
    error: goalsError ?? profileError,
    reload: useCallback(() => {
      reloadGoals();
      reloadProfile();
    }, [reloadGoals, reloadProfile]),
    saveTarget,
    savePortion,
  };
}
```

- [ ] **Step 2: `page.tsx`**

```tsx
"use client";

import {
  ArrowLeftIcon,
  BarbellIcon,
  DropIcon,
  ForkKnifeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { MetaCard } from "./components/MetaCard";
import { MetaSheet } from "./components/MetaSheet";
import { MetasError } from "./components/MetasError";
import { MetasSkeleton } from "./components/MetasSkeleton";
import { metaLabel, portionHint, type MetaDomain } from "./hooks/format";
import { useMetas } from "./hooks/useMetas";

export default function MetasPage() {
  const metas = useMetas();
  const [sheet, setSheet] = useState<MetaDomain | null>(null);

  if (!metas.ready) {
    if (metas.error) return <MetasError onRetry={metas.reload} />;
    return <MetasSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">Minhas metas</h1>
        {/* espaçador: mantém o título centrado sem position absolute */}
        <span className="size-9.5" aria-hidden="true" />
      </header>

      <div className="flex flex-col gap-3">
        <MetaCard
          tone="lilac"
          icon={<DropIcon size={22} weight="fill" />}
          title="Hidratação"
          meta={metaLabel("water", metas.waterGoalMl)}
          pill={`${metas.waterGoalMl} ml`}
          onEdit={() => setSheet("water")}
        />
        <MetaCard
          tone="green"
          icon={<ForkKnifeIcon size={22} weight="fill" />}
          title="Alimentação"
          meta={metaLabel("meals", metas.mealsTarget)}
          pill={String(metas.mealsTarget)}
          onEdit={() => setSheet("meals")}
        />
        <MetaCard
          tone="pink"
          icon={<BarbellIcon size={22} weight="fill" />}
          title="Treino"
          meta={metaLabel("workout", metas.workoutTarget)}
          pill={String(metas.workoutTarget)}
          onEdit={() => setSheet("workout")}
        />
      </div>

      <MetaSheet
        open={sheet === "water"}
        onOpenChange={(open) => setSheet(open ? "water" : null)}
        title="Hidratação"
        tone="lilac"
        icon={<DropIcon size={22} weight="fill" />}
        fields={[
          {
            key: "goalMl",
            label: "Meta do dia",
            value: metas.waterGoalMl,
            min: 500,
            max: 5000,
            step: 100,
            unit: "ml",
          },
          {
            key: "portionMl",
            label: "Cada porção",
            value: metas.waterPortionMl,
            min: 100,
            max: 2000,
            step: 50,
            unit: "ml",
          },
        ]}
        hint={(v) => portionHint(v.goalMl!, v.portionMl!)}
        onSave={(v) => {
          metas.saveTarget("water", v.goalMl!);
          metas.savePortion(v.portionMl!);
        }}
      />

      <MetaSheet
        open={sheet === "meals"}
        onOpenChange={(open) => setSheet(open ? "meals" : null)}
        title="Alimentação"
        tone="green"
        icon={<ForkKnifeIcon size={22} weight="fill" />}
        fields={[
          {
            key: "target",
            label: "Refeições por dia",
            value: metas.mealsTarget,
            min: 1,
            max: 8,
            step: 1,
          },
        ]}
        onSave={(v) => metas.saveTarget("meals", v.target!)}
      />

      <MetaSheet
        open={sheet === "workout"}
        onOpenChange={(open) => setSheet(open ? "workout" : null)}
        title="Treino"
        tone="pink"
        icon={<BarbellIcon size={22} weight="fill" />}
        fields={[
          {
            key: "target",
            label: "Dias por semana",
            value: metas.workoutTarget,
            min: 1,
            max: 7,
            step: 1,
          },
        ]}
        onSave={(v) => metas.saveTarget("workout", v.target!)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Ativar o item "Metas" no dropdown**

Em `PerfilMenu.tsx`, adicione `import Link from "next/link";` e troque o primeiro `DropdownMenuItem`:

```tsx
  <DropdownMenuItem
    asChild
    className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold focus:bg-lilac-tint-soft"
  >
    <Link href="/metas">
      <TargetIcon size={18} weight="fill" />
      Metas
    </Link>
  </DropdownMenuItem>
```

O `disabled` e o badge "em breve" saem — só deste item. "Notificações" continua desabilitado.

- [ ] **Step 4: Verificar tipos e suíte inteira**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src
```

Esperado: tudo verde.

- [ ] **Step 5: Verificação visual completa (obrigatória)**

Com o dev server rodando:

1. `/home` → dropdown → **Metas** navega para `/metas` (não é mais "em breve");
2. `/metas` mostra 3 cards, a TabBar embaixo e a seta de voltar levando a `/home`;
3. tocar na pill de **Hidratação** abre a sheet com **dois** steppers; mexer em qualquer um atualiza a linha "≈ N porções por dia" ao vivo;
4. salvar 3000 ml / porção 250 → a pill vira `3000 ml` na hora;
5. ir para `/corpo`: cabeçalho diz `N de 3000 ml`, o botão diz **"Adicionar 250 ml"** e há 12 gotas;
6. mudar a porção para **200 ml** com meta 3000 → 15 porções: a `/corpo` deve mostrar **barra**, não gotas (regra `MAX_DROPS`);
7. tocar na pill, mexer no stepper e **fechar arrastando** (sem Salvar) → reabrir mostra o valor antigo, não o rascunho;
8. `/treino` reflete a meta nova em "Meta semanal de N dias";
9. recarregar `/metas` com a rede offline (DevTools) → aparece o `MetasError` com "Tentar de novo".

- [ ] **Step 6: Checkpoint final (não commitar)**

```bash
cd /home/larissa/Projects/bloomy && git status --short && grep -rni "garrafa" apps/web/src
```

Esperado: muitos arquivos modificados/criados, nenhuma ocorrência de "garrafa". Deixe tudo sem commitar e avise a Larissa para revisar.

---

## Notas de auto-revisão

Pontos onde este plano diverge do padrão da skill, e por quê:

- **Sem passos de commit.** O `CLAUDE.md` do projeto proíbe commit sem ordem explícita; os passos viraram checkpoints de verificação.
- **Tasks 1, 4, 5, 8 não têm TDD.** São mudanças de componente, e o repo não testa componentes — testar helpers e hooks puros é a convenção estabelecida. Essas tasks terminam em `check-types` + verificação visual roteirizada, que é o gate real para UI.
- **Task 3 é maior que as outras.** Renomear `garrafas()` e mudar `TodayPayload` no mesmo diff é o que mantém o build compilável; separar deixaria o repo sem compilar entre duas tasks. O único resíduo é o erro de `onAddPortion`, que está declarado no Step 10 e some na Task 4.
- **`GOAL_LIMITS` é repetido como literal na `page.tsx`.** `service.ts` é `server-only` e não pode ser importado do client. Se essa duplicação incomodar, o passo seguinte natural é mover a constante para `lib/api-types.ts` e importar dos dois lados — fora do escopo desta entrega.
