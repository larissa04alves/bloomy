# Fase 5 — Front Treino (design)

> **Contexto:** back 100% pronto (rotas REST em `apps/web/src/app/api/{workouts,sessions}/**`
> + serviço em `apps/web/src/server/workout/service.ts`). Front da aba Treino é skeleton
> (`app/(app)/treino/page.tsx`). Esta fase entrega a aba Treino de ponta a ponta contra a
> API existente, seguindo o padrão já provado na aba Corpo (F4).
>
> Autoridade visual: `DESIGN.md` + `docs/README.md` (§3, §4, §9 modal treino) + protótipos
> `docs/Diario App*.html`. Autoridade de produto: `PRODUCT.md`. Convenções: `apps/web/CLAUDE.md`.

## Objetivo

Aba Treino funcional: lista de treinos com resumo/streak da semana, fluxo de **treino em
andamento** (máquina de estados `lista→ex→fim` + timer de descanso), e criar/editar/excluir
treinos via bottom sheet. Domínio **rosa** em todos os chips/tints/botões.

## Escopo (decidido no brainstorming)

- **Registro de série:** reps/carga pré-preenchidos do último treino, **editáveis** (stepper/tap)
  antes de marcar Feito. Salvos no mesmo `PUT …/sets/[setId]` (`{reps, load, done}`).
- **Templates:** criar **+ editar + excluir** (swipe igual Corpo; back tem `PUT`/`DELETE`).
- **Descanso:** `restSeconds` default 45 + `autoRest` default ligado; ajustável no overlay
  (−15/+15 + toggle auto), preferência salva em `localStorage` (back não tem campo).

Fora de escopo: histórico/gráficos de treino, PRs, reordenar template por drag (o modal
recria a lista de exercícios — replace-all já suportado pelo back).

## Contratos do back (já existentes)

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/workouts` | `{ workouts: WorkoutWithExercises[] }` |
| `POST` | `/api/workouts` | cria; body `{name, focus, exercises[]}` → `{ workout }` 201 |
| `PUT` | `/api/workouts/[id]` | edita template (replace-all de exercises) → `{ workout }` |
| `DELETE` | `/api/workouts/[id]` | desativa (`active=false`) → 204/erro |
| `GET` | `/api/workouts/summary` | `{ weekCount, weekTarget, streak, weekDays[7] }` |
| `GET` | `/api/sessions/active` | `{ session: SessionDetail \| null }` |
| `POST` | `/api/workouts/[id]/sessions` | inicia; `{ session }` 201 · `409 already_active` · `404 not_found` |
| `POST` | `/api/sessions/[id]/complete` | `{ completedAt, durationSec, exerciseCount }` · `404` se já concluída |
| `PUT` | `/api/sessions/[id]/sets/[setId]` | `{reps?, load?, done?}` → `{ set }` · `404` |

`focus`: `chest | back | legs | cardio`. `SessionExercise` traz `lastPerformance {reps, load}`
(último treino, por nome do exercício). `startSession` pré-preenche as séries com esse último
treino; 1 sessão ativa por usuário por vez.

## Arquitetura (front)

Mesma organização da aba Corpo (`apps/web/CLAUDE.md`): `page.tsx` só renderiza; lógica em
`hooks/`; visual em `components/` da tela.

```
app/(app)/treino/
  page.tsx                  → sessão ativa? <SessaoAtiva> : <TreinoLista>
  hooks/
    useTreinos.ts           → GET /api/workouts + /summary; create/edit/delete otimista
    useSessao.ts            → GET /api/sessions/active; start/updateSet/complete; view
    useDescanso.ts          → countdown; restSeconds/autoRest em localStorage
  components/
    ResumoTreinoCard.tsx    → card rosa "N treinos essa semana" + streak (fire) + 7 bolinhas
    TreinoList.tsx          → SwipeableRow (editar/excluir) + botão play por treino
    TreinoModal.tsx         → BottomSheet criar/editar (nome, foco, exercícios)
    SessaoAtiva.tsx         → orquestra views 'lista' | 'ex' | 'fim'
    ExercicioList.tsx       → view 'lista' (header, timer da sessão, exercícios, Concluir)
    SerieList.tsx           → view 'ex' (séries: reps/carga editáveis + Feito)
    DescansoOverlay.tsx     → overlay #3B3552 ancorado embaixo: anel + mm:ss + ajuste + Pular
    SessaoFim.tsx           → view 'fim' (check verde, 2 stats, Voltar ao início)
