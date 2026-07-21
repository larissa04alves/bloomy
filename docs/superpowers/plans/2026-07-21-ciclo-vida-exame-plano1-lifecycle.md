# Refino do ciclo de vida do exame — Plano 1 (lifecycle) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o fluxo de exame para `a agendar → agendada → aguardando resultado → concluído`, renomeando `result_available` para `awaiting_result` e adicionando a transição "marcar como feito".

**Architecture:** Rename atômico do valor do enum (schema + migration de dados + todas as refs) numa task; depois a mudança das ações do card (nova ação `markDone` e ramificação por status em `ExamesSection`). O anexo do #13 é reaproveitado — só passa a aparecer no status renomeado.

**Tech Stack:** Next.js 16 (App Router), Drizzle + libsql/Turso, drizzle-kit, `@tanstack/react-form`, `@phosphor-icons/react`, bun test.

## Global Constraints

- Valor de status renomeado: **`awaiting_result`** (era `result_available`). Label PT: **"aguardando resultado"**.
- Estados válidos do exame: `to_schedule`, `scheduled`, `awaiting_result`, `completed`.
- Um caminho só: `scheduled` nunca vai direto pra `completed` — passa por `awaiting_result`.
- Migrations sempre via drizzle-kit; NUNCA `drizzle-kit push`. Mudança de `$type` (TS) NÃO gera SQL sozinha → migration de dados é **custom**.
- Testes: `bun test --conditions react-server src` rodado **de `apps/web`** (o `bun test` puro FALHA por `server-only`).
- `check-types` (da raiz): confirmar com `npx turbo run check-types --filter=web --force` (evita cache). Falso-positivo conhecido `71007` (plugin client→client) conta como PASS.
- Tamanho de fonte no JSX: só escala nomeada do Tailwind (nunca `text-[13px]`).
- **Verificação visual: SEMPRE via `/dev-up 3001`** (não subir server ad-hoc). Feita no nível do controller/humano (subagent não dirige o navegador).
- **NÃO commitar sem ordem explícita da Larissa.** Passos de commit são "só se autorizado"; caso contrário, entregar como working tree.

---

### Task 1: Rename `result_available` → `awaiting_result` (código + migration de dados)

**Files:**
- Modify: `packages/db/src/schema/health.ts:56-58` (`exam.status` `$type`)
- Create: `packages/db/src/migrations/00XX_*.sql` (custom, via drizzle-kit)
- Modify: `apps/web/src/lib/api-types.ts:211-219` (`ExamStatus` + `EXAM_STATUS_LABELS`)
- Modify: `apps/web/src/app/api/exams/route.ts:8` (enum do zod, POST)
- Modify: `apps/web/src/app/api/exams/[id]/route.ts:16` (enum do zod, PUT)
- Modify: `apps/web/src/app/(app)/saude/components/ExamModal.tsx:24` (`STATUS_OPTIONS`) e `:129` (condição do bloco de anexo)
- Modify: `apps/web/src/app/(app)/saude/hooks/format.ts:59` (`examStatusTone`)
- Modify: `apps/web/src/server/health/service.ts` (guarda do `attachExam`)
- Modify: `apps/web/src/server/health/service.test.ts` (testes que usam `result_available`)

**Interfaces:**
- Produces: `ExamStatus = "to_schedule" | "scheduled" | "awaiting_result" | "completed"`; label `EXAM_STATUS_LABELS.awaiting_result === "aguardando resultado"`; `attachExam` retorna `"wrong_status"` quando `status !== "awaiting_result"`.

- [ ] **Step 1: Atualizar o teste do serviço para o novo valor (red)**

Em `apps/web/src/server/health/service.test.ts`, trocar todas as ocorrências de `"result_available"` por `"awaiting_result"` (nos `createExam(..., { status: "result_available" })` dos testes de `attachExam`/`removeExamAttachment`/`getExamAttachmentMeta`) e ajustar o teste de status errado para usar um status que NÃO seja awaiting_result (ex.: `"scheduled"`, que já é o caso). Ex. do bloco de attach:

```ts
    const exam = await createExam(db, userId, { name: "Hemograma", status: "awaiting_result" });
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test --conditions react-server src/server/health/service.test.ts`
Expected: FAIL — `createExam`/typings ainda só aceitam `result_available` (erro de tipo ou de guarda), OU o guard de `attachExam` rejeita `awaiting_result`.

