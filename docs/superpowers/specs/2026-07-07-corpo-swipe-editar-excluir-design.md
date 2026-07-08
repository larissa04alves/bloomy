# Corpo — Editar/excluir refeição por swipe + tudo otimista — Design

**Status:** aprovado no brainstorming (2026-07-07). Autoridade visual: `DESIGN.md`.
Estende a F4 (front do Corpo). Toca back (endpoint novo) e front.

## Contexto

A aba Corpo lista refeições feitas (cards). Hoje só dá pra **criar** (modal) — não há
como editar nem excluir pela UI. A API tem `POST /api/meals` e `DELETE /api/meals/:id`,
mas **não tem edição**. Queremos deletar e editar refeições com um gesto mobile leve, no
espírito do app (gentil, Sem-Vermelho).

## Decisões (brainstorming)

- **D1 — Escopo:** só **refeições feitas**. Água é gota (não é lista); remédio do dia é
  toma derivada (já tem toque p/ marcar; o cadastro mora na aba Saúde). Cards **pendentes**
  não recebem swipe (não há o que editar/excluir).
- **D2 — Editar precisa de back:** adicionar **`PUT /api/meals/:id`** (edição real, mantém
  id e horário). Escolhido em vez de "deletar+recriar" (que trocaria id/horário e não é
  atômico).
- **D3 — Gesto = swipe revela botão:** arrastar ← revela **"Excluir"** (coral) atrás do
  card; arrastar → revela **"Editar"** (lilás). Toca no botão pra confirmar. Sem exclusão
  acidental (padrão iOS Mail). Só uma linha aberta por vez; tocar fora fecha.
  `prefers-reduced-motion` respeitado.
- **D4 — Tudo otimista:** **todas** as mutações do Corpo passam a ser otimistas —
  `setData` imediato, `reload()` de reconciliação no sucesso, `setData(prev)` + toast coral
  no erro. Isso **refatora** o que hoje é pending→reload (`addMeal`, `addMedication` da F4).

## Backend — `PUT /api/meals/:id`

- **Serviço** (`apps/web/src/server/meals/service.ts`):
  `updateMeal(db, userId, mealId, input: { type?: MealType; description?: string }):
  Promise<Meal | null>` — atualiza só os campos passados; retorna `null` se não achar
  (userId+id). Descrição vazia é inválida (trim + min 1) — validado na rota.
- **Rota** (`apps/web/src/app/api/meals/[id]/route.ts`, já existe com `DELETE`): adicionar
  `export async function PUT` — zod parcial (`{ type?, description? }`, description
  `.trim().min(1)`), `requireUserId`, chama o serviço, `404` se `null`, senão `{ meal }`.
- **Teste** (`service.test.ts`): update de type+description; update parcial; id de outro
  usuário retorna `null`.
- **Contrato:** `PUT /api/meals/:id { type?, description? } → { meal }` (404 se não existir).

## Front

### `SwipeableRow` (primitivo de interação)
- `apps/web/src/components/swipeable-row.tsx` — app-level (genérico, sem lógica de domínio,
  como `tab-bar`/`screen`; reusável na lista de remédios da Saúde depois).
- Rastreia arrasto horizontal por **pointer events** (sem lib nova); `translateX` com snap
  aberto/fechado ao soltar (limiar ~40% da largura da ação). Ações reveladas atrás do card:
  `leftAction` (Editar, aparece ao arrastar →) e `rightAction` (Excluir, ao arrastar ←).
- Props: `{ onEdit?: () => void; onDelete?: () => void; children }`. Fecha ao tocar fora e
  quando outra linha abre (via um contexto/estado de "linha aberta" ou callback do pai).
- Transições `ease-out` 150–200ms; `motion-reduce:transition-none`.

### Fiação no Corpo
- `RefeicoesSection`: envolver **cada card feito** em `SwipeableRow` com `onDelete` e
  `onEdit`. Pendentes ficam como estão.
- `useRefeicoes` ganha `editMeal(id, input)` (PUT). `deleteMeal(id)` já existe → vira
  **otimista** (remove o card na hora; reverte + toast se falhar).
- `page.tsx`: estado do modal passa a distinguir criar vs editar (guarda a refeição em
  edição); passa `editing` ao `MealModal`.

### `MealModal` — modo edição
- Prop opcional `editing?: { type: MealType; description: string }`. Presente → título
  "Editar refeição", pré-preenche o tipo e os itens (quebra `description` por `", "` de
  volta em inputs). Ao salvar, o pai chama `editMeal(id, …)` (PUT) em vez de `addMeal`.

### Mutação otimista (D4)
- **Criar refeição:** adiciona um card provisório (id `tmp-<uuid>`) + recomputa `pendingTypes`
  localmente; `reload()` reconcilia com o id real; erro → remove o provisório + toast.
- **Editar:** atualiza o card no lugar via `setData`; erro → volta ao anterior + toast.
- **Excluir:** remove da lista na hora; erro → volta + toast.
- **Cadastrar remédio:** adiciona as tomas do dia do novo remédio otimista; reconcilia no
  reload; erro → reverte + toast.
- Água e toggle de remédio: já otimistas (F4), sem mudança.

## Fora de escopo (YAGNI)

- Swipe em água/remédios do dia (D1).
- Undo/reabrir após excluir (D3 usa confirmação por botão, não precisa de undo).
- Reordenar itens por drag; multi-seleção.

## Verificação

- `bun check-types`; `bun test` (updateMeal + suíte existente verde).
- Visual na 3001 (com sessão de teste): swipe ← revela Excluir / → revela Editar; excluir
  some na hora e reverte em erro; editar reabre preenchido e persiste (PUT); criar continua
  ok agora otimista; uma linha aberta por vez.
