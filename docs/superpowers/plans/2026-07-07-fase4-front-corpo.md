# Fase 4 — Front do Corpo (água, refeições, remédios) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).
>
> **Ao despachar implementer, colar no prompt:** "Read cada arquivo antes de Edit
> (`cat`/`sed`/`head` NÃO contam p/ o harness); se Edit falhar com `string not found`,
> re-Read antes de re-tentar — nunca editar de memória; rodar `bun check-types` (da raiz)
> antes de commit."

**Goal:** Entregar a aba **Corpo** funcionando de ponta a ponta contra a API existente:
resumo do dia, hidratação (gotas + adicionar copo), refeições (lista + adicionar) e
remédios do dia (marcar/desmarcar + cadastrar), com os 3 bottom sheets de criação.

**Architecture:** Tela client em `app/(app)/corpo/page.tsx` (só compõe) + hooks por seção
em `corpo/hooks/` (fetch via `useResource`, mutação híbrida). Seções e modais em
`corpo/components/` (específicos da tela). DTOs de fio (JSON) em `lib/api-types.ts`
(client-safe: `createdAt` é `string`, nunca `Date`). Leituras com `useResource`; ações de
1 toque (adicionar copo, marcar remédio) são **otimistas** via `setData` com reversão +
toast de erro; criações nos modais são **pending→reload**. Modais de criação (refeição,
remédio) usam `@tanstack/react-form` + `zod`; o de água é um stepper (estado simples).

**Tech Stack:** Next 16, React 19, Tailwind v4 (tokens Bloomy da F3), primitivos da F3
(`IconChip`, `Stepper`, `ChoiceChip`, `ProgressBar`, `BottomSheet`), `@phosphor-icons/react`,
`@tanstack/react-form`, `zod`, `sonner`, bun.

## Global Constraints

- **Autoridade visual:** `DESIGN.md` + `docs/README.md §2` (Corpo) + `§9` (modais). Recriar
  fielmente.
- **Cor por domínio:** água = **lilás**, alimentação = **verde**, remédios = **coral**.
  Botão primário de cada modal na cor do domínio (água lilás, refeição verde `green-mid`,
  remédio coral).
- **Regra do Sem-Vermelho:** refeição/remédio pendente = card **tracejado** (`border-dashed
  border-hairline` + texto `ink-read`), nunca vermelho. Erro real (toast) usa coral.
- **Feito = verde:** check de refeição/remédio concluído usa `green-deep` (`check-circle` fill).
- **Bottom sheet** ancorado embaixo (primitivo `BottomSheet`), nunca modal centrado.
- **Componentes** (convenção): seções e modais desta tela são específicos → moram em
  `apps/web/src/app/(app)/corpo/components/`; hooks em `corpo/hooks/`. Nada em `packages/ui`.
- **DTOs de fio:** definir em `apps/web/src/lib/api-types.ts` com `createdAt: string`
  (JSON serializa `Date`→ISO). **Nunca** importar `$inferSelect`/tipos `server-only` no client.
- **Dia:** o back deriva `day` (fuso BR, `dayFor()`); o client **omite** `day` nas chamadas
  (default = hoje). Não recalcular fuso no client.
- **Verificação:** `bun check-types` + `bun test` (de `apps/web`) + render real na 3001.

## Contrato REST consumido (da Fase 1)

| Método | Rota | Body/Query | Retorno |
|---|---|---|---|
| GET | `/api/goals` | — | `{ goals: Goal[] }` |
| GET | `/api/water` | — (hoje) | `{ logs: WaterLog[], totalMl: number }` |
| POST | `/api/water` | `{ ml }` | `{ log: WaterLog }` (201) |
| DELETE | `/api/water/last` | — | `{ removed: WaterLog \| null }` |
| GET | `/api/meals` | — | `{ meals: Meal[], pendingTypes: MealType[] }` |
| POST | `/api/meals` | `{ type, description }` | `{ meal: Meal }` (201) |
| DELETE | `/api/meals/:id` | — | `{ ok: true }` |
| GET | `/api/medications` | — | `{ medications: Medication[] }` |
| POST | `/api/medications` | `{ name, dose?, stock?, times[] }` | `{ medication: Medication }` (201) |
| GET | `/api/intakes` | — | `{ intakes: IntakeSlot[] }` |
| POST | `/api/intakes` | `{ medicationId, time }` | `{ ok: true }` (201; **409** se já marcada) |
| DELETE | `/api/intakes?medicationId=&time=` | query | `{ ok: true }` |

