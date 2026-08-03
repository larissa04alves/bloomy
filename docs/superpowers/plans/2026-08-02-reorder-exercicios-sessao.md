# Reorder de exercícios na sessão ativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir reordenar os exercícios de uma sessão de treino em andamento, arrastando por um handle dedicado em cada linha.

**Architecture:** `Reorder.Group`/`Reorder.Item` do `motion/react` (já instalado) com `useDragControls`, para que só o handle inicie o arraste e o swipe horizontal existente do `SwipeableRow` continue intacto. A ordem local é otimista (`onReorder`) e só vai pra rede no drop (`onDragEnd`), via `PATCH` na coleção de exercícios da sessão, que exige permutação exata dos ids.

**Tech Stack:** Next.js 16 (App Router), React 19, `motion@12.42.2`, Drizzle + libsql, zod, Tailwind 4, `bun test`.

**Spec:** [`docs/superpowers/specs/2026-08-02-reorder-exercicios-sessao-design.md`](../specs/2026-08-02-reorder-exercicios-sessao-design.md)

## Global Constraints

- **NÃO commitar.** Entregar tudo como mudanças não-commitadas — a Larissa commita e revisa (CLAUDE.md do bloomy). Nenhuma task deste plano tem passo de commit.
- **Ler antes de editar:** `Read` em cada arquivo antes de `Edit`. `cat`/`sed`/`head` não contam para o harness. Se um `Edit` falhar com `string not found`, re-`Read` antes de tentar de novo — nunca editar de memória.
- `bun check-types` da raiz do repo tem que passar antes de considerar qualquer task pronta.
- Testes rodam **de `apps/web`**, nunca da raiz, e **sempre com `--conditions react-server`** — sem essa flag o guard `server-only` derruba os imports (`apps/web/CLAUDE.md`). Suíte inteira: `bun run test` (o script já embute a flag). Arquivo único: `bun test --conditions react-server <arquivo>`.
- Nenhuma dependência nova. `Reorder` e `useDragControls` vêm de `motion/react`, que já está em `apps/web/package.json`.
- Nenhuma migration. `session_exercise.position` já existe e é `notNull`.
- **Tamanho de fonte só na escala nomeada do Tailwind** (`text-xs`, `text-sm`, `text-base`…) — nunca `text-[13px]`.
- Telas e strings de UI em PT; identificadores, tipos e mensagens de erro de API em EN.
- Rotas são wrappers finos: zod → `requireUserId` → serviço. Nenhuma regra de negócio em `route.ts`.

---

### Task 1: Serviço `reorderSessionExercises`

**Files:**
- Modify: `apps/web/src/server/workout/session.ts` (adicionar função exportada após `removeSessionExercise`, que termina na linha 543)
- Test: `apps/web/src/server/workout/session.test.ts` (adicionar `describe` no fim do arquivo)

**Interfaces:**
- Consumes: `activeSessionById(db, userId, sessionId): Promise<WorkoutSession | null>` (privada, `session.ts:306`), `buildSessionDetail(db, session, userId): Promise<SessionDetail>` (privada, `session.ts:64`)
- Produces: `reorderSessionExercises(db: Db, userId: string, sessionId: string, ids: string[]): Promise<SessionDetail | "mismatch" | null>` — `null` = sessão inexistente, de outro usuário ou já concluída; `"mismatch"` = `ids` não é permutação exata dos exercícios da sessão

- [ ] **Step 1: Escrever os testes que falham**

Adicionar no fim de `apps/web/src/server/workout/session.test.ts`. Incluir `reorderSessionExercises` no `import { ... } from "./session"` que já existe no topo (linha 5-14) — mantendo a ordem alfabética dos nomes importados.

