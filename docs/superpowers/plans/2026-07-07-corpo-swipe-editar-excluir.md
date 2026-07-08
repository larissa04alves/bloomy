# Corpo — Editar/excluir refeição por swipe + tudo otimista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).
>
> **Commits:** NÃO commitar automaticamente — a usuária commita (ver `CLAUDE.md > Git`).
> Cada task termina com `bun check-types` verde + testes; as mudanças ficam
> não-commitadas. Só commitar sob ordem explícita dela.
>
> **Ao despachar implementer, colar no prompt:** "Read cada arquivo antes de Edit; se Edit
> falhar com `string not found`, re-Read antes de re-tentar — nunca editar de memória;
> rodar `bun check-types` (da raiz) ao fim; **não commitar**."

**Goal:** Editar e excluir refeições feitas por swipe (← Excluir, → Editar) no Corpo, com
`PUT /api/meals/:id` novo no back, e migrar todas as mutações do Corpo para otimista.

**Architecture:** Back ganha `updateMeal` + rota `PUT`. Front ganha `SwipeableRow`
(primitivo de swipe-revela-botão via pointer events, sem lib) usado nos cards de refeição;
`useRefeicoes` ganha `editMeal` e passa a ser otimista em criar/editar/excluir; o
`MealModal` ganha modo edição; `useRemedios.addMedication` vira otimista.

**Tech Stack:** Next 16, React 19, Tailwind v4, Drizzle, `@phosphor-icons/react`, `zod`,
`bun test` (`--conditions react-server`).

## Global Constraints

- **Autoridade visual:** `DESIGN.md`. Excluir = coral; Editar = lilás. Sem vermelho.
- **Escopo:** swipe só nos cards de **refeição feita**; pendentes não recebem swipe.
- **Gesto:** swipe **revela** o botão (não dispara direto); toca pra confirmar. Uma linha
  aberta por vez; tocar fora fecha; `prefers-reduced-motion` respeitado.
- **Tudo otimista:** `setData` imediato → `reload()` reconciliando no sucesso →
  `setData(prev)` + `toastError` (coral) no erro. Vale p/ criar/editar/excluir refeição e
  cadastrar remédio.
- **Componentes:** `SwipeableRow` é genérico → `apps/web/src/components/`. Nada em
  `packages/ui` (lá só shadcn).
- **Convenção:** DTOs de fio (`createdAt: string`); serviços recebem `Db`; rota fina
  (zod → `requireUserId` → serviço); erros `{ error }`.
- **Verificação:** `bun check-types` + `bun test` + render na 3001 com sessão de teste.

## Contrato REST (novo)

| Método | Rota | Body | Retorno |
|---|---|---|---|
| PUT | `/api/meals/:id` | `{ type?, description? }` (description `.trim().min(1)`) | `{ meal }` (404 se não existir) |

---

### Task 1: Backend — `updateMeal` + `PUT /api/meals/:id`

**Files:**
- Modify: `apps/web/src/server/meals/service.ts` (add `updateMeal`)
- Modify: `apps/web/src/server/meals/service.test.ts` (add teste de DB do `updateMeal`)
- Modify: `apps/web/src/app/api/meals/[id]/route.ts` (add `PUT`)

**Interfaces:**
- Consumes: `Db`, `meal`, `Meal`, `MealType`, `and`, `eq` (já importados no service);
  `createTestDb`, `createTestUser`, `cleanupTestDbs`, `addMeal`.
- Produces: `updateMeal(db, userId, mealId, { type?, description? }): Promise<Meal | null>`;
  rota `PUT`.

- [ ] **Step 1: Teste de DB do `updateMeal` (falhando)**

Em `apps/web/src/server/meals/service.test.ts`, trocar os imports do topo e acrescentar o
bloco de teste. Novos imports (topo do arquivo):

```ts
import { afterAll, describe, expect, test } from "bun:test";

import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";
import { addMeal, pendingMealTypes, updateMeal } from "./service";

afterAll(cleanupTestDbs);
```

Acrescentar ao fim do arquivo:

```ts
describe("updateMeal (db em memória)", () => {
  test("atualiza type e description; parcial; outro usuário → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const created = await addMeal(db, userId, { type: "lunch", description: "arroz" });

    const updated = await updateMeal(db, userId, created.id, {
      type: "dinner",
      description: "sopa",
    });
    expect(updated?.type).toBe("dinner");
    expect(updated?.description).toBe("sopa");

    const partial = await updateMeal(db, userId, created.id, { description: "sopa e pão" });
    expect(partial?.type).toBe("dinner");
    expect(partial?.description).toBe("sopa e pão");

    const otherUser = await createTestUser(db);
    expect(await updateMeal(db, otherUser, created.id, { description: "x" })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test src/server/meals/service.test.ts`
Expected: FAIL — `updateMeal` não existe.

- [ ] **Step 3: Implementar `updateMeal`**

Em `apps/web/src/server/meals/service.ts`, acrescentar (depois de `addMeal`):

```ts
export async function updateMeal(
  db: Db,
  userId: string,
  mealId: string,
  input: { type?: MealType; description?: string },
): Promise<Meal | null> {
  const [updated] = await db
    .update(meal)
    .set({
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
    })
    .where(and(eq(meal.id, mealId), eq(meal.userId, userId)))
    .returning();

  return updated ?? null;
}
```

> `meal`, `Meal`, `and`, `eq` já são importados no arquivo (usados por `addMeal`/`deleteMeal`).

- [ ] **Step 4: Rodar e ver passar**

Run (de `apps/web`): `bun test src/server/meals/service.test.ts`
Expected: PASS.

- [ ] **Step 5: Adicionar `PUT` à rota**

Em `apps/web/src/app/api/meals/[id]/route.ts` (que já tem `DELETE`), acrescentar o import
do `zod`, dos helpers e do serviço, e o handler `PUT`. Resultado do arquivo:

```ts
import { z } from "zod";

import { db } from "@bloomy/db";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { deleteMeal, updateMeal } from "@/server/meals/service";

const updateMealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  description: z.string().trim().min(1, "Conta o que você comeu").optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const { id } = await params;
  const parsed = updateMealSchema.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const meal = await updateMeal(db, userId, id, parsed.data);
  if (!meal) return notFound();

  return Response.json({ meal });
}

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

> Preservar o `DELETE` existente exatamente como está; só somar o `import` do zod/helpers e
> o bloco `PUT`. `parseJson`/`invalidBody` já existem em `server/shared/api.ts`.

- [ ] **Step 6: check-types**

Run (raiz): `bun check-types` → sem erros. (Não commitar.)

---

### Task 2: `SwipeableRow` (swipe revela botão)

**Files:**
- Create: `apps/web/src/components/swipeable-row.tsx`

**Interfaces:**
- Produces: `<SwipeableRow onEdit? onDelete?>{children}</SwipeableRow>` — arrasta → revela
  Editar (esquerda), arrasta ← revela Excluir (direita); toca no botão confirma e fecha.

- [ ] **Step 1: Implementar o componente**

Criar `apps/web/src/components/swipeable-row.tsx`:

```tsx
"use client";

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

const ACTION_W = 76; // largura de cada botão de ação (px)

/** Registro módulo-nível: abrir uma linha fecha as outras. */
const openRows = new Map<string, () => void>();