- [ ] **Step 3: Renomear no schema do banco**

Em `packages/db/src/schema/health.ts`, no `exam.status`:

```ts
    status: text("status")
      .$type<"to_schedule" | "scheduled" | "awaiting_result" | "completed">()
      .default("to_schedule")
      .notNull(),
```

- [ ] **Step 4: Renomear nas refs do app**

`apps/web/src/lib/api-types.ts`:

```ts
export type ExamStatus = "to_schedule" | "scheduled" | "awaiting_result" | "completed";

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  to_schedule: "a agendar",
  scheduled: "agendada",
  awaiting_result: "aguardando resultado",
  completed: "concluído",
};
```

`apps/web/src/app/api/exams/route.ts` (POST) e `apps/web/src/app/api/exams/[id]/route.ts` (PUT) — nos dois, trocar o enum:

```ts
  status: z.enum(["to_schedule", "scheduled", "awaiting_result", "completed"]).optional(),
```
(No POST o `.optional()` já existe; manter.)

`apps/web/src/app/(app)/saude/hooks/format.ts` no `examStatusTone`:

```ts
    case "awaiting_result":
      return "text-green-deep";
```
(trocar o `case "result_available"`; mantém o mesmo tom.)

`apps/web/src/server/health/service.ts` — na guarda do `attachExam`:

```ts
  if (current.status !== "awaiting_result") return "wrong_status";
```

`apps/web/src/app/(app)/saude/components/ExamModal.tsx`:
- `STATUS_OPTIONS` passa a **não** incluir o status renomeado (será alcançado por ação de card):
```ts
const STATUS_OPTIONS: ExamStatus[] = ["to_schedule", "scheduled"];
```
- A condição do bloco de anexo troca de `status === "result_available"` para:
```ts
      {status === "awaiting_result" ? (
```
- No `useEffect` de reset e na limpeza por mudança de status (fix do review), trocar as duas referências `"result_available"` por `"awaiting_result"` (a condição `if (status !== "awaiting_result")` que limpa o pending).
- No `useEffect` que deriva o status inicial, manter o mapeamento atual, mas garantir que um exame `awaiting_result` reabra com `status="awaiting_result"` (o bloco de anexo aparece). Como `STATUS_OPTIONS` não inclui `awaiting_result`, nenhum chip fica aceso — aceitável; a intenção do modal aqui é anexar.

- [ ] **Step 5: Gerar a migration custom de dados**

Run (de `packages/db`): `bunx drizzle-kit generate --custom --name rename_status_awaiting_result`
Isso cria um `.sql` vazio em `src/migrations/`. Preencher com:

```sql
UPDATE `exam` SET `status` = 'awaiting_result' WHERE `status` = 'result_available';
```

(Se o `--custom` não for suportado nessa versão, criar o próximo `.sql` numerado manualmente com o UPDATE e adicionar a entrada correspondente em `src/migrations/meta/_journal.json`.)

- [ ] **Step 6: Aplicar a migration**

Run (da raiz): `bun db:migrate`
Expected: "migrations applied successfully!".

- [ ] **Step 7: Rodar testes + type-check**

Run (de `apps/web`): `bun test --conditions react-server src/server/health/service.test.ts` → PASS.
Run (da raiz): `npx turbo run check-types --filter=web --force` → PASS (sem refs a `result_available`).

- [ ] **Step 8: Commit** (só se autorizado)

```bash
git add packages/db apps/web/src/lib/api-types.ts apps/web/src/app/api/exams apps/web/src/app/\(app\)/saude apps/web/src/server/health/service.ts apps/web/src/server/health/service.test.ts
git commit -m "refactor(exame): renomear result_available para awaiting_result"
```

---

### Task 2: Ações do card — "Marcar como feito" e "Finalizar"

**Files:**
- Modify: `apps/web/src/app/(app)/saude/hooks/useExames.ts` (novo `markDone`)
- Modify: `apps/web/src/app/(app)/saude/components/ExamesSection.tsx` (ramificar ação por status)
- Modify: `apps/web/src/app/(app)/saude/page.tsx` (passar `onMarkDone`)