```ts
describe("reorderSessionExercises", () => {
  async function setup() {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const w = await createWorkout(db, userId, {
      name: "Peito",
      focus: "chest",
      exercises: [
        { name: "Supino", targetSets: 2, targetReps: 10, restSeconds: 60, position: 0 },
        { name: "Voador", targetSets: 2, targetReps: 12, restSeconds: 45, position: 1 },
        { name: "Crucifixo", targetSets: 3, targetReps: 12, restSeconds: 45, position: 2 },
      ],
    });
    const s = await startSession(db, userId, w.id);
    if (s === "already_active" || s === "not_found") throw new Error("unreachable");
    return { db, userId, w, s };
  }

  test("permutação válida renumera position como 0..n-1 na ordem recebida", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;

    const updated = await reorderSessionExercises(db, userId, s.session.id, [
      crucifixo.id,
      supino.id,
      voador.id,
    ]);

    if (updated === null || updated === "mismatch") throw new Error("unreachable");
    expect(updated.exercises.map((e) => e.name)).toEqual(["Crucifixo", "Supino", "Voador"]);
    expect(updated.exercises.map((e) => e.position)).toEqual([0, 1, 2]);
  });

  test("reorder não mexe nas séries já registradas", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;
    await updateSet(db, userId, s.session.id, supino.sets[0].id, {
      reps: 10,
      load: 40,
      done: true,
    });

    const updated = await reorderSessionExercises(db, userId, s.session.id, [
      voador.id,
      crucifixo.id,
      supino.id,
    ]);
    if (updated === null || updated === "mismatch") throw new Error("unreachable");

    const moved = updated.exercises.find((e) => e.id === supino.id)!;
    expect(moved.position).toBe(2);
    expect(moved.sets).toHaveLength(2);
    expect(moved.sets.filter((set) => set.done)).toHaveLength(1);
    expect(moved.sets[0].load).toBe(40);
  });

  test("id faltando → mismatch e nenhuma posição muda", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [voador.id, supino.id]),
    ).toBe("mismatch");

    const rows = await db.select().from(sessionExercise);
    expect(rows.map((r) => `${r.name}:${r.position}`).sort()).toEqual([
      "Crucifixo:2",
      "Supino:0",
      "Voador:1",
    ]);
  });

  test("id repetido → mismatch", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [
        supino.id,
        supino.id,
        voador.id,
      ]),
    ).toBe("mismatch");
  });

  test("id que não pertence à sessão → mismatch", async () => {
    const { db, userId, s } = await setup();
    const [supino, voador] = s.exercises;

    expect(
      await reorderSessionExercises(db, userId, s.session.id, [
        supino.id,
        voador.id,
        "id-que-nao-existe",
      ]),
    ).toBe("mismatch");
  });

  test("sessão de outro usuário → null", async () => {
    const { db, s } = await setup();
    const outro = await createTestUser(db, "user-2");

    expect(
      await reorderSessionExercises(
        db,
        outro,
        s.session.id,
        s.exercises.map((e) => e.id),
      ),
    ).toBeNull();
  });

  test("sessão já concluída → null", async () => {
    const { db, userId, s } = await setup();
    await completeSession(db, userId, s.session.id);

    expect(
      await reorderSessionExercises(
        db,
        userId,
        s.session.id,
        s.exercises.map((e) => e.id).reverse(),
      ),
    ).toBeNull();
  });

  test("applySessionToWorkout depois do reorder leva a ordem nova pro template", async () => {
    const { db, userId, w, s } = await setup();
    const [supino, voador, crucifixo] = s.exercises;

    await reorderSessionExercises(db, userId, s.session.id, [
      crucifixo.id,
      supino.id,
      voador.id,
    ]);
    const updatedWorkout = await applySessionToWorkout(db, userId, s.session.id);

    expect(updatedWorkout!.id).toBe(w.id);
    expect(updatedWorkout!.exercises.map((e) => e.name)).toEqual([
      "Crucifixo",
      "Supino",
      "Voador",
    ]);
    expect(updatedWorkout!.exercises.map((e) => e.position)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/workout/session.test.ts`
Expected: FAIL — `reorderSessionExercises is not a function` / erro de import (o símbolo ainda não existe).

- [ ] **Step 3: Implementar o serviço**

Em `apps/web/src/server/workout/session.ts`, adicionar após `removeSessionExercise` (que termina na linha 543, antes do comentário `/** Aplica os ajustes da sessão... */`):

