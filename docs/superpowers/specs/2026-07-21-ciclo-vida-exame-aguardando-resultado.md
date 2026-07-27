# Refino do ciclo de vida do exame (aguardando resultado) + acesso ao anexo no histórico

- **Issue relacionada:** #14 (acesso ao anexo no histórico) — embutido aqui no estado *concluído*
- **Data:** 2026-07-21
- **Depende de:** #13 (anexo no R2) — já entregue/fechado
- **Origem:** redesenho do fluxo pedido pela usuária (o "Concluir" atual pula o momento "fiz o exame mas o resultado não saiu")

## Problema

Hoje o card da *agendada* tem "Concluir", que leva **direto** a `completed` (com "Agendar retorno?"), sem passo de resultado. Consequências:

- Não existe o estado real "fiz o exame, aguardando o resultado".
- Um exame concluído **sem** anexo não tem como receber o anexo depois (o `ExamModal` reseta `completed`→`to_schedule` e esconde o bloco de anexo). Buraco: quem conclui antes de ter o resultado fica sem caminho.

## Decisão (ciclo de vida novo)

Estados: `to_schedule` → `scheduled` → **`awaiting_result`** → `completed`.

`awaiting_result` **substitui** o atual `result_available` (mesmo lugar na máquina, semântica corrigida: "aguardando resultado", não "resultado disponível"). Label PT: **"aguardando resultado"**.

### Máquina de estados / ações do card

| Estado | Ação visível no card | Transição |
|---|---|---|
| `to_schedule` (a agendar) | **Agendar** (abre `ExamModal`) | define data → `scheduled` |
| `scheduled` (agendada) | **Marcar como feito** (bolinha) | `PUT {status: awaiting_result}` → `awaiting_result` (sem perguntar retorno) |
| `awaiting_result` (aguardando resultado) | **Finalizar** (bolinha) | abre folha "Agendar retorno?" → `completed` |
| `completed` (concluído) | — (sai da lista ativa) | aparece no histórico; baixa o anexo se houver (#14) |

**Um caminho só:** da *agendada* sempre passa por *aguardando resultado* (não há pulo direto pra *concluído*). Finalizar é 1 toque a partir de *aguardando*.

### Anexo (reuso total do #13)

O anexo continua no **`ExamModal`**, agora aparecendo quando `status === "awaiting_result"` (era `result_available`). Em *aguardando resultado*: abre o exame (swipe → editar) e anexa / troca / remove o resultado. **Opcional.**

`Finalizar` (retorno → `completed`) mantém o anexo (persiste na conclusão, como já verificado no #13). Anexar **não** finaliza sozinho — são dois passos (anexar no modal; finalizar no card).

### Retorno

O "Agendar retorno?" (RetornoSheet + `completeExam`) passa a ser acionado no **Finalizar** (a partir de `awaiting_result`), não mais da *agendada*. A lógica de `completeExam` (cria follow-up `to_schedule` com `parentId`) é reaproveitada como está.

## Rename `result_available` → `awaiting_result`

Mudança de valor do enum (não só label), pra o código não mentir. **Touchpoints:**

- `packages/db/src/schema/health.ts` — `exam.status` `$type` union.
- **Migration** (`packages/db`): `UPDATE exam SET status='awaiting_result' WHERE status='result_available'` (baixo volume; SQLite não tem enum nativo, o valor é `text`).
- `apps/web/src/lib/api-types.ts` — `ExamStatus` + `EXAM_STATUS_LABELS` (label "aguardando resultado").
- `apps/web/src/app/api/exams/route.ts` — enum do `BODY_SCHEMA` (POST).
- `apps/web/src/app/api/exams/[id]/route.ts` — enum do `BODY_SCHEMA` (PUT).
- `apps/web/src/app/(app)/saude/components/ExamModal.tsx` — `STATUS_OPTIONS` e a condição do bloco de anexo (`=== "awaiting_result"`).
- `apps/web/src/server/health/service.ts` — guarda do `attachExam` (`status !== "awaiting_result"` → 409) e qualquer referência em `completeExam`.
- `apps/web/src/app/(app)/saude/hooks/format.ts` — `examStatusTone`.

`STATUS_OPTIONS` do modal passa a ser `["to_schedule", "scheduled"]` — `awaiting_result` e `completed` são alcançados por ações do card (marcar feito / finalizar), não escolhidos à mão. O modal, ao editar um exame que **já está** em `awaiting_result`, mostra o status atual + o bloco de anexo (sem oferecer o chip pra escolher).

## Ações do card (`ExamesSection.tsx`)

Ramificar por status (hoje é só `to_schedule` vs. resto):

- `to_schedule` → botão "Agendar" (`onEdit`).
- `scheduled` → botão **"Marcar como feito"** (novo; chama `markDone(id)`).
- `awaiting_result` → bolinha **"Finalizar"** (`onComplete` → RetornoSheet, fluxo atual).

`useExames` ganha `markDone(id)`: `PUT /api/exams/[id]` com `{ status: "awaiting_result" }` (update otimista + reload), seguindo o padrão dos outros mutators.

## #14 embutido — acesso ao anexo no histórico

No estado `completed`, o `HistorySheet` (compartilhado consultas/exames) passa a mostrar, **só para itens com anexo**, um indicador + ação de **baixar**.

- Estender `HistoryItem` (`{ id, title, completedAt }`) com um campo **opcional** de anexo, ex.: `attachment?: { href: string; name: string }`. Consultas passam sem; exames com anexo passam com `href = /api/exams/{id}/attachment`.
- `HistorySheet` renderiza um ícone/botão de download (📎 / seta) na linha quando `attachment` existe; clique aponta pro `GET …/attachment` (que já baixa — proxy autenticado do #13).
- `page.tsx`: ao montar `exames.historico` como `HistoryItem[]`, incluir `attachment` quando o exame tiver `attachmentName`/`attachmentKey`.
- **AC ajustado do #14:** visualização = **download simples** (`Content-Disposition: attachment`), não viewer inline — já é o comportamento do endpoint.

Item sem anexo não mostra a ação. Acesso autenticado (reusa o proxy do #13).

## Fora de escopo

- Anexar num exame **já `completed`** (o buraco original) — resolvido *indiretamente*: o novo fluxo evita concluir sem passar por *aguardando resultado*, onde se anexa. Exames concluídos legados sem anexo continuam sem caminho de anexo (aceitável; raro e é dado antigo).
- Preview/viewer inline de PDF/imagem (decidido: download simples).

## Critérios de aceite

- [ ] Status `result_available` renomeado para `awaiting_result` em todo o código + migration dos dados existentes; label "aguardando resultado".
- [ ] Card da *agendada* mostra **"Marcar como feito"** → move para *aguardando resultado* (sem retorno).
- [ ] Card de *aguardando resultado* mostra **"Finalizar"** → RetornoSheet → *concluído*, mantendo o anexo.
- [ ] Não há caminho de *agendada* direto pra *concluído* (um caminho só).
- [ ] Em *aguardando resultado*, anexar/trocar/remover pelo `ExamModal` funciona (reuso #13); anexo é opcional.
- [ ] No histórico, exame *concluído* **com anexo** mostra indicador + baixar (aponta pro `GET …/attachment`); **sem anexo** não mostra ação.
- [ ] `check-types` verde + testes de serviço cobrindo a guarda do `attachExam` no novo status.
```