**Interfaces:**
- Consumes: `awaiting_result` (Task 1), `api.put`, `EXAM_STATUS_LABELS`.
- Produces: `useExames().markDone(id: string): Promise<void>`; `ExamesSection` prop `onMarkDone: (e: Exam) => void`.

- [ ] **Step 1: Adicionar `markDone` no hook**

Em `useExames.ts`, adicionar (seguindo o padrão otimista de `update`):

```ts
  const markDone = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({
        exams: all.map((e) =>
          e.id === id ? { ...e, status: "awaiting_result" as const } : e,
        ),
      });
      try {
        await api.put(`/api/exams/${id}`, { status: "awaiting_result" });
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível atualizar o exame");
      }
    },
    [list, all],
  );
```
E incluir `markDone` no objeto retornado pelo hook.

- [ ] **Step 2: Ramificar a ação no `ExamesSection`**

Em `ExamesSection.tsx`, adicionar a prop `onMarkDone: (e: Exam) => void` na assinatura, e trocar o bloco de ação (hoje: `to_schedule` → "Agendar"; senão → bolinha "Concluir") por três ramos:

```tsx
              {e.status === "to_schedule" ? (
                <button
                  type="button"
                  aria-label={`Agendar exame ${e.name}`}
                  onClick={() => onEdit(e)}
                  className="rounded-full bg-lilac-tint px-3 py-1.5 text-xs font-bold text-lilac-deep"
                >
                  Agendar
                </button>
              ) : e.status === "scheduled" ? (
                <button
                  type="button"
                  aria-label={`Marcar exame ${e.name} como feito`}
                  onClick={() => onMarkDone(e)}
                  className="rounded-full bg-lilac-tint px-3 py-1.5 text-xs font-bold text-lilac-deep"
                >
                  Marcar como feito
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Finalizar exame ${e.name}`}
                  onClick={() => onComplete(e)}
                >
                  <CircleIcon size={24} className="text-control-off" />
                </button>
              )}
```
(O último ramo — bolinha "Finalizar" — só é alcançado por `awaiting_result`, já que `completed` sai da lista de ativos.)

- [ ] **Step 3: Ligar `onMarkDone` na `page.tsx`**

No `<ExamesSection ... />` em `page.tsx`, adicionar:

```tsx
        onMarkDone={(e) => exames.markDone(e.id)}
```

- [ ] **Step 4: Type-check**

Run (da raiz): `npx turbo run check-types --filter=web --force`
Expected: PASS.

- [ ] **Step 5: Verificação visual (controller/humano, via `/dev-up`)**

Invocar `/dev-up 3001`, abrir `/saude`. Fluxo completo:
1. Criar exame → "a agendar" → **Agendar** (define data) → vira **agendada**.
2. Card da agendada mostra **"Marcar como feito"** → clicar → status vira **"aguardando resultado"**.
3. Abrir o exame (swipe → editar) → bloco **"Anexo do resultado"** aparece → anexar um PDF → Salvar (fica em aguardando, com anexo).
4. Card de aguardando mostra a bolinha **Finalizar** → clicar → "Agendar retorno?" → concluir.
5. Confirmar que o exame saiu dos ativos e o anexo persistiu (checável no #14 / Plano 2).
Confirmar que **não há** botão que leve agendada → concluído direto.

- [ ] **Step 6: Commit** (só se autorizado)

```bash
git add apps/web/src/app/\(app\)/saude/hooks/useExames.ts apps/web/src/app/\(app\)/saude/components/ExamesSection.tsx apps/web/src/app/\(app\)/saude/page.tsx
git commit -m "feat(exame): marcar como feito (agendada→aguardando) e finalizar (aguardando→concluído)"
```

---

## Self-Review (feito na escrita)

- **Cobertura do spec:** rename em todos os touchpoints (T1) + migration de dados (T1) + ações de card marcar-feito/finalizar (T2) + um-caminho-só (T2, sem ramo scheduled→completed) + anexo no status renomeado (T1). ✔
- **Placeholders:** nenhum; código completo em cada passo (o `00XX` da migration é nome gerado pelo drizzle, não placeholder). ✔
- **Consistência de tipos:** `awaiting_result` usado igual em schema/api-types/rotas/modal/service/format; `markDone`/`onMarkDone` casam entre hook, section e page. ✔
- **Fora deste plano:** baixar anexo no histórico = Plano 2.
```