```ts
/**
 * Reordena os exercícios da sessão. `ids` tem que ser permutação exata dos exercícios
 * atuais — isso impede um cliente com estado velho de sumir com ou duplicar uma linha.
 */
export async function reorderSessionExercises(
  db: Db,
  userId: string,
  sessionId: string,
  ids: string[],
): Promise<SessionDetail | "mismatch" | null> {
  const session = await activeSessionById(db, userId, sessionId);
  if (!session) return null;

  const rows = await db
    .select({ id: sessionExercise.id })
    .from(sessionExercise)
    .where(eq(sessionExercise.sessionId, sessionId));

  const current = new Set(rows.map((r) => r.id));
  const received = new Set(ids);
  // Set descarta repetição: comparar os três tamanhos cobre faltando, extra e duplicado.
  if (received.size !== ids.length || received.size !== current.size) return "mismatch";
  if (ids.some((id) => !current.has(id))) return "mismatch";

  const result = await db.transaction(async (tx) => {
    // re-checagem atômica: completeSession pode ter concluído a sessão desde o guard externo
    const [live] = await tx
      .select({ id: workoutSession.id })
      .from(workoutSession)
      .where(
        and(
          eq(workoutSession.id, sessionId),
          eq(workoutSession.userId, userId),
          isNull(workoutSession.completedAt),
        ),
      );
    if (!live) return null;

    for (const [i, id] of ids.entries()) {
      await tx
        .update(sessionExercise)
        .set({ position: i })
        .where(and(eq(sessionExercise.id, id), eq(sessionExercise.sessionId, sessionId)));
    }
    return true;
  });
  if (result === null) return null;

  return buildSessionDetail(db, session, userId);
}
```

Os imports usados (`and`, `eq`, `isNull`, `sessionExercise`, `workoutSession`, `Db`) já estão no topo do arquivo (linhas 3-14) — não precisa adicionar nenhum.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server src/server/workout/session.test.ts`
Expected: PASS — os 8 testes novos do `describe("reorderSessionExercises")` mais todos os que já existiam no arquivo.

- [ ] **Step 5: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros. **Não commitar** — deixar como mudança não-commitada.

---

### Task 2: Rota `PATCH /api/sessions/[id]/exercises`

**Files:**
- Modify: `apps/web/src/app/api/sessions/[id]/exercises/route.ts` (adicionar `PATCH` depois do `POST` existente)

**Interfaces:**
- Consumes: `reorderSessionExercises` da Task 1; `requireUserId`, `parseJson`, `invalidBody`, `unauthorized`, `notFound`, `conflict` de `@/server/shared/api`
- Produces: `PATCH /api/sessions/{id}/exercises` com body `{ ids: string[] }` → `200 { session }` · `400 { error }` · `401` · `404` · `409 { error: "exercise set mismatch" }`

Não criar `exercises/order/route.ts`: um segmento estático `order` conviveria com `[sessionExerciseId]` na mesma altura da árvore, e a correção passaria a depender da precedência estático-sobre-dinâmico do Next.

- [ ] **Step 1: Adicionar o schema e o handler**

Em `apps/web/src/app/api/sessions/[id]/exercises/route.ts`, adicionar o schema abaixo do `BODY_SCHEMA` existente (que termina na linha 22):

```ts
const ORDER_SCHEMA = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
```

E o handler no fim do arquivo, depois do `POST`:

```ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = ORDER_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const { id } = await params;
  const session = await reorderSessionExercises(db, userId, id, parsed.data.ids);
  if (session === "mismatch") return conflict("exercise set mismatch");
  if (!session) return notFound();

  return Response.json({ session });
}
```

- [ ] **Step 2: Atualizar o import do serviço**

No mesmo arquivo, trocar a linha 13:

```ts
import { addSessionExercise } from "@/server/workout/session";
```

por:

```ts
import { addSessionExercise, reorderSessionExercises } from "@/server/workout/session";
```

`conflict`, `invalidBody`, `notFound`, `parseJson`, `requireUserId` e `unauthorized` já estão importados de `@/server/shared/api` (linhas 5-12) e `db` de `@bloomy/db` (linha 1) — nada a adicionar.

- [ ] **Step 3: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 4: Rodar a suíte inteira do web**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun run test`
Expected: PASS, sem regressão. **Não commitar.**