Defaults de metas: água 2000 ml/dia · refeições 3/dia. `MealType = "breakfast" | "lunch"
| "dinner" | "snack"`; pendência só em breakfast/lunch/dinner. `IntakeSlot` é derivada.

---

### Task 1: Setup — DTOs de fio, Toaster e sessão de teste

**Files:**
- Create: `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/app/layout.tsx` (montar `<Toaster />`)

**Interfaces:**
- Produces: tipos `Goal`, `WaterLog`, `WaterDay`, `MealType`, `Meal`, `MealsDay`,
  `Medication`, `IntakeSlot`, `MEAL_LABELS`, `MAIN_MEAL_TYPES`; `<Toaster/>` montado.

- [ ] **Step 1: DTOs de fio (client-safe)**

Criar `apps/web/src/lib/api-types.ts`:

```ts
// DTOs como chegam pela API (JSON). createdAt/updatedAt são strings ISO, não Date.

export type GoalDomain = "water" | "meals" | "workout" | "mind";

export type Goal = {
  id: string;
  domain: GoalDomain;
  target: number;
  unit: "ml" | "count" | "days";
  period: "day" | "week";
};

export type WaterLog = { id: string; ml: number; day: string; createdAt: string };
export type WaterDay = { logs: WaterLog[]; totalMl: number };

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

/** Rótulos PT-BR das refeições (ordem de exibição). */
export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Café",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
};

/** Só estas geram pendência (lanche nunca). */
export const MAIN_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export type Meal = {
  id: string;
  type: MealType;
  description: string;
  day: string;
  createdAt: string;
};
export type MealsDay = { meals: Meal[]; pendingTypes: MealType[] };

export type Medication = {
  id: string;
  name: string;
  dose: string | null;
  stock: number | null;
  times: string[];
  active: boolean;
};

export type IntakeSlot = {
  medicationId: string;
  name: string;
  dose: string | null;
  time: string;
  taken: boolean;
};

/** ml por copo — usado no cálculo de copos da hidratação. */
export const COPO_ML = 250;
```

- [ ] **Step 2: Montar o Toaster (sonner) no layout raiz**

Em `apps/web/src/app/layout.tsx`, importar o `Toaster` de `@bloomy/ui/components/sonner` e
renderizá-lo dentro da coluna, depois de `{children}`:

```tsx
import { Toaster } from "@bloomy/ui/components/sonner";
// ...
        <div className="mx-auto flex min-h-dvh w-full max-w-105 flex-col bg-bg sm:shadow-device">
          {children}
        </div>
        <Toaster position="top-center" richColors={false} />
```

> Confirmar a assinatura exportada em `packages/ui/src/components/sonner.tsx` (é o
> `Toaster` do shadcn/sonner). Se o export for default, ajustar o import.

- [ ] **Step 3: Helper de toast de erro (coral, Regra do Sem-Vermelho)**

Adicionar ao fim de `apps/web/src/lib/api-types.ts` **não** — criar
`apps/web/src/lib/toast.ts`:

```ts
"use client";

import { toast } from "sonner";

import { ApiError } from "@/lib/api";

/** Toast de erro na cor coral (nunca vermelho). Extrai a mensagem de ApiError. */
export function toastError(e: unknown, fallback = "Algo deu errado") {
  const message = e instanceof ApiError ? e.message : fallback;
  toast.error(message, { style: { background: "#fbecef", color: "#c76e93", border: "none" } });
}
```

- [ ] **Step 4: Criar uma sessão de teste (dev)**

O gate está desligado (F3), mas `/api/*` exige sessão. Criar um usuário de teste **uma vez**
(com o dev server na 3001):

```bash
curl -i -c /tmp/bloomy-cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "content-type: application/json" \
  -d '{"email":"dev@bloomy.test","password":"devdevdev","name":"Dev"}'
```

No **navegador** (a mesma origem), fazer login uma vez para o cookie de sessão ficar salvo,
ou reusar o cookie acima em chamadas curl. Depois, `/api/goals` já cria as metas default.
Verificar: `curl -b /tmp/bloomy-cookies.txt http://localhost:3001/api/goals` retorna 4 metas.

- [ ] **Step 5: check-types + commit**

Run (raiz): `bun check-types`

