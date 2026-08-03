# Ajuste de exercícios na sessão ativa

Issue [#8](https://github.com/larissa04alves/bloomy/issues/8) · PR [#16](https://github.com/larissa04alves/bloomy/pull/16) · 2026-07-28

## Problema

A lista de exercícios de uma sessão vem do template do treino (tabela `exercise`) e não
pode ser ajustada no dia. Quem chega na academia e encontra o aparelho ocupado precisa
editar o treino inteiro — mudando também as próximas sessões — ou desistir da troca.

Falta um ajuste por sessão: trocar um exercício, adicionar um extra ou remover um da lista
do dia, mantendo o treino original intacto. Salvar no treino continua possível, mas como
decisão separada e explícita.

## Decisões de design

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Representação da lista | Snapshot por sessão (`session_exercise`) | Sem lógica de merge na leitura; trocar é um update. De quebra, congela o histórico das sessões concluídas. |
| Trocar com séries feitas | Troca limpa com confirmação | Lista mantém o tamanho; a perda é explícita na confirmação. |
| Escopo da mudança | Perguntar ao concluir | Zero atrito durante o treino; uma decisão só para todos os ajustes do dia. |
| Disparo na UI | Swipe por item + botão no fim | Segue o padrão de swipe já usado em Corpo/Saúde; nada de modo de edição. |

## Modelo de dados

### `session_exercise` (nova)

Em `packages/db/src/schema/workout.ts`. A lista de exercícios passa a pertencer à sessão;
o template vira semente.

| Coluna | Tipo | Nota |
| --- | --- | --- |
| `id` | `text` PK | `crypto.randomUUID()` |
| `session_id` | `text` → `workout_session.id` | `onDelete: cascade` |
| `user_id` | `text` → `user.id` | `onDelete: cascade` |
| `exercise_id` | `text` → `exercise.id`, nullable | origem no template; `onDelete: set null` |
| `name` | `text` notNull | |
| `target_sets` | `integer` notNull | |
| `target_reps` | `integer` notNull, default 12 | |
| `rest_seconds` | `integer` notNull, default 45 | |
| `position` | `integer` notNull | ordem na lista do dia |
| `catalog_id` | `text` → `exercise_catalog.id`, nullable | `onDelete: set null` |
| `muscle_group` | `text` (`Focus`), nullable | só quando não vem do catálogo |
| `origin` | `text` (`'template' \| 'added' \| 'replaced'`) notNull, default `'template'` | |
| `created_at` | `timestamp_ms` | |

Índice: `session_exercise_session_idx` em `(session_id)`.

`origin` serve à UI (badge "só hoje") e à contagem de ajustes na conclusão. Remoções não
têm marca — a linha deixa de existir e o diff contra o template as revela.

Como `exercise_id` e `origin` se combinam:

| Caso | `exercise_id` | `origin` |
| --- | --- | --- |
| Veio do template, intocado | id do `exercise` | `template` |
| Trocado por outro do catálogo | id do `exercise` substituído | `replaced` |
| Adicionado no dia | `null` | `added` |
| Adicionado no dia e depois trocado | `null` | `replaced` |

A troca preserva o `exercise_id` do exercício substituído — é isso que permite ao
`applySessionToWorkout` atualizar a linha certa do template em vez de inserir uma nova.

### `set_log`

Ganha `session_exercise_id` (`text` → `session_exercise.id`, nullable, `onDelete: cascade`).
A leitura casa as séries por essa coluna.

`exercise_id` e `exercise_name` permanecem: `lastPerformance` casa por nome e sobrevive a
qualquer edição de template.

Nullable porque `ALTER TABLE ADD COLUMN NOT NULL` no SQLite exigiria default constante. O
serviço sempre grava o valor.

### Migration

`bun db:generate` e, no arquivo SQL gerado, acrescentar o backfill:

1. Materializar `session_exercise` para toda `workout_session` existente, a partir dos
   `exercise` do seu `workout_id`, com `origin = 'template'`.
2. Ligar `set_log.session_exercise_id` pelo par `(session_id, exercise_id)`.

Sem esse passo, as sessões já gravadas passam a aparecer sem exercícios — a leitura não
consulta mais o template.

## Serviço

`server/workout/service.ts` tem 426 linhas e receberia cerca de 180. A lógica de sessão sai
para **`server/workout/session.ts`**; `service.ts` fica com template (`listWorkouts`,
`createWorkout`, `updateWorkout`, `deactivateWorkout`) e resumo (`summarizeWorkouts`,
`workoutSummary`). `lastPerformance` acompanha a sessão, com re-export em `service.ts` se
algum consumidor externo depender dele.

### Funções

- **`startSession`** — insere `session_exercise` (cópia do template) e `set_log` já
  apontando para ele, na mesma transação. O pré-cálculo de `lastPerformance` por nome
  continua como está.
- **`buildSessionDetail`** — lê `session_exercise` ordenado por `position`; casa séries por
  `session_exercise_id`. `SessionExercise` ganha `id` (o da linha de sessão) e `origin`;
  `exerciseId` continua exposto para rastreio do template.
- **`addSessionExercise(db, userId, sessionId, input)`** — `position = max + 1`,
  `origin = 'added'`, cria `target_sets` séries pré-preenchidas com `lastPerformance` do
  exercício escolhido. Defaults do catálogo: 3 séries, 12 reps, 45 s — os mesmos que o
  `TreinoModal` usa hoje.
- **`swapSessionExercise(db, userId, sessionId, sessionExerciseId, input)`** — mantém
  `position`, grava `origin = 'replaced'`, apaga as séries do antigo (inclusive as feitas) e
  recria para o novo. Retorna também quantas séries feitas foram descartadas.
- **`removeSessionExercise(db, userId, sessionId, sessionExerciseId)`** — deleta a linha; as
  séries vão em cascade.
- **`sessionAdjustments(db, sessionId)`** — `{ added, replaced, removed }`: `added` e
  `replaced` saem de `origin`; `removed` são os `exercise` do template cujo `id` não aparece
  em nenhum `session_exercise.exercise_id` da sessão.
- **`completeSession`** — `exerciseCount` passa a contar `session_exercise` da sessão (hoje
  conta o template, o que fica errado com qualquer ajuste) e o retorno inclui `adjustments`.
- **`applySessionToWorkout(db, userId, sessionId)`** — diff pontual, não replace-all, numa
  transação: linha com `exercise_id` null vira `insert` em `exercise`; com `exercise_id` e
  `origin = 'replaced'`, vira `update` daquela linha do template; os `exercise` ausentes da
  sessão são deletados; `position` é renumerada pela ordem da sessão. Replace-all zeraria
  `set_log.exercise_id` das sessões antigas (`onDelete: set null`).

### Rotas

Wrappers finos em `apps/web/src/app/api/`, no padrão zod → `requireUserId` → serviço:

| Método | Rota | Retorno |
| --- | --- | --- |
| `POST` | `/api/sessions/:id/exercises` | `{ session: SessionDetail }` |
| `PUT` | `/api/sessions/:id/exercises/:sessionExerciseId` | `{ session: SessionDetail }` |
| `DELETE` | `/api/sessions/:id/exercises/:sessionExerciseId` | `{ session: SessionDetail }` |
| `POST` | `/api/sessions/:id/apply-to-workout` | `{ workout: WorkoutWithExercises }` |

As três primeiras devolvem o `SessionDetail` completo: o client troca o estado inteiro em vez
de reconciliar listas. Body de add/swap: `catalogId` mais `name`, `targetSets`, `targetReps`,
`restSeconds`, `muscleGroup`. Erros seguem `{ error: string }` com 400/401/404.

## Front

- **`useSessao`** — ganha `addExercise`, `swapExercise`, `removeExercise`, `applyToWorkout` e
  o estado `adjust: { mode: "add" } | { mode: "swap"; id: string; doneSets: number } | null`.
  Cada mutação substitui `data.session` pela resposta da API.
- **`ExercicioList`** — cada item vira `SwipeableRow` (→ trocar, ← remover); botão tracejado
  "+ Adicionar exercício" no fim, no mesmo estilo do "Adicionar exercício personalizado" do
  `BuscaExercicio`; badge "só hoje" quando `origin != 'template'`.
- **`SwipeableRow`** — props opcionais `editIcon` e `editLabel`, com o default atual
  (`PencilSimpleIcon` / "Editar"), para usar `ArrowsClockwiseIcon` / "Trocar" aqui.
- **Confirmação da troca** — swipe → trocar com séries feitas abre um `BottomSheet`: "as N
  séries registradas serão perdidas". Sem série feita, vai direto para a busca.
- **`BuscaExercicio`** — reuso direto dentro da sessão. `onCustom` passa a ser opcional e não
  é renderizado aqui.
- **`SessaoFim`** — com `adjustments` maior que zero, mostra "Você ajustou N exercícios hoje.
  Salvar essas mudanças no treino?" e os botões `[Manter treino]` `[Salvar no treino]`.
  Fechar a tela sem escolher não salva.

Telas em PT, sem lógica no `.tsx`; identificadores em EN.

## Testes

`apps/web/src/server/workout/session.test.ts`, no padrão de `service.test.ts` (`createTestDb`,
`createTestUser`):

- adicionar entra no fim da lista, com séries pré-preenchidas pelo último desempenho;
- trocar preserva a `position` e descarta as séries do exercício antigo;
- "só hoje" não altera `exercise` — uma segunda sessão do mesmo treino nasce com a lista
  original;
- `applySessionToWorkout` reflete adição, troca e remoção no template;
- `exerciseCount` da conclusão conta a lista efetiva da sessão, não o template.

## Fora de escopo

- Reordenar a lista do dia.
- Exercício personalizado (fora do catálogo) durante a sessão — o formulário atual está
  acoplado ao `TreinoModal`.
- Ajustar `target_sets` só para o dia.

## Critérios de aceite

- [ ] Adicionar um exercício do catálogo à lista do dia, na sessão ativa.
- [ ] Trocar um exercício da lista por outro do catálogo.
- [ ] Remover um exercício da lista do dia.
- [ ] Trocar com séries feitas pede confirmação antes de descartá-las.
- [ ] Ajustes valem só para a sessão; o template só muda por "Salvar no treino" na conclusão.
- [ ] Fechar a tela de fim sem escolher mantém o treino inalterado.
- [ ] As séries refletem a lista efetiva da sessão, incluindo itens adicionados e trocados.
- [ ] Migration criada, com backfill das sessões existentes.
