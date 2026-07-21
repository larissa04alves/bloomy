# Acesso ao anexo no histórico (#14) — Plano 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No histórico de exames, um exame concluído com anexo mostra um botão de baixar o resultado (proxy autenticado do #13); sem anexo, não mostra nada.

**Architecture:** Estender o `HistoryItem` (tipo do `HistorySheet` compartilhado) com um campo opcional de anexo; o `HistorySheet` renderiza um botão de download quando presente; a `page.tsx` monta os itens do histórico de exames incluindo o anexo. Sem back novo — reusa o `GET /api/exams/[id]/attachment` do #13.

**Tech Stack:** Next.js 16 (App Router), `@phosphor-icons/react`.

## Global Constraints

- Depende do Plano 1 (ciclo de vida) apenas por consistência de status; o endpoint de download já existe (#13).
- Acesso ao arquivo = **proxy autenticado** `GET /api/exams/[id]/attachment` (já baixa com `Content-Disposition: attachment`). Nada de URL pública/assinada.
- Visualização = **download simples** (abre no app do celular), não viewer inline.
- `HistorySheet` é **compartilhado** por consultas e exames — a extensão do anexo tem que ser **opcional** (consultas passam sem).
- `check-types`: `npx turbo run check-types --filter=web --force`. Falso-positivo `71007` conta como PASS.
- Tamanho de fonte no JSX: só escala nomeada do Tailwind.
- **Verificação visual: SEMPRE via `/dev-up 3001`** (controller/humano; subagent não dirige o navegador).
- **NÃO commitar sem ordem explícita.** Commits "só se autorizado".

---

### Task 1: `HistoryItem` com anexo opcional + botão de download no `HistorySheet`

**Files:**
- Modify: `apps/web/src/app/(app)/saude/components/HistorySheet.tsx`

**Interfaces:**
- Produces: `HistoryItem = { id: string; title: string; completedAt: string | null; attachment?: { href: string; name: string } }`.

- [ ] **Step 1: Estender o tipo e renderizar o download**

Em `HistorySheet.tsx`:
- Importar o ícone (junto do import existente de `@phosphor-icons/react`):
```ts
import { ClockCounterClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
```
- Estender o tipo:
```ts
export type HistoryItem = {
  id: string;
  title: string;
  completedAt: string | null;
  attachment?: { href: string; name: string };
};
```
- Trocar o lado direito de cada linha (o `<span>` de "concluído em …") por um agrupamento com o texto + o botão de baixar quando houver anexo:
```tsx
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-read">
                  {it.completedAt ? `concluído em ${dayMonth(it.completedAt)}` : "concluído"}
                </span>
                {it.attachment ? (
                  <a
                    href={it.attachment.href}
                    aria-label={`Baixar resultado de ${it.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-control bg-lilac-tint text-lilac-deep"
                  >
                    <DownloadSimpleIcon size={18} weight="bold" />
                  </a>
                ) : null}
              </div>
```
(O `<a>` mesmo-origem carrega o cookie da sessão; o endpoint devolve `Content-Disposition: attachment`, então baixa direto.)

- [ ] **Step 2: Type-check**

Run (da raiz): `npx turbo run check-types --filter=web --force`
Expected: PASS. (Consultas continuam passando itens sem `attachment` — o campo é opcional, então `page.tsx` não quebra.)

- [ ] **Step 3: Commit** (só se autorizado)

```bash
git add apps/web/src/app/\(app\)/saude/components/HistorySheet.tsx
git commit -m "feat(historico): suporte a download de anexo no HistorySheet"
```

---

### Task 2: Montar o anexo nos itens do histórico de exames (`page.tsx`) + verificar

**Files:**
- Modify: `apps/web/src/app/(app)/saude/page.tsx` (o `onHistory` dos exames)

**Interfaces:**
- Consumes: `HistoryItem.attachment` (Task 1); `Exam.attachmentName`/`id` (do #13); `GET /api/exams/[id]/attachment`.

- [ ] **Step 1: Incluir `attachment` ao montar o histórico de exames**

Em `page.tsx`, no `<ExamesSection ... onHistory={...}>`, no `.map` que monta os itens, adicionar o campo `attachment` só quando o exame tiver `attachmentName`:

```tsx
            items: exames.historico.map((e) => ({
              id: e.id,
              title: e.name,
              completedAt: e.completedAt,
              attachment: e.attachmentName
                ? { href: `/api/exams/${e.id}/attachment`, name: e.attachmentName }
                : undefined,
            })),
```
(O histórico de **consultas** NÃO muda — continua sem `attachment`.)

- [ ] **Step 2: Type-check**

Run (da raiz): `npx turbo run check-types --filter=web --force`
Expected: PASS.

- [ ] **Step 3: Verificação visual (controller/humano, via `/dev-up`)**

Invocar `/dev-up 3001`, abrir `/saude`:
1. Garantir um exame concluído **com** anexo (o fluxo do Plano 1 gera um) e um **sem** anexo.
2. Clicar em **"Ver histórico"** dos exames.
3. Confirmar: o exame **com** anexo mostra o botão de **baixar**; clicar baixa o PDF (mesmo comportamento verificado no #13, `GET …/attachment` 200). O exame **sem** anexo **não** mostra o botão.
4. Abrir **"Ver histórico"** das **consultas** e confirmar que nenhuma linha mostra botão de download (o campo é opcional e não é preenchido lá).

- [ ] **Step 4: Commit** (só se autorizado)

```bash
git add apps/web/src/app/\(app\)/saude/page.tsx
git commit -m "feat(historico): baixar resultado de exame concluído no histórico (#14)"
```

---

## Self-Review (feito na escrita)

- **Cobertura do spec/#14:** indicador+ação de baixar só em concluído com anexo (T1+T2); sem anexo não mostra (T2, `attachment: undefined`); acesso autenticado via GET do #13 (T1 `<a href>`); download simples (comportamento do endpoint); consultas intactas (campo opcional). ✔
- **Placeholders:** nenhum; código completo. ✔
- **Consistência de tipos:** `HistoryItem.attachment` definido na T1 e consumido na T2 com a mesma forma `{ href, name }`. ✔
```