export function SwipeableRow({
  onEdit,
  onDelete,
  children,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0); // + = editar (dir), - = excluir (esq)
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);

  const close = () => setOffset(0);

  // Registra o close p/ "uma linha aberta por vez" + fecha ao tocar fora.
  useEffect(() => {
    openRows.set(id, close);
    return () => {
      openRows.delete(id);
    };
  }, [id]);

  useEffect(() => {
    if (offset === 0) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [offset]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startOffset.current = offset;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const max = onEdit ? ACTION_W : 0;
    const min = onDelete ? -ACTION_W : 0;
    const next = Math.max(min, Math.min(max, startOffset.current + (e.clientX - startX.current)));
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (offset > ACTION_W / 2) {
      // fecha as outras antes de abrir esta
      for (const [key, fn] of openRows) if (key !== id) fn();
      setOffset(ACTION_W);
    } else if (offset < -ACTION_W / 2) {
      for (const [key, fn] of openRows) if (key !== id) fn();
      setOffset(-ACTION_W);
    } else {
      setOffset(0);
    }
  };

  return (
    <div ref={rootRef} className="relative overflow-hidden rounded-card">
      {onEdit ? (
        <button
          type="button"
          aria-label="Editar"
          onClick={() => {
            onEdit();
            close();
          }}
          className="absolute inset-y-0 left-0 flex w-[76px] items-center justify-center bg-lilac-tint text-lilac-deep"
        >
          <PencilSimpleIcon size={22} weight="fill" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          aria-label="Excluir"
          onClick={() => {
            onDelete();
            close();
          }}
          className="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center bg-coral-tint text-coral"
        >
          <TrashIcon size={22} weight="fill" />
        </button>
      ) : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative touch-pan-y bg-bg transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: check-types**

Run (raiz): `bun check-types` → sem erros. (Verificação visual fica na Task 5.)

---

### Task 3: Hooks tudo-otimista (`useRefeicoes` + `useRemedios`)

**Files:**
- Modify: `apps/web/src/app/(app)/corpo/hooks/useRefeicoes.ts`
- Modify: `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts`

**Interfaces:**
- Produces: `useRefeicoes()` agora expõe `editMeal(id, { type, description })`; `addMeal`,
  `editMeal`, `deleteMeal` otimistas. `useRemedios().addMedication` otimista.

- [ ] **Step 1: Reescrever `useRefeicoes.ts`**

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { MAIN_MEAL_TYPES, type Meal, type MealsDay, type MealType } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

/** Pendências recomputadas no cliente (espelha o back: só principais, lanche nunca). */
function recomputePending(meals: { type: MealType }[]): MealType[] {
  const has = new Set(meals.map((m) => m.type));
  return MAIN_MEAL_TYPES.filter((t) => !has.has(t));
}

export function useRefeicoes() {
  const { data, loading, reload, setData } = useResource<MealsDay>(
    useCallback(() => api.get<MealsDay>("/api/meals"), []),
  );

  const meals = data?.meals ?? [];
  const pendingTypes = data?.pendingTypes ?? [];

  const commit = useCallback(
    async (nextMeals: Meal[], call: () => Promise<unknown>, errMsg: string) => {
      const prev = data;
      setData({ meals: nextMeals, pendingTypes: recomputePending(nextMeals) });
      try {
        await call();
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, errMsg);
      }
    },
    [data, setData, reload],
  );

  const addMeal = useCallback(
    (input: { type: MealType; description: string }) => {
      const optimistic: Meal = {
        id: `tmp-${crypto.randomUUID()}`,
        type: input.type,
        description: input.description,
        day: "",
        createdAt: new Date().toISOString(),
      };
      return commit([...meals, optimistic], () => api.post("/api/meals", input), "Não foi possível salvar a refeição");
    },
    [meals, commit],
  );

  const editMeal = useCallback(
    (id: string, input: { type: MealType; description: string }) =>
      commit(
        meals.map((m) => (m.id === id ? { ...m, ...input } : m)),
        () => api.put(`/api/meals/${id}`, input),
        "Não foi possível editar a refeição",
      ),
    [meals, commit],
  );

  const deleteMeal = useCallback(
    (id: string) =>
      commit(
        meals.filter((m) => m.id !== id),
        () => api.del(`/api/meals/${id}`),
        "Não foi possível remover a refeição",
      ),
    [meals, commit],
  );

  return { meals, pendingTypes, count: meals.length, loading, addMeal, editMeal, deleteMeal, reload };
}
```

- [ ] **Step 2: Tornar `useRemedios.addMedication` otimista**

Em `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts`, substituir o corpo de `addMedication`
por (mantendo o resto do arquivo):

```ts
  const addMedication = useCallback(
    async (input: { name: string; dose?: string; stock?: number; times: string[] }) => {
      const prev = data;
      const newSlots: IntakeSlot[] = input.times.map((time) => ({
        medicationId: `tmp-${crypto.randomUUID()}`,
        name: input.name,
        dose: input.dose ?? null,
        time,
        taken: false,
      }));
      const next = [...intakes, ...newSlots].sort(
        (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
      );
      setData({ intakes: next }); // otimista
      try {
        await api.post<{ medication: Medication }>("/api/medications", input);
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível cadastrar o remédio");
      }
    },
    [data, intakes, setData, reload],
  );
```

> `useRemedios` já destrutura `{ data, loading, reload, setData }` do `useResource` e já
> importa `IntakeSlot`, `Medication`, `toastError`, `api`. `intakes = data?.intakes ?? []`.

- [ ] **Step 3: check-types + testes**

Run (raiz): `bun check-types`; Run (de `apps/web`): `bun run test` — tudo verde. (Não commitar.)

---

### Task 4: Front — `MealModal` edição + swipe na seção + estado no `page.tsx`

**Files:**
- Modify: `apps/web/src/app/(app)/corpo/components/MealModal.tsx` (prop `editing`)
- Modify: `apps/web/src/app/(app)/corpo/components/RefeicoesSection.tsx` (envolver em `SwipeableRow`)
- Modify: `apps/web/src/app/(app)/corpo/page.tsx` (estado criar vs editar)

**Interfaces:**
- Consumes: `SwipeableRow`, `useRefeicoes().editMeal`/`deleteMeal`.
- Produces: `MealModal` aceita `editing?: { type: MealType; description: string }`;
  `RefeicoesSection` aceita `onEdit: (meal: Meal) => void` e `onDelete: (id: string) => void`.

- [ ] **Step 1: `MealModal` — modo edição**

Em `MealModal.tsx`: adicionar a prop `editing` e pré-preencher. Trocar a assinatura e o
`useEffect`:

```tsx
export function MealModal({
  open,
  onOpenChange,
  initialType,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: MealType;
  editing?: { type: MealType; description: string };
  onSubmit: (input: { type: MealType; description: string }) => void;
}) {
  const [type, setType] = useState<MealType>(initialType ?? "breakfast");
  const [items, setItems] = useState<string[]>([""]);

  useEffect(() => {
    if (open) {
      setType(editing?.type ?? initialType ?? "breakfast");
      const parsed = editing?.description
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setItems(parsed && parsed.length > 0 ? parsed : [""]);
    }
  }, [open, initialType, editing]);
```

E trocar o título do `BottomSheet` para refletir o modo:

```tsx
      title={editing ? "Editar refeição" : "Adicionar refeição"}
```

> O resto do `MealModal` (itens dinâmicos, `submit`, footer) fica igual. O pai decide se
> `onSubmit` chama `addMeal` (criar) ou `editMeal` (editar).

- [ ] **Step 2: `RefeicoesSection` — swipe nos cards feitos**

Em `RefeicoesSection.tsx`: importar `SwipeableRow`, aceitar `onEdit`/`onDelete`, e envolver
**só o card feito** (o `.map(meals)`). Ajustes:

Assinatura:

```tsx
export function RefeicoesSection({
  meals,
  pendingTypes,
  onOpenModal,
  onEdit,
  onDelete,
}: {
  meals: Meal[];
  pendingTypes: MealType[];
  onOpenModal: (type?: MealType) => void;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}) {
```

Import (topo): `import { SwipeableRow } from "@/components/swipeable-row";`

Trocar o bloco do card feito por (envolvendo em `SwipeableRow`):

```tsx
      {meals.map((m) => {
        const MealIcon = MEAL_ICONS[m.type];
        return (
          <SwipeableRow key={m.id} onEdit={() => onEdit(m)} onDelete={() => onDelete(m.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="green" icon={<MealIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-bold text-ink">{MEAL_LABELS[m.type]}</span>
                <span className="text-[12px] font-semibold text-ink-read">{m.description}</span>
              </div>
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            </div>
          </SwipeableRow>
        );
      })}
```

> A lista de pendentes fica **exatamente como está** (sem swipe).

- [ ] **Step 3: `page.tsx` — estado criar vs editar**

Em `corpo/page.tsx`: adicionar estado da refeição em edição e ligar os callbacks. Trocar o
trecho de refeições:

```tsx
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
```

(import `Meal` de `@/lib/api-types` junto do `MealType`.)

`RefeicoesSection` e `MealModal`:

```tsx
      <RefeicoesSection
        meals={ref.meals}
        pendingTypes={ref.pendingTypes}
        onOpenModal={(t) => {
          setEditingMeal(null);
          setMealType(t);
          setMealOpen(true);
        }}
        onEdit={(m) => {
          setEditingMeal(m);
          setMealOpen(true);
        }}
        onDelete={ref.deleteMeal}
      />
      {/* ... */}
      <MealModal
        open={mealOpen}
        onOpenChange={setMealOpen}
        initialType={mealType}
        editing={editingMeal ? { type: editingMeal.type, description: editingMeal.description } : undefined}
        onSubmit={(input) => {
          if (editingMeal) ref.editMeal(editingMeal.id, input);
          else ref.addMeal(input);
        }}
      />
```

- [ ] **Step 4: check-types**

Run (raiz): `bun check-types` → sem erros. (Não commitar.)

---

### Task 5: Verificação da fase

- [ ] **Step 1: Types + testes**

Run (raiz): `bun check-types`; Run (de `apps/web`): `bun run test` — verdes (inclui o novo
`updateMeal`).

- [ ] **Step 2: Verificação visual (3001, com sessão de teste)**

- [ ] Swipe ← num card de refeição feita revela **Excluir** (coral); tocar exclui — o card
      some **na hora** (otimista) e a pendência daquele tipo reaparece.
- [ ] Swipe → revela **Editar** (lilás); tocar abre o modal **preenchido** (tipo + itens);
      salvar persiste via PUT e o card reflete a mudança na hora.
- [ ] Abrir o swipe de uma linha **fecha** o de outra; tocar fora fecha.
- [ ] Criar refeição continua funcionando, agora otimista (aparece antes da resposta).
- [ ] Erro (derrubar rede) reverte o otimista e mostra toast **coral**.
- [ ] Cards **pendentes** não deslizam.

- [ ] **Step 3: parar (não commitar)** — reportar para a usuária revisar/commitar.

## Verificação final

- [ ] `check-types` verde; `updateMeal` testado; suíte verde.
- [ ] Swipe editar/excluir + tudo otimista verificados na 3001.
- [ ] Nada commitado (a usuária commita).

## Self-review (executado na escrita do plano)

- **Cobertura vs. spec:** D1 escopo só refeições (T4 envolve só o card feito); D2
  `PUT /api/meals/:id` (T1, com teste); D3 swipe-revela-botão + uma-linha-aberta +
  tap-fora + reduced-motion (T2); D4 tudo otimista (T3 refeições + remédio). ✔
- **Placeholders:** nenhum; código completo. Teste de `updateMeal` usa o harness real
  (`createTestDb`/`createTestUser`, padrão do `medications/service.test.ts`).
- **Consistência de tipos:** `updateMeal(db,userId,id,{type?,description?})` (T1) chamado
  como `api.put('/api/meals/:id', input)` no `editMeal` (T3), consumido no `page.tsx` (T4).
  `SwipeableRow` produz `onEdit/onDelete` (T2) consumidos por `RefeicoesSection` (T4).
  `editing?: {type,description}` (T4 MealModal) alimentado pelo `editingMeal` do page (T4).
- **react-server:** `recomputePending` fica **dentro** do hook `"use client"` e **não é
  testado** (sem import em teste) — não recai no problema do `copos`/`garrafas`.
- **Otimista + id temporário:** create/cadastro usam `tmp-<uuid>`; `reload()` reconcilia
  com o id real logo após o sucesso.