---

### Task 3: Hook `reorderLocal` + `persistOrder` no `useSessao`

**Files:**
- Modify: `apps/web/src/app/(app)/treino/hooks/useSessao.ts`

**Interfaces:**
- Consumes: `PATCH /api/sessions/{id}/exercises` da Task 2; `api.patch` (`lib/api.ts:39`); `toastError` (`lib/toast.ts`); `setData`/`reload` do `useResource`
- Produces: duas funções no objeto de retorno do `useSessao`, consumidas pela Task 4:
  - `reorderLocal(ids: string[]): void` — reordena `detail.exercises` no estado local, sem rede
  - `persistOrder(): Promise<void>` — envia a ordem atual de `detail.exercises` no PATCH

Duas funções, não uma: `onReorder` do `motion` dispara a cada troca de posição durante o arraste, então juntar estado e rede geraria vários PATCHes por drag.

- [ ] **Step 1: Adicionar `reorderLocal`**

Em `apps/web/src/app/(app)/treino/hooks/useSessao.ts`, adicionar depois do `patchLocal` (que termina na linha 70):

```ts
  // Só estado: chamado a cada troca de posição durante o arraste.
  const reorderLocal = useCallback(
    (ids: string[]) => {
      if (!detail) return;
      const byId = new Map(detail.exercises.map((e) => [e.id, e]));
      const next = ids.flatMap((id) => {
        const ex = byId.get(id);
        return ex ? [ex] : [];
      });
      // Guarda contra ordem divergente do estado: melhor ignorar que perder exercício.
      if (next.length !== detail.exercises.length) return;
      setData({ session: { ...detail, exercises: next } });
    },
    [detail, setData],
  );
```

- [ ] **Step 2: Adicionar `persistOrder`**

No mesmo arquivo, imediatamente depois de `reorderLocal`:

```ts
  // Uma vez por drag, no drop. Lê a ordem do `detail` já reordenado pelos reorderLocal.
  const persistOrder = useCallback(async () => {
    if (!detail) return;
    try {
      const { session } = await api.patch<{ session: SessionDetail }>(
        `/api/sessions/${detail.session.id}/exercises`,
        { ids: detail.exercises.map((e) => e.id) },
      );
      setData({ session });
    } catch (e) {
      // Mesmo motivo de persistSet/markDone: recarrega o canônico em vez de restaurar
      // snapshot local, que sobrescreveria escritas concorrentes já persistidas.
      reload();
      toastError(e, "Não foi possível salvar a nova ordem");
    }
  }, [detail, setData, reload]);
```

- [ ] **Step 3: Exportar as duas no return**

No objeto retornado pelo `useSessao` (que começa na linha 275), adicionar as duas chaves depois de `markDone`:

```ts
    markDone,
    reorderLocal,
    persistOrder,
```

- [ ] **Step 4: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros. `api`, `SessionDetail`, `toastError` e `useCallback` já estão importados no arquivo (linhas 3-14). **Não commitar.**

---

### Task 4: `ExercicioRow` + `Reorder.Group` no `ExercicioList`

**Files:**
- Create: `apps/web/src/app/(app)/treino/components/ExercicioRow.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/ExercicioList.tsx`
- Modify: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx` (passar as duas props novas)

**Interfaces:**
- Consumes: `reorderLocal` / `persistOrder` da Task 3; `SwipeableRow` (`@/components/swipeable-row`); `GifThumb`, `IconChip`; `doneCount`/`isExerciseDone` de `../hooks/session`
- Produces: `ExercicioRow` — componente de linha; `ExercicioList` ganha as props `onReorder: (ids: string[]) => void` e `onDropOrder: () => void`

`useDragControls` é hook por item, por isso a linha tem que ser componente próprio.

- [ ] **Step 1: Criar `ExercicioRow.tsx`**

Conteúdo completo do arquivo `apps/web/src/app/(app)/treino/components/ExercicioRow.tsx`:

```tsx
"use client";