```bash
git add apps/web/src/lib/api-types.ts apps/web/src/lib/toast.ts apps/web/src/app/layout.tsx
git commit -m "feat(corpo): DTOs de fio, Toaster e helper de toast de erro"
```

---

### Task 2: Hidratação — hook, seção e modal de água

**Files:**
- Create: `apps/web/src/app/(app)/corpo/hooks/copos.ts` (função pura, **sem React**)
- Create: `apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts`
- Create: `apps/web/src/app/(app)/corpo/hooks/useHidratacao.test.ts`
- Create: `apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx`
- Create: `apps/web/src/app/(app)/corpo/components/WaterModal.tsx`

> ⚠️ **Correção aplicada na execução:** `copos` deve morar em `copos.ts` (módulo puro,
> zero import de React), **não** dentro do `useHidratacao.ts` (`"use client"`). O `bun test`
> roda com `--conditions react-server`, sob o qual um módulo que importa `useState`/
> `useCallback` do React quebra ao carregar — então o teste de `copos` só passa se importar
> de um arquivo sem React. O hook importa `copos` de `./copos`; o teste também.

**Interfaces:**
- Consumes: `api` (`@/lib/api`), `useResource`, `WaterDay`, `Goal`, `COPO_ML`, `toastError`.
- Produces:
  - `copos(totalMl, goalMl): { done: number; target: number }` (pura, testável).
  - `useHidratacao(goalMl): { totalMl, done, target, loading, addWater(ml), reload }`.
  - `<HidratacaoSection totalMl done target onAddCopo onOpenModal />`.
  - `<WaterModal open onOpenChange onConfirm />` (`onConfirm(ml)`).

- [ ] **Step 1: Teste da função pura `copos` (falhando)**

Criar `apps/web/src/app/(app)/corpo/hooks/useHidratacao.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { copos } from "./useHidratacao";

describe("copos", () => {
  it("deriva copos feitos e alvo a partir de ml", () => {
    expect(copos(1250, 2000)).toEqual({ done: 5, target: 8 });
  });
  it("nunca passa do alvo e arredonda", () => {
    expect(copos(2200, 2000)).toEqual({ done: 8, target: 8 });
  });
  it("alvo mínimo 1 mesmo com meta 0", () => {
    expect(copos(0, 0)).toEqual({ done: 0, target: 1 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test src/app/\(app\)/corpo/hooks/useHidratacao.test.ts`
Expected: FAIL — `copos` não existe.

- [ ] **Step 3: Implementar o hook**

Criar `apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import { COPO_ML, type WaterDay } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

/** Copos feitos/alvo a partir de ml. Alvo mínimo 1; done nunca passa do alvo. */
export function copos(totalMl: number, goalMl: number): { done: number; target: number } {
  const target = Math.max(1, Math.round(goalMl / COPO_ML));
  const done = Math.min(target, Math.round(totalMl / COPO_ML));
  return { done, target };
}

export function useHidratacao(goalMl: number) {
  const { data, loading, reload, setData } = useResource<WaterDay>(
    useCallback(() => api.get<WaterDay>("/api/water"), []),
  );

  const totalMl = data?.totalMl ?? 0;
  const { done, target } = copos(totalMl, goalMl);

  const addWater = useCallback(
    async (ml: number) => {
      const prev = data;
      // Otimista: soma o total na hora (as gotas reagem ao totalMl)
      setData({ logs: data?.logs ?? [], totalMl: totalMl + ml });
      try {
        await api.post("/api/water", { ml });
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível registrar a água");
      }
    },
    [data, totalMl, setData, reload],
  );

  return { totalMl, done, target, loading, addWater, reload };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run (de `apps/web`): `bun test src/app/\(app\)/corpo/hooks/useHidratacao.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Seção de hidratação**

Criar `apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx`:

```tsx
"use client";

import { DropIcon, PlusIcon } from "@phosphor-icons/react";

export function HidratacaoSection({
  done,
  target,
  onAddCopo,
  onOpenModal,
}: {
  done: number;
  target: number;
  onAddCopo: () => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">Hidratação</h2>
        <span className="text-[13px] font-semibold text-ink-read">
          {done} de {target} copos
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: target }, (_, i) => (
          <DropIcon
            key={i}
            size={28}
            weight="fill"
            className={i < done ? "text-lilac" : "text-control-off"}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddCopo}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-lilac py-3 font-display text-[15px] font-bold text-white shadow-btn"
        >
          <PlusIcon size={18} weight="bold" /> Adicionar copo
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

- [ ] **Step 6: Modal de água (stepper + atalhos)**

Criar `apps/web/src/app/(app)/corpo/components/WaterModal.tsx`:

```tsx
"use client";

import { DropIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { Stepper } from "@/components/stepper";

const SHORTCUTS = [200, 250, 500, 750];
const SHORTCUT_LABELS: Record<number, string> = { 200: "200", 250: "250", 500: "500", 750: "Garrafa" };

export function WaterModal({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ml: number) => void;
}) {
  const [ml, setMl] = useState(250);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar água"
      tone="lilac"
      icon={<DropIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          onClick={() => {
            onConfirm(ml);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Registrar
        </button>
      }
    >
      <Stepper value={ml} min={50} max={2000} step={50} onChange={setMl} unit="ml" />
      <div className="flex gap-2">
        {SHORTCUTS.map((s) => (
          <ChoiceChip key={s} selected={ml === s} onClick={() => setMl(s)}>
            {SHORTCUT_LABELS[s]}
          </ChoiceChip>
        ))}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 7: check-types + commit**

Run (raiz): `bun check-types`

```bash
git add "apps/web/src/app/(app)/corpo/hooks/useHidratacao.ts" "apps/web/src/app/(app)/corpo/hooks/useHidratacao.test.ts" "apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx" "apps/web/src/app/(app)/corpo/components/WaterModal.tsx"
git commit -m "feat(corpo): hidratação — hook otimista, seção de gotas e modal de água"
```

---

### Task 3: Refeições — hook, seção e modal

**Files:**
- Create: `apps/web/src/app/(app)/corpo/hooks/useRefeicoes.ts`
- Create: `apps/web/src/app/(app)/corpo/components/RefeicoesSection.tsx`
- Create: `apps/web/src/app/(app)/corpo/components/MealModal.tsx`

**Interfaces:**
- Consumes: `api`, `useResource`, `MealsDay`, `Meal`, `MealType`, `MEAL_LABELS`,
  `MAIN_MEAL_TYPES`, `toastError`, `@tanstack/react-form`, `zod`.
- Produces:
  - `useRefeicoes(): { meals, pendingTypes, count, loading, addMeal(input), deleteMeal(id), reload }`.
  - `<RefeicoesSection meals pendingTypes onOpenModal onDelete />`.
  - `<MealModal open onOpenChange onSubmit />` (`onSubmit({ type, description })`).

- [ ] **Step 1: Hook de refeições**

Criar `apps/web/src/app/(app)/corpo/hooks/useRefeicoes.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Meal, MealsDay, MealType } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRefeicoes() {
  const { data, loading, reload } = useResource<MealsDay>(
    useCallback(() => api.get<MealsDay>("/api/meals"), []),
  );

  const addMeal = useCallback(
    async (input: { type: MealType; description: string }) => {
      try {
        await api.post<{ meal: Meal }>("/api/meals", input);
        reload();
      } catch (e) {
        toastError(e, "Não foi possível salvar a refeição");
      }
    },
    [reload],
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      try {
        await api.del(`/api/meals/${id}`);
        reload();
      } catch (e) {
        toastError(e, "Não foi possível remover a refeição");
      }
    },
    [reload],
  );

  return {
    meals: data?.meals ?? [],
    pendingTypes: data?.pendingTypes ?? [],
    count: data?.meals.length ?? 0,
    loading,
    addMeal,
    deleteMeal,
    reload,
  };
}
```

- [ ] **Step 2: Seção de refeições (feitas + pendentes tracejadas)**

Criar `apps/web/src/app/(app)/corpo/components/RefeicoesSection.tsx`:

```tsx
"use client";

import { CheckCircleIcon, ForkKnifeIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { MEAL_LABELS, type Meal, type MealType } from "@/lib/api-types";

export function RefeicoesSection({
  meals,
  pendingTypes,
  onOpenModal,
}: {
  meals: Meal[];
  pendingTypes: MealType[];
  onOpenModal: (type?: MealType) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">Alimentação</h2>
        <button
          type="button"
          onClick={() => onOpenModal()}
          className="flex items-center gap-1 text-[13px] font-bold text-green-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar
        </button>
      </div>

      {meals.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
          <IconChip tone="green" icon={<ForkKnifeIcon size={22} weight="fill" />} />
          <div className="flex flex-1 flex-col">
            <span className="text-[13px] font-bold text-ink">{MEAL_LABELS[m.type]}</span>
            <span className="text-[12px] font-semibold text-ink-read">{m.description}</span>
          </div>
          <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
        </div>
      ))}

      {pendingTypes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onOpenModal(t)}
          className="flex items-center gap-3 rounded-card border border-dashed border-hairline p-3 text-left"
        >
          <IconChip tone="green" variant="white" icon={<ForkKnifeIcon size={22} weight="fill" />} />
          <span className="flex-1 text-[13px] font-semibold text-ink-read">
            {MEAL_LABELS[t]} — registrar
          </span>
          <PlusIcon size={20} weight="bold" className="text-ink-faint" />
        </button>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Modal de refeição (react-form + zod)**

Criar `apps/web/src/app/(app)/corpo/components/MealModal.tsx`:

```tsx
"use client";

import { ForkKnifeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { MAIN_MEAL_TYPES, MEAL_LABELS, type MealType } from "@/lib/api-types";

const ALL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const schema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().trim().min(1, "Conta o que você comeu"),
});

export function MealModal({
  open,
  onOpenChange,
  initialType,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: MealType;
  onSubmit: (input: { type: MealType; description: string }) => void;
}) {
  const form = useForm({
    defaultValues: { type: (initialType ?? "breakfast") as MealType, description: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({ type: value.type, description: value.description.trim() });
      onOpenChange(false);
    },
  });

  // Ao reabrir com um tipo pré-selecionado (card pendente), refletir no form.
  useEffect(() => {
    if (open) {
      form.reset();
      if (initialType) form.setFieldValue("type", initialType);
    }
  }, [open, initialType, form]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar refeição"
      tone="green"
      icon={<ForkKnifeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-green-mid py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              Salvar
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="type">
        {(field) => (
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <ChoiceChip
                key={t}
                tone="green"
                selected={field.state.value === t}
                onClick={() => field.handleChange(t)}
              >
                {MEAL_LABELS[t]}
              </ChoiceChip>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1">
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="O que você comeu?"
              className="rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          </div>
        )}
      </form.Field>
    </BottomSheet>
  );
}
```

> `MAIN_MEAL_TYPES` é importado só para manter o vínculo semântico com a pendência (usado
> na seção); aqui o seletor mostra os 4 tipos. Horário/Foto do protótipo ficam fora da F4
> (a API só guarda `type`+`description`); adicionar quando o schema suportar.

- [ ] **Step 4: check-types + commit**

Run (raiz): `bun check-types`

```bash
git add "apps/web/src/app/(app)/corpo/hooks/useRefeicoes.ts" "apps/web/src/app/(app)/corpo/components/RefeicoesSection.tsx" "apps/web/src/app/(app)/corpo/components/MealModal.tsx"
git commit -m "feat(corpo): refeições — hook, lista com pendência tracejada e modal"
```

---

### Task 4: Remédios — hook, seção e modal

**Files:**
- Create: `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts`
- Create: `apps/web/src/app/(app)/corpo/components/RemediosSection.tsx`
- Create: `apps/web/src/app/(app)/corpo/components/MedicationModal.tsx`

**Interfaces:**
- Consumes: `api`, `useResource`, `IntakeSlot`, `Medication`, `toastError`, react-form, zod.
- Produces:
  - `useRemedios(): { intakes, taken, total, loading, toggle(slot), addMedication(input), reload }`.
  - `<RemediosSection intakes onToggle onOpenModal />`.
  - `<MedicationModal open onOpenChange onSubmit />`.

- [ ] **Step 1: Hook de remédios (toggle otimista)**

Criar `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { IntakeSlot, Medication } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRemedios() {
  const { data, loading, reload, setData } = useResource<{ intakes: IntakeSlot[] }>(
    useCallback(() => api.get<{ intakes: IntakeSlot[] }>("/api/intakes"), []),
  );

  const intakes = data?.intakes ?? [];

  const toggle = useCallback(
    async (slot: IntakeSlot) => {
      const prev = data;
      const next = intakes.map((s) =>
        s.medicationId === slot.medicationId && s.time === slot.time
          ? { ...s, taken: !s.taken }
          : s,
      );
      setData({ intakes: next }); // otimista
      try {
        if (slot.taken) {
          await api.del(
            `/api/intakes?medicationId=${encodeURIComponent(slot.medicationId)}&time=${encodeURIComponent(slot.time)}`,
          );
        } else {
          await api.post("/api/intakes", { medicationId: slot.medicationId, time: slot.time });
        }
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível atualizar o remédio");
      }
    },
    [data, intakes, setData, reload],
  );

  const addMedication = useCallback(
    async (input: { name: string; dose?: string; stock?: number; times: string[] }) => {
      try {
        await api.post<{ medication: Medication }>("/api/medications", input);
        reload();
      } catch (e) {
        toastError(e, "Não foi possível cadastrar o remédio");
      }
    },
    [reload],
  );

  const taken = intakes.filter((s) => s.taken).length;

  return { intakes, taken, total: intakes.length, loading, toggle, addMedication, reload };
}
```

- [ ] **Step 2: Seção de remédios do dia**

Criar `apps/web/src/app/(app)/corpo/components/RemediosSection.tsx`:

```tsx
"use client";

import { CheckCircleIcon, CircleIcon, PillIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { IntakeSlot } from "@/lib/api-types";

export function RemediosSection({
  intakes,
  onToggle,
  onOpenModal,
}: {
  intakes: IntakeSlot[];
  onToggle: (slot: IntakeSlot) => void;
  onOpenModal: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">Remédios de hoje</h2>
        <button
          type="button"
          onClick={onOpenModal}
          className="flex items-center gap-1 text-[13px] font-bold text-coral"
        >
          <PlusIcon size={16} weight="bold" /> Cadastrar
        </button>
      </div>

      {intakes.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-[13px] font-semibold text-ink-read">
          Nenhum remédio para hoje.
        </p>
      ) : (
        intakes.map((s) => (
          <button
            key={`${s.medicationId}|${s.time}`}
            type="button"
            onClick={() => onToggle(s)}
            className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
          >
            <IconChip tone="coral" icon={<PillIcon size={22} weight="fill" />} />
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-bold text-ink">{s.name}</span>
              <span className="text-[12px] font-semibold text-ink-read">
                {s.time}
                {s.dose ? ` · ${s.dose}` : ""}
              </span>
            </div>
            {s.taken ? (
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            ) : (
              <CircleIcon size={24} className="text-control-off" />
            )}
          </button>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 3: Modal de remédio (nome/dose/estoque + frequência + horários)**

Criar `apps/web/src/app/(app)/corpo/components/MedicationModal.tsx`:

```tsx
"use client";

import { PillIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao remédio"),
  dose: z.string().trim().optional(),
  stock: z.string().trim().optional(),
});

const FREQ_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
};

export function MedicationModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { name: string; dose?: string; stock?: number; times: string[] }) => void;
}) {
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [newTime, setNewTime] = useState("12:00");

  const form = useForm({
    defaultValues: { name: "", dose: "", stock: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        dose: value.dose?.trim() || undefined,
        stock: value.stock ? Number(value.stock) : undefined,
        times,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setTimes(["09:00"]);
    }
  }, [open, form]);

  const addTime = () => setTimes((prev) => [...new Set([...prev, newTime])].sort());
  const removeTime = (t: string) => setTimes((prev) => prev.filter((x) => x !== t));

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cadastrar remédio"
      tone="coral"
      icon={<PillIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit || times.length === 0}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              Cadastrar
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do remédio"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex gap-2">
        <form.Field name="dose">
          {(field) => (
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Dose (ex.: 1 comp.)"
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
        <form.Field name="stock">
          {(field) => (
            <input
              value={field.state.value}
              inputMode="numeric"
              onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
              placeholder="Estoque"
              className="w-28 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-ink">Frequência</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <ChoiceChip
              key={n}
              tone="coral"
              selected={times.length === n}
              onClick={() => setTimes(FREQ_TIMES[n])}
            >
              {n}x ao dia
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-ink">Horários</span>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-coral-tint px-3 py-2 text-[13px] font-semibold text-coral"
            >
              {t}
              <button type="button" aria-label={`Remover ${t}`} onClick={() => removeTime(t)}>
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-control border border-hairline bg-white px-3 py-2 text-[13px] font-semibold text-ink focus:border-lilac focus:outline-none"
          />
          <button
            type="button"
            aria-label="Adicionar horário"
            onClick={addTime}
            className="grid size-9 place-items-center rounded-full bg-coral-tint text-coral"
          >
            <PlusIcon size={16} weight="bold" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: check-types + commit**

Run (raiz): `bun check-types`

```bash
git add "apps/web/src/app/(app)/corpo/hooks/useRemedios.ts" "apps/web/src/app/(app)/corpo/components/RemediosSection.tsx" "apps/web/src/app/(app)/corpo/components/MedicationModal.tsx"
git commit -m "feat(corpo): remédios — toggle otimista, lista do dia e modal de cadastro"
```

---

### Task 5: Resumo + montagem da tela Corpo

**Files:**
- Create: `apps/web/src/app/(app)/corpo/hooks/useGoals.ts`
- Create: `apps/web/src/app/(app)/corpo/components/ResumoCard.tsx`
- Modify: `apps/web/src/app/(app)/corpo/page.tsx` (substituir o skeleton)

**Interfaces:**
- Consumes: os 3 hooks de seção, `useGoals`, `Screen`.
- Produces: tela Corpo completa.

- [ ] **Step 1: Hook de metas (targets de água e refeições)**

Criar `apps/web/src/app/(app)/corpo/hooks/useGoals.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Goal, GoalDomain } from "@/lib/api-types";
import { useResource } from "@/lib/use-resource";

export function useGoals() {
  const { data } = useResource<{ goals: Goal[] }>(
    useCallback(() => api.get<{ goals: Goal[] }>("/api/goals"), []),
  );

  const target = (domain: GoalDomain, fallback: number) =>
    data?.goals.find((g) => g.domain === domain)?.target ?? fallback;

  return { waterGoalMl: target("water", 2000), mealsTarget: target("meals", 3) };
}
```

- [ ] **Step 2: Card-resumo de 3 colunas**

Criar `apps/web/src/app/(app)/corpo/components/ResumoCard.tsx`:

```tsx
export function ResumoCard({
  agua,
  refeicoes,
  remedios,
}: {
  agua: { done: number; target: number };
  refeicoes: { done: number; target: number };
  remedios: { done: number; target: number };
}) {
  const cols = [
    { label: "Água", ...agua },
    { label: "Refeições", ...refeicoes },
    { label: "Remédios", ...remedios },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-card-lg bg-lilac-tint p-4">
      {cols.map((c) => (
        <div key={c.label} className="flex flex-col items-center gap-0.5">
          <span className="font-display text-2xl font-bold text-lilac-deep">
            {c.done}
            <span className="text-[15px] text-lilac-deep/70">/{c.target}</span>
          </span>
          <span className="text-[11px] font-bold text-lilac-deep">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Montar a tela Corpo**

Substituir `apps/web/src/app/(app)/corpo/page.tsx` inteiro por:

```tsx
"use client";

import { useState } from "react";

import { Screen } from "@/components/screen";
import { COPO_ML, type MealType } from "@/lib/api-types";

import { HidratacaoSection } from "./components/HidratacaoSection";
import { MealModal } from "./components/MealModal";
import { MedicationModal } from "./components/MedicationModal";
import { RefeicoesSection } from "./components/RefeicoesSection";
import { RemediosSection } from "./components/RemediosSection";
import { ResumoCard } from "./components/ResumoCard";
import { WaterModal } from "./components/WaterModal";
import { useGoals } from "./hooks/useGoals";
import { useHidratacao } from "./hooks/useHidratacao";
import { useRefeicoes } from "./hooks/useRefeicoes";
import { useRemedios } from "./hooks/useRemedios";

export default function CorpoPage() {
  const { waterGoalMl, mealsTarget } = useGoals();
  const hidr = useHidratacao(waterGoalMl);
  const ref = useRefeicoes();
  const rem = useRemedios();

  const [waterOpen, setWaterOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType | undefined>();
  const [medOpen, setMedOpen] = useState(false);

  return (
    <Screen title="Corpo" subtitle="Seu físico de hoje">
      <ResumoCard
        agua={{ done: hidr.done, target: hidr.target }}
        refeicoes={{ done: ref.count, target: mealsTarget }}
        remedios={{ done: rem.taken, target: rem.total }}
      />

      <HidratacaoSection
        done={hidr.done}
        target={hidr.target}
        onAddCopo={() => hidr.addWater(COPO_ML)}
        onOpenModal={() => setWaterOpen(true)}
      />

      <RefeicoesSection
        meals={ref.meals}
        pendingTypes={ref.pendingTypes}
        onOpenModal={(t) => {
          setMealType(t);
          setMealOpen(true);
        }}
      />

      <RemediosSection intakes={rem.intakes} onToggle={rem.toggle} onOpenModal={() => setMedOpen(true)} />

      <WaterModal open={waterOpen} onOpenChange={setWaterOpen} onConfirm={hidr.addWater} />
      <MealModal open={mealOpen} onOpenChange={setMealOpen} initialType={mealType} onSubmit={ref.addMeal} />
      <MedicationModal open={medOpen} onOpenChange={setMedOpen} onSubmit={rem.addMedication} />
    </Screen>
  );
}
```

- [ ] **Step 4: check-types + commit**

Run (raiz): `bun check-types`

```bash
git add "apps/web/src/app/(app)/corpo"
git commit -m "feat(corpo): resumo de 3 colunas e montagem da tela Corpo"
```

---

### Task 6: Verificação da fase

- [ ] **Step 1: Types + testes**

Run (raiz): `bun check-types`
Run (de `apps/web`): `bun test`
Expected: types verdes; `useHidratacao.test.ts` passa; suíte de back permanece verde.

- [ ] **Step 2: Verificação visual (obrigatória, com sessão de teste)**

Com o dev na 3001 e a sessão de teste (Task 1 Step 4) ativa no navegador, abrir `/corpo`:

- [ ] Resumo de 3 colunas em card tint lilás (Água/Refeições/Remédios).
- [ ] Hidratação: `target` gotas, `done` preenchidas lilás; "Adicionar copo" incrementa
      **na hora** (otimista) e persiste (recarregar a página mantém).
- [ ] Modal de água: stepper + atalhos 200/250/500/Garrafa; "Registrar" soma o valor.
- [ ] Refeições: feitas com `check-circle` verde; pendentes em card **tracejado**; abrir o
      card pendente pré-seleciona o tipo no modal; salvar remove a pendência.
- [ ] Remédios: marcar/desmarcar alterna `check-circle` verde ↔ círculo vazio otimista;
      cadastrar remédio novo faz ele aparecer nas tomas do dia.
- [ ] Erro (ex.: derrubar a rede) mostra toast **coral**, nunca vermelho, e reverte o otimista.
- [ ] Nenhuma cor fora do domínio (água lilás, refeição verde, remédio coral).

Corrigir divergências antes de fechar a fase.

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "fix(corpo): ajustes da verificação visual"
```

## Verificação final da fase

Checklist de aceitação (roadmap F4):
- [ ] Registrar água/refeição/remédio pelo modal reflete na tela sem reload manual.
- [ ] Ações de 1 toque (copo, marcar remédio) são otimistas com reversão em erro.
- [ ] `check-types` verde; teste de `copos` passa.
- [ ] Verificação visual completa na 3001.

## Self-review (executado na escrita do plano)

- **Cobertura vs. `docs/README.md §2`:** resumo 3 col (T5), hidratação 8 gotas + adicionar
  (T2), lista de refeições feitas/pendentes (T3), remédios do dia com check/círculo (T4),
  modais água/refeição/remédio §9 (T2/T3/T4). ✔
- **Decisões do spec:** D1 `useResource` (todos os hooks); D2 híbrido — otimista em água
  (T2) e toggle de remédio (T4), pending→reload em refeição/remédio-create (T3/T4); D3
  react-form+zod nos modais de refeição e remédio (água é stepper); D4 toast coral (`toast.ts`).
- **Tipos de fio:** `api-types.ts` usa `createdAt: string` (JSON), não `Date` — evita o bug
  de reusar `$inferSelect`. `IntakeSlot`/`Goal`/`MealType` batem com os serviços lidos.
- **Placeholders:** nenhum. Horário/Foto do modal de refeição ficam explicitamente fora
  (API não guarda) — decisão registrada, não lacuna.
- **Prereq real:** `/api` exige sessão (gate off só libera navegação) → Task 1 Step 4 cria a
  sessão de teste; sem ela as telas dão 401 (mostram toast, lista vazia).
- **Consistência:** `addWater(ml)` (T2) chamado pelo botão copo (`COPO_ML`) e pelo modal
  (`onConfirm`); `toggle(slot)`/`addMedication` (T4) consumidos na T5; `useGoals` alimenta
  targets do resumo (T5).