```

Tipos novos em `lib/api-types.ts` (espelham o serviço; datas como string ISO):
`Focus`, `FOCUS_LABELS` (Peito/Costas/Pernas/Cardio), `Workout`, `Exercise`,
`WorkoutWithExercises`, `WorkoutSummary`, `SessionDetail`, `SessionExercise`, `SetLog`.

## Máquina de estados (treino em andamento)

- `view: 'lista' | 'ex' | 'fim'`, `activeEx: number` (índice do exercício).
- **Entrada:** `useSessao` faz `GET /api/sessions/active` no mount. Se há sessão → `<SessaoAtiva>`
  em `view='lista'`; senão → `<TreinoLista>`.
- **Iniciar:** play → `POST /api/workouts/[id]/sessions` → `SessionDetail` → `view='lista'`.
- Tocar exercício → `view='ex'`; "voltar" no header de 'ex' → `view='lista'`.
- **Marcar Feito** numa série → otimista (série vira done no estado) + `PUT …/sets/[setId]`
  `{reps, load, done:true}`; se `autoRest`, dispara `useDescanso`.
- Editar reps/carga da série → atualiza estado local; persiste no PUT ao marcar Feito (ou em
  blur, se editada sem marcar).
- **Concluir treino** → `POST …/complete` → `view='fim'` com `{durationSec, exerciseCount}`.
- **Voltar ao início** → reseta view e recarrega lista/summary.

## Erros / edge cases

- Mutação otimista + `toastError` + rollback no catch (padrão `useHidratacao`/`useRefeicoes`).
- `409 already_active` ao iniciar → recarrega a sessão ativa em vez de erro.
- `complete` idempotente no back (double-tap → 404/null); front desabilita o botão após o toque.
- **Regra Sem-Vermelho:** pendência neutra (tracejado + tinta suave); erro de form no modal usa
  coral `#C76E93`, nunca vermelho de sistema.
- `prefers-reduced-motion`: anel do descanso sem animação (corte seco), progresso via texto.

## Fidelidade visual (handoff)

- **Domínio rosa:** chip/tint `#FBEAF2`, ícone/texto profundo `#C76E9E`, botão primário do modal
  e do play `#E08AB0`. Ícone `barbell` (Phosphor Fill).
- **Resumo (rosa):** "N treinos essa semana", streak `fire`, semana em 7 bolinhas (feito = cheio).
- **Lista:** chip de ícone + nome + "N exercícios · min" + botão redondo de play.
- **Em andamento — lista:** header (voltar, nome, "X de N exercícios", chip timer `mm:ss` da
  sessão), hint, exercícios (chip `barbell` + nome + "N séries · carga"; `check-circle` verde se
  concluído, senão `caret-right`), botão **Concluir treino**.
- **Em andamento — séries:** header (voltar, nome, "Série X de N"), faixa "Último treino: …",
  séries (Série N + reps + kg editáveis + **Feito**/`check-circle`); série atual com fundo
  `#EDE7F8`.
- **Descanso:** overlay `#3B3552` ancorado embaixo, anel + "DESCANSO mm:ss" + Pular + ajuste.
- **Concluído:** check grande verde, "Treino concluído!", 2 stats (exercícios, duração), botão.
- **Modal treino (bottom sheet):** grabber, header chip + título, Nome, foco Peito/Costas/Pernas/
  Cardio (ChoiceChip rosa), lista de exercícios + "Adicionar exercício" (tracejado), botão
  primário rosa `#E08AB0`. Reusa como "Editar treino".

## Testes (TDD, cobertura nos pontos críticos — `apps/web/CLAUDE.md`)

- `useDescanso`: countdown decrementa até 0; "Pular" encerra; `autoRest=false` não dispara.
- `useSessao`: transições `lista→ex→fim`; marcar série incrementa concluídas do exercício;
  409 ao iniciar recarrega sessão ativa.
- `ResumoTreinoCard`: mapeia `weekDays[7]` → bolinhas cheias/vazias corretas.

## Aceitação

`bun check-types` verde **e** verificação visual real na porta 3001: iniciar treino → marcar
série (editando carga) → timer de descanso → concluir → resumo; criar treino pelo modal aparece
na lista; editar/excluir por swipe reflete sem reload. `check-types` verde ≠ UI funcionando.