import {
  ArrowsClockwiseIcon,
  BarbellIcon,
  CaretRightIcon,
  CheckCircleIcon,
  DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import { Reorder, useDragControls } from "motion/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { SessionExercise } from "@/lib/api-types";

import { doneCount, isExerciseDone } from "../hooks/session";
import { GifThumb } from "./GifThumb";

export function ExercicioRow({
  ex,
  index,
  completing,
  draggable,
  onOpen,
  onSwap,
  onRemove,
  onDropOrder,
}: {
  ex: SessionExercise;
  index: number;
  completing: boolean;
  /** false quando a lista tem 1 exercício: não há o que reordenar. */
  draggable: boolean;
  onOpen: (i: number) => void;
  onSwap: (ex: SessionExercise) => void;
  onRemove: (ex: SessionExercise) => void;
  onDropOrder: () => void;
}) {
  const controls = useDragControls();
  const done = isExerciseDone(ex);

  return (
    <Reorder.Item
      as="li"
      value={ex.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDropOrder}
    >
      <SwipeableRow
        onEdit={completing ? undefined : () => onSwap(ex)}
        editIcon={<ArrowsClockwiseIcon size={22} weight="bold" />}
        editLabel="Trocar exercício"
        onDelete={completing ? undefined : () => onRemove(ex)}
      >
        <div className="flex w-full items-center gap-1 rounded-card bg-white p-3 shadow-card-sm">
          {draggable ? (
            <button
              type="button"
              disabled={completing}
              aria-label={`Mover ${ex.name}`}
              // stopPropagation p/ o SwipeableRow não registrar o gesto: hoje ele só
              // reage a |dx| >= 6px, mas o reorder não deve depender desse limiar.
              onPointerDown={(e) => {
                if (completing) return;
                e.stopPropagation();
                controls.start(e);
              }}
              // touch-none: sem isso o navegador trata o arraste vertical como scroll
              // da página e o drag nunca começa.
              className="grid size-8 shrink-0 touch-none place-items-center text-ink-faint disabled:opacity-40"
            >
              <DotsSixVerticalIcon size={18} weight="bold" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpen(index)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            {ex.catalogId ? (
              <GifThumb id={ex.catalogId} alt="" className="size-10.5 rounded-[14px]" />
            ) : (
              <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
            )}
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-ink">{ex.name}</span>
              <span className="text-xs font-semibold text-ink-read">
                {doneCount(ex)}/{ex.targetSets} séries
                {ex.lastPerformance?.load != null ? ` · ${ex.lastPerformance.load} kg` : ""}
              </span>
            </div>
            {done ? (
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            ) : (
              <CaretRightIcon size={20} className="text-ink-faint" />
            )}
          </button>
        </div>
      </SwipeableRow>
    </Reorder.Item>
  );
}
```

Note que `rounded-card bg-white p-3 shadow-card-sm` saiu do `<button>` e foi pro `<div>` wrapper: botão dentro de botão é HTML inválido, e o handle precisa ser irmão do botão de tap.

- [ ] **Step 2: Trocar o bloco da lista em `ExercicioList.tsx`**

Substituir o `<div className="flex flex-col gap-2">` com o `map` de exercícios (linhas 78-117 do arquivo atual, do `<div className="flex flex-col gap-2">` até o `</div>` que fecha depois do `))}`) por:

```tsx
      <Reorder.Group
        as="ul"
        axis="y"
        values={exercises.map((ex) => ex.id)}
        onReorder={onReorder}
        className="flex flex-col gap-2"
      >
        {exercises.map((ex, i) => (
          <ExercicioRow
            key={ex.id}
            ex={ex}
            index={i}
            completing={completing}
            draggable={exercises.length > 1}
            onOpen={onOpenExercise}
            onSwap={onSwapExercise}
            onRemove={onRemoveExercise}
            onDropOrder={onDropOrder}
          />
        ))}
      </Reorder.Group>
```

`Reorder.Group` fica montado mesmo com um exercício só — só o handle desaparece. Se o grupo saísse, adicionar o segundo exercício remontaria a lista e mataria as animações.

- [ ] **Step 3: Ajustar props e imports de `ExercicioList.tsx`**

Adicionar ao objeto de props desestruturado (depois de `onAddExercise`) e à sua tipagem:

```tsx
  onReorder,
  onDropOrder,
```

```tsx
  onReorder: (ids: string[]) => void;
  onDropOrder: () => void;
```

Nos imports, **adicionar**:

```tsx
import { Reorder } from "motion/react";
import { ExercicioRow } from "./ExercicioRow";
```

**Remover** (migraram pro `ExercicioRow`): `SwipeableRow`, `IconChip`, `GifThumb`, `doneCount`, e os ícones `ArrowsClockwiseIcon`, `BarbellIcon`, `CaretRightIcon`, `CheckCircleIcon`.

**Manter** — continuam em uso no `ExercicioList`:

| Símbolo | Onde é usado |
| --- | --- |
| `isExerciseDone` | linha 58, `exercises.filter(isExerciseDone).length` |
| `mmss` | linha 71, no chip do cronômetro |
| `TimerIcon` | linha 70, chip do cronômetro |
| `PlusIcon` | linha 125, "Adicionar exercício" |
| `ToggleSwitch` | linha 130, descanso automático |
| `CircleNotchIcon`, `FlagCheckeredIcon` | linhas 145 e 150, botão "Concluir treino" |
| `useEffect`, `useState` | linhas 49-56, cronômetro |
| `SessionExercise` (type) | tipagem das props |

O `bun check-types` do Step 5 pega qualquer import esquecido, nos dois sentidos.

- [ ] **Step 4: Passar as props novas em `SessaoAtiva.tsx`**

No `<ExercicioList ... />` do fim do arquivo (linhas 171-185), adicionar depois de `onAddExercise={sessao.openAdd}`:

```tsx
      onReorder={sessao.reorderLocal}
      onDropOrder={sessao.persistOrder}
```

- [ ] **Step 5: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros. Se aparecer erro de import não usado em `ExercicioList.tsx`, é o Step 3 incompleto.

- [ ] **Step 6: Rodar a suíte do web**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun run test`
Expected: PASS, sem regressão. **Não commitar.**

---

### Task 5: Verificação visual na rota real

`bun check-types` passando não prova que a UI funciona — não pega hook client em Server Component nem gesto que não dispara. Esta task só termina com o reorder visto funcionando.

**Files:** nenhum (verificação)

- [ ] **Step 1: Subir o dev server**

Usar o skill `/dev-up 3001`. Não subir servidor ad-hoc, não fazer loop de `pkill && sleep && restart`.

- [ ] **Step 2: Chegar num treino com 3+ exercícios em sessão ativa**

Navegar até `/treino`. Se não houver sessão ativa, iniciar um treino que tenha pelo menos 3 exercícios (criar pelo "Novo treino" se necessário).

- [ ] **Step 3: Conferir os seis comportamentos**

1. Handle `⠿` aparece à esquerda de cada linha
2. Arrastar o handle verticalmente move a linha e as outras abrem espaço com animação
3. Soltar mantém a nova ordem (não volta pro lugar antigo)
4. Recarregar a página mantém a ordem nova — é a prova de que o PATCH persistiu
5. Tap no corpo da linha ainda abre a lista de séries
6. Swipe horizontal na linha ainda revela "trocar" e "excluir"

- [ ] **Step 4: Conferir o console e a rede**

Console sem erro. Na aba de rede, **um** `PATCH /api/sessions/{id}/exercises` por arraste — não um por troca de posição. Vários PATCHes num único drag significa que o `onDropOrder` foi ligado no lugar do `onReorder`.

- [ ] **Step 5: Conferir a propagação pro template**

Concluir o treino e tocar em "Salvar no treino" na tela de fim. Reabrir o treino em "Editar treino": os exercícios têm que aparecer na ordem nova. Isso exercita o `applySessionToWorkout`, que já renumerava `position` — nenhuma linha de código nova envolvida.

- [ ] **Step 6: Relatar**

Reportar o que foi verificado com evidência (o que apareceu na tela, o que apareceu na rede). Deixar tudo **não-commitado** para revisão.

---

## Ordem de execução

Task 1 → 2 → 3 → 4 → 5, em série. Task 2 depende do serviço da Task 1; Task 3 depende da rota da Task 2; Task 4 depende das funções da Task 3. Nada aqui paraleliza de forma útil.
