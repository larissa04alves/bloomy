# Ajustes de funcionalidades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cinco ajustes na branch `feat/ajustar-funcionalidades`: treino vazio com CTA central, consulta "a agendar", unidade da dose em dropdown, botões da hidratação mais leves e itens de refeição com gramas.

**Architecture:** 1, 3 e 4 são só front. 2 abre na criação/edição de consulta o status `to_schedule` que o schema já tem (hoje só o retorno usa). 5 troca `meal.description` (texto) por `meal.items` (JSON), com migration de backfill e outra de remoção, no padrão das 0020/0021.

**Tech Stack:** Next.js 16, Drizzle + libsql, zod, TanStack Form, vaul, Phosphor, `bun test`.

**Spec:** seção "Design aprovado" abaixo (mockups em `.superpowers/brainstorm/329758-1790689120/content/`).

## Status

- [x] 1. Treino vazio (visual pendente)
- [x] 2. Hidratação (redesenhada: gota G3 + segurar R3; visual ok em /corpo)
- [x] 3. Unidade da dose (visual pendente)
- [x] 4. Consulta "a agendar" (visual pendente)
- [x] 5. Itens da refeição com gramas (visual pendente; produção NÃO migrada)
- [x] 6. Campos numéricos do treino (bug "030") (visual pendente; desvio: vazio no blur da sessão → 0, não null)
- [x] 7. Barra de rolagem dos filtros de músculo (visual pendente)
- [x] 8. Vários grupos musculares (visual pendente; produção NÃO migrada)
- [ ] 9. Verificação final

## Design aprovado

1. **Treino vazio (1B).** Lista vazia → card tracejado inteiro clicável (círculo branco com `+` rosa, "Criar primeiro treino", "Toque para montar"), no padrão das refeições pendentes. O "+ Novo treino" do cabeçalho só aparece com treinos. Nada de estado vazio enquanto a lista carrega.
2. **Consulta "a agendar" (2A).** Chips de status "A agendar | Agendada" no `AppointmentModal`, como no exame. "A agendar" esconde data, hora, local e "lembrar 1 dia antes" e mostra "Agendar até (opcional)" com chips Sem prazo · 1 mês · 3 meses · 6 meses · 12 meses (os do retorno). Com prazo, entra em "Próxima consulta" como já acontece com retorno. Botão "Agendar" do card abre em "Agendada"; swipe editar abre no status atual. Seção: "+ Agendar" vira "+ Adicionar", vazio "Nenhuma consulta por aqui.", subtítulo "Dermatologista · até dez". Título "Retorno a agendar" só com `parentId`; sem ele, "Consulta a agendar" (Saúde e Home). Push não muda.
3. **Dose (3A).** Sem os 7 chips. Campo Dose = input + gatilho de unidade colado ("comp. ▾"). Estoque herda a unidade no sufixo.
4. **Hidratação (gota G3 + segurar R3, 29/09 — substituiu a C0).** Gota grande com onda animada, degradê e reflexo; nível = total ÷ meta (`waterLevel`). Tocar bebe a porção (pingo cai, balancinho, ondinha e bolhas); segurar 800 ms tira o último registro (pingo sobe), com o anel aparecendo só depois de 200 ms. Layout L1: card `bg-lilac-tint` na largura toda, à esquerda "900 / 1500 ml", "faltam X ml"/"meta batida 💜", a dica e o chip "Outra quantidade"; a gota (sem número dentro) à direita. L2 (sem card, gota à direita) fica como alternativa a testar. Sem fileira de gotinhas, sem toast. Teclado/leitor de tela: a gota é `button` (Enter/Espaço bebem) e há um "Tirar último copo" `sr-only` que aparece no foco. `prefers-reduced-motion` desliga as animações.
5. **Refeição (5A).** Tipo continua nos chips do topo. Cada linha: nome + campo curto de gramas com sufixo "g", opcional. Card: "Arroz 150 g · Feijão · Frango grelhado 120 g". Sem somas nem calorias. Dados em `meal.items` JSON; texto antigo quebrado na vírgula vira itens sem gramas.
6. **Campos numéricos (pedido de 29/09, 2º lote).** Séries/reps/intervalo do modal de treino e carga/reps da sessão ativa: dá para apagar o campo e digitar outro valor; zero à esquerda some ("030" → "30"); o limite só é aplicado ao sair do campo (vazio → mínimo).
7. **Filtro de músculo na busca.** A fileira de chips continua rolando com o dedo, sem barra de rolagem visível.
8. **Vários grupos musculares.** Treino: chips multi-seleção, mínimo 1, ordem fixa de `FOCUS_VALUES`; lista mostra "5 exercícios · Peito · Braços". Exercício personalizado: vários grupos (0 a 8), o seletor não fecha a cada toque. Exercício de catálogo segue com o grupo único do catálogo. Dados: `workout.focuses` e `muscle_groups` (exercise e session_exercise) em JSON, backfill do valor único, remoção das colunas antigas.

## Deploy (quando ela decidir)

0022–0025 são expand/contract, mas saem juntas: não há estado intermediário seguro. Migrar antes do deploy quebra o código publicado (`description`/`focus` somem); deploy antes da migration quebra o novo. Depois de 0023/0025, o Instant Rollback do Vercel sozinho quebra Corpo, Treino e Hoje.

1. Backup/branch do Turso de produção (`turso db create --from-db` ou PITR).
2. Opcional: rodar as migrations no branch primeiro (só foram validadas em `file:` local).
3. Antes de migrar: `SELECT count(*) FROM meal WHERE length(description) > 120 OR length(description) - length(replace(description, ',', '')) >= 30` — refeições que o zod novo recusaria ao editar.
4. `bun db:migrate` e `bun deploy:prod` em sequência imediata.
5. Rollback = restaurar o banco + redeploy da versão anterior, nunca só o Instant Rollback.
6. Conferir se o preview do Vercel usa o mesmo Turso (`scripts/sync-vercel-env.ts` sincroniza o mesmo `.env` nos dois): se usar, `bun deploy` (preview) desta branch quebra sem migration, e migrar quebra produção.

## Global Constraints

- Nunca commitar (CLAUDE.md do projeto). Cada task termina com mudanças não-commitadas.
- Migrations sempre via `bun db:generate` + `bun db:migrate` da raiz; nunca `drizzle-kit push`.
- Telas em PT, sem lógica no `.tsx` além de estado de formulário; helpers puros em `hooks/format.ts` com teste.
- Testes: `bun run --cwd apps/web test` (roda a suíte toda, ~2 s; base = 401 pass). Filtro: `-t "<nome>"`.
- Tipos: `bun check-types` da raiz.
- Gramas: inteiro de 1 a 5000 ou `null`. Nome do item: 1 a 120 chars após trim. Itens por refeição: 1 a 30.
- Unidade da dose: `<select>` nativo invisível sobre o gatilho, não o `dropdown-menu`: o sheet é Drawer do vaul (Radix Dialog modal), e menu em portal fora do conteúdo do modal pode ficar sem clique. Não testado; o nativo evita a dúvida e abre o picker do SO no celular.
- UI só conta como pronta com verificação na rota real (`/dev-up` + claude-in-chrome), mostrando o dado renderizado.

## Review Focus

- Refeição antiga ("arroz, feijão") aparece como dois itens sem gramas depois das migrations, e editar e salvar não perde nada. Dono: Task 5, Step 5.
- Editar uma consulta "a agendar" sem tocar no prazo mantém o `suggestedAt`. Dono: Task 4, teste `update sem suggestedAt preserva o prazo`.
- Passar consulta agendada para "a agendar" zera `scheduledAt` e `remindDayBefore` (senão o card mostra hora fantasma). Dono: Task 4, teste `agendada → a agendar zera horário`.
- Gramas em branco ou "0" viram `null`, nunca 0. Dono: Task 5, teste de `toMealItems`.
- Porção ainda não carregada: `+` desabilitado e sem subtítulo com o fallback de 500 ml. Dono: Task 2, Step 2.

---

### Task 1: Treino vazio

**Files:**
- Modify: `apps/web/src/app/(app)/treino/components/TreinoList.tsx`
- Modify: `apps/web/src/app/(app)/treino/page.tsx`

**Interfaces:**
- Produces: `TreinoList` ganha a prop `onCreate: () => void`.
- Consumes: `useTreinos().loading` (já existe, `useTreinos.ts:84`).

- [ ] **Step 1:** Em `TreinoList`, trocar o `<p>` vazio por um `<button>` tracejado no padrão do pendente de `RefeicoesSection.tsx` (tom rosa: `IconChip`/círculo `bg-white text-pink-bright` com `PlusIcon`, título `font-bold text-pink-deep` "Criar primeiro treino", subtítulo `text-xs text-ink-read` "Toque para montar", layout em coluna centralizado, `py-6`). Clique chama `onCreate`.
- [ ] **Step 2:** Em `page.tsx`: extrair `openCreate` (`setEditing(undefined); setModalOpen(true)`), passar para `onCreate` e para o botão do cabeçalho. Renderizar o botão "+ Novo treino" só com `treinos.workouts.length > 0`; não renderizar `TreinoList` enquanto `treinos.loading && treinos.workouts.length === 0`.
- [ ] **Step 3:** `bun check-types` → sem erros.
- [ ] **Step 4:** Verificação visual em `/treino` com um usuário sem treinos: card central aparece, cabeçalho sem "Novo treino", tocar abre o `TreinoModal`; criar um treino → lista normal e o botão volta ao cabeçalho.

### Task 2: Hidratação

**Files:**
- Modify: `apps/web/src/app/(app)/corpo/components/HidratacaoSection.tsx`

- [ ] **Step 1:** Cabeçalho: título em coluna com `<span className="text-xs font-semibold text-ink-read">copo de {portionMl} ml</span>` abaixo, só quando `portionReady`. O "X de Y ml" fica à direita.
- [ ] **Step 2:** Linha de botões `justify-center gap-4.5`: `−` `size-10` `bg-lilac-tint text-lilac-deep` (ícone 17); `+` `size-13` `rounded-full bg-lilac text-white` sem `shadow-btn`, só `PlusIcon` 24, `aria-label={\`Adicionar ${portionMl} ml\`}`, `disabled={!portionReady || !canAdd}` com `disabled:opacity-60`; gota `size-10` igual ao `−`. Remover o texto do botão.
- [ ] **Step 3:** `bun check-types` → sem erros.
- [ ] **Step 4:** Verificação visual em `/corpo`: três controles centralizados, `+` soma uma porção e enche a gota, `−` tira, gota abre o `WaterModal`; recarregar a página não mostra "copo de 500 ml" antes da porção real.

### Task 3: Unidade da dose

**Files:**
- Modify: `apps/web/src/lib/dose.ts`
- Modify: `apps/web/src/app/(app)/saude/components/MedicationModal.tsx`

**Interfaces:**
- Produces: `DOSE_UNIT_LABELS[u].name: string` (nome extenso para a lista).

- [ ] **Step 1:** Em `DOSE_UNIT_LABELS`, somar `name`: comp → "comprimido", capsula → "cápsula", gotas → "gotas", ml → "ml", g → "g", mg → "mg", scoop → "scoop".
- [ ] **Step 2:** Em `MedicationModal`, remover os `ChoiceChip` de unidade. O campo Dose vira um contêiner `rounded-control border` com o input à esquerda e, à direita, um `<label>` `relative bg-coral-tint text-coral font-bold` mostrando `unitLabel(2, doseUnit)` + `CaretDownIcon`, com um `<select aria-label="Unidade da dose">` `absolute inset-0 opacity-0` cujas `<option>` usam `DOSE_UNIT_LABELS[u].name`. Rótulos "Dose" e "Estoque" em cima de cada campo, lado a lado (Dose `flex-[1.3]`). Estoque mantém o sufixo `unitLabel(2, doseUnit)`.
- [ ] **Step 3:** `bun check-types` e `bun run --cwd apps/web test` → sem erros, 401 pass.
- [ ] **Step 4:** Verificação visual em `/saude` → cadastrar remédio: gatilho mostra "comp.", trocar para "gotas" muda o gatilho e o sufixo do estoque; salvar e reabrir em edição mantém a unidade.

### Task 4: Consulta "a agendar"

**Files:**
- Modify: `apps/web/src/server/health/service.ts` (tipos `AppointmentInput`/`AppointmentUpdate`, `createAppointment`, `updateAppointment`)
- Modify: `apps/web/src/app/api/appointments/route.ts`, `apps/web/src/app/api/appointments/[id]/route.ts`
- Modify: `apps/web/src/lib/api-types.ts` (`AppointmentInput`)
- Modify: `apps/web/src/app/(app)/saude/components/{AppointmentModal,ConsultasSection,ProximaConsultaCard}.tsx`, `apps/web/src/app/(app)/saude/page.tsx`, `apps/web/src/app/(app)/saude/hooks/format.ts`
- Modify: `apps/web/src/app/(app)/home/components/ConsultaCard.tsx`
- Test: `apps/web/src/server/health/service.test.ts`, `apps/web/src/app/(app)/saude/hooks/format.test.ts`

**Interfaces:**
- Produces (server):
  - `AppointmentInput = { professional: string; specialty?: string; status?: "scheduled" | "to_schedule"; scheduledAt?: Date | null; suggestedAt?: Date | null; location?: string; remindDayBefore?: boolean }`
  - `AppointmentUpdate` = o mesmo, todos opcionais.
  - `createAppointment(db, userId, input): Promise<Appointment | "missing_schedule">`
  - `updateAppointment(db, userId, id, input): Promise<Appointment | null | "missing_schedule">`
- Produces (front): `AppointmentInput = { professional: string; specialty?: string; status: "scheduled" | "to_schedule"; scheduledAt: string | null; suggestedAt: string | null; location?: string; remindDayBefore?: boolean }`; `addMonthsIso(months: number, now?: Date): string` em `saude/hooks/format.ts`; `AppointmentModal` ganha `initialStatus?: "scheduled" | "to_schedule"`; `ConsultasSection` ganha `onSchedule: (a: Appointment) => void`.

- [ ] **Step 1: Testes que falham** em `service.test.ts`, `describe("consulta a agendar")`:
  - `cria a agendar sem data`: `createAppointment(db, u, { professional: "Dra. Marina", status: "to_schedule", suggestedAt: d })` → `status === "to_schedule"`, `scheduledAt === null`, `suggestedAt` = `d`.
  - `agendada sem data → missing_schedule`: `status: "scheduled"` sem `scheduledAt` → `"missing_schedule"`; sem `status` e sem `scheduledAt` → `"missing_schedule"`.
  - `agendada → a agendar zera horário`: criar agendada com `remindDayBefore: true`, `updateAppointment(..., { status: "to_schedule", suggestedAt: null })` → `scheduledAt === null`, `remindDayBefore === false`, `suggestedAt === null`.
  - `update sem suggestedAt preserva o prazo`: a agendar com `suggestedAt: d`, `updateAppointment(..., { specialty: "Derma" })` → `suggestedAt` continua `d`, status `to_schedule`.
  - `status scheduled sem data no patch nem na linha → missing_schedule`.
  - `nextAppointment` inclui a agendar com `suggestedAt` dentro de 30 dias e ignora a sem prazo.
- [ ] **Step 2:** `bun run --cwd apps/web test -t "consulta a agendar"` → FAIL (tipos/sentinela ainda não existem).
- [ ] **Step 3:** Implementar no service. `createAppointment`: `status ?? "scheduled"`; `scheduled` sem `scheduledAt` → `"missing_schedule"`; `to_schedule` grava `scheduledAt: null`, `location: null`, `remindDayBefore: false`, `suggestedAt ?? null`. `updateAppointment`: ler a linha atual (como `updateExam`), resolver o estado final; `status: "to_schedule"` força `scheduledAt: null`, `remindDayBefore: false`; `scheduledAt` sem `status` mantém a promoção atual para `scheduled`; `suggestedAt` só muda quando vem no patch; estado final `scheduled` sem `scheduledAt` → `"missing_schedule"`. Ajustar os usos antigos no teste (`completeAppointment` etc.) se o tipo de retorno pedir narrowing.
- [ ] **Step 4:** Rotas: `BODY_SCHEMA` do POST com `status: z.enum(["scheduled","to_schedule"]).optional()`, `scheduledAt: z.coerce.date().nullable().optional()`, `suggestedAt: z.coerce.date().nullable().optional()`; PUT com os mesmos campos opcionais. `"missing_schedule"` → `badRequest("consulta agendada precisa de data")`, como em `api/exams/route.ts:28`.
- [ ] **Step 5:** `bun run --cwd apps/web test` → tudo verde.
- [ ] **Step 6: Teste que falha** em `saude/hooks/format.test.ts`: `addMonthsIso(3, new Date("2026-09-29T12:00:00-03:00"))` começa com `"2026-12-29"`. Rodar → FAIL. Implementar (mesma conta de `useConsultas.complete`, que passa a usá-lo). Rodar → PASS.
- [ ] **Step 7: Modal.** `AppointmentModal`: estado `status` (semente: `initialStatus ?? (initial?.status === "to_schedule" ? "to_schedule" : initial ? "scheduled" : "to_schedule")`) e `due: "keep" | null | 1 | 3 | 6 | 12` (semente `"keep"` quando `initial?.suggestedAt`, senão `null`). Chips "A agendar | Agendada" logo após especialidade. Em "A agendar": esconder data/hora/local/lembrete e mostrar "Agendar até (opcional)" com um chip "Até {monthShort}" (só se `initial?.suggestedAt`, valor `"keep"`), "Sem prazo" (`null`), "1 mês", "3 meses", "6 meses", "12 meses". Submit: `to_schedule` → `{ status, scheduledAt: null, suggestedAt: due === "keep" ? initial!.suggestedAt : due === null ? null : addMonthsIso(due) }`; `scheduled` exige `date` como hoje e manda `suggestedAt: initial?.suggestedAt ?? null`. Título: "Adicionar consulta" (novo), "Agendar consulta" (abrindo em `scheduled` a partir de `to_schedule`), "Editar consulta" (resto). Botão desabilitado só quando `scheduled && !date`. Semente da data em `scheduled` continua `scheduledAt ?? suggestedAt`.
- [ ] **Step 8: Seção, cards e page.** `ConsultasSection`: botão "Agendar" do card chama `onSchedule(a)`; cabeçalho "+ Adicionar"; vazio "Nenhuma consulta por aqui."; subtítulo junta especialidade e `até {monthShort(suggestedAt)}` com " · " quando `to_schedule`. `page.tsx`: estado do modal ganha `initialStatus`; `onSchedule` abre com `initialStatus: "scheduled"`. `ProximaConsultaCard` e `ConsultaCard` (Home): rótulo `parentId ? "Retorno a agendar" : "Consulta a agendar"`. Toast de erro do create: "Não foi possível salvar a consulta".
- [ ] **Step 9:** `bun check-types` → sem erros.
- [ ] **Step 10:** Verificação visual em `/saude`: criar "a agendar" com 3 meses → card com "até {mês}" e botão Agendar, e "Próxima consulta" mostra "Consulta a agendar"; editar pelo swipe sem mexer no prazo mantém o mês; "Agendar" abre em Agendada e salvar vira consulta com dia/hora; editar uma agendada para "A agendar" some com a hora. Conferir o card na `/home`.

### Task 5: Itens da refeição com gramas

**Files:**
- Modify: `packages/db/src/schema/body.ts`
- Create: `packages/db/src/migrations/0022_*.sql` e `0023_*.sql` (gerados)
- Modify: `apps/web/src/server/meals/service.ts`, `apps/web/src/app/api/meals/route.ts`, `apps/web/src/app/api/meals/[id]/route.ts`
- Modify: `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/app/(app)/corpo/hooks/{format.ts,useRefeicoes.ts}`, `apps/web/src/app/(app)/corpo/components/{MealModal,RefeicoesSection}.tsx`, `apps/web/src/app/(app)/corpo/page.tsx`
- Test: `apps/web/src/server/meals/service.test.ts`, `apps/web/src/app/(app)/corpo/hooks/format.test.ts`, `apps/web/src/server/today/service.test.ts` (fixtures)

**Interfaces:**
- Produces: `export type MealItem = { name: string; grams: number | null }` em `@bloomy/db/schema/body`, reexportado em `api-types.ts` como `DoseUnit`. `Meal.items: MealItem[]` (sem `description`). Service: `addMeal(db, userId, { type, items })`, `updateMeal(db, userId, id, { type?, items? })`. Front: `formatMealItems(items: MealItem[]): string`; `toMealItems(rows: { name: string; grams: string }[]): MealItem[]`; `useRefeicoes().addMeal/editMeal` recebem `{ type: MealType; items: MealItem[] }`; `MealModal.editing?: { type: MealType; items: MealItem[] }`.

- [ ] **Step 0: Banco descartável no estado de hoje.** Com o schema ainda intacto: `DATABASE_URL=file:$SCRATCH/meal-mig.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate` (direto no package: o turbo pode filtrar env; o dialeto `turso` exige token não vazio mesmo em `file:`) (aplica 0000–0021; `$SCRATCH` = scratchpad da sessão). Inserir um user e uma refeição antiga via `sqlite3 $SCRATCH/meal-mig.db` com `description = 'arroz, feijão'`. Nunca rodar `db:migrate` sem esse override nesta task: o `DATABASE_URL` do `apps/web/.env` é o Turso remoto.
- [ ] **Step 1: Migration de adição.** Em `meal`, adicionar `items: text("items", { mode: "json" }).$type<MealItem[]>().default(sql\`'[]'\`).notNull()` mantendo `description` por enquanto. `bun db:generate` → conferir que o SQL tem `ALTER TABLE \`meal\` ADD \`items\` text DEFAULT '[]' NOT NULL`. Anexar ao fim do arquivo gerado (com `--> statement-breakpoint` antes), como fez a 0020:

```sql
-- Texto antigo "arroz, feijão" → um item por pedaço, sem gramas.
UPDATE `meal` SET `items` = (
  WITH RECURSIVE split(part, rest) AS (
    SELECT '', `meal`.`description` || ','
    UNION ALL
    SELECT trim(substr(rest, 1, instr(rest, ',') - 1)), substr(rest, instr(rest, ',') + 1)
    FROM split WHERE rest <> ''
  )
  SELECT json_group_array(json_object('name', part, 'grams', NULL)) FROM split WHERE part <> ''
);
```

  (SQL conferido no libsql 3.45.1: `'arroz, feijão, frango grelhado'` → 3 itens; `' pão ,  , café,'` → `pão`, `café`.)
- [ ] **Step 2: Testes que falham** em `meals/service.test.ts`: reescrever o teste de `updateMeal` para `items` (`[{ name: "arroz", grams: 150 }]` → `[{ name: "sopa", grams: null }]`, parcial só `type` mantém `items`, outro usuário → `null`) e somar `addMeal guarda itens com e sem gramas` (ida e volta de `[{name:"Arroz",grams:150},{name:"Feijão",grams:null}]` via `getMealsDay`). Rodar → FAIL.
- [ ] **Step 3:** Service e rotas para `items`. zod compartilhado nas duas rotas: `z.array(z.object({ name: z.string().trim().min(1).max(120), grams: z.number().int().min(1).max(5000).nullable() })).min(1).max(30)`. PUT mantém o `refine` "ao menos um campo" (`type` ou `items`). Tirar `description` do schema drizzle, do service e das rotas; atualizar fixtures de `today/service.test.ts`. Rodar os testes → PASS.
- [ ] **Step 4: Migration de remoção.** `bun db:generate` → conferir que o SQL novo é só `ALTER TABLE \`meal\` DROP COLUMN \`description\`` (+ recriação de índices que o drizzle-kit fizer).
- [ ] **Step 5: Backfill no banco descartável.** `DATABASE_URL=file:$SCRATCH/meal-mig.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate` (direto no package: o turbo pode filtrar env; o dialeto `turso` exige token não vazio mesmo em `file:`) → aplica 0022 e 0023; `sqlite3 $SCRATCH/meal-mig.db "SELECT items FROM meal"` → `[{"name":"arroz","grams":null},{"name":"feijão","grams":null}]` e `PRAGMA table_info(meal)` sem `description`.
- [ ] **Step 5b: NÃO migrar o Turso do `.env`** (decidido em 29/09: é produção). O `DROP COLUMN` quebraria o código publicado que ainda lê `description`; a aplicação fica para o deploy, por decisão dela. A verificação visual do Step 9 espera essa aplicação ou um banco dev.
- [ ] **Step 6: Helpers com teste que falha** em `corpo/hooks/format.test.ts`:
  - `formatMealItems([{name:"Arroz",grams:150},{name:"Feijão",grams:null},{name:"Frango grelhado",grams:120}])` → `"Arroz 150 g · Feijão · Frango grelhado 120 g"`.
  - `toMealItems([{name:" Arroz ",grams:"150"},{name:"",grams:"80"},{name:"Feijão",grams:""},{name:"Ovo",grams:"0"}])` → `[{name:"Arroz",grams:150},{name:"Feijão",grams:null},{name:"Ovo",grams:null}]`.
  Rodar → FAIL; implementar em `corpo/hooks/format.ts`; rodar → PASS.
- [ ] **Step 7: Front.** `api-types.ts`: `Meal.items`. `useRefeicoes`: inputs `{ type, items }`, otimista com `items`. `RefeicoesSection`: subtítulo `formatMealItems(m.items)`. `MealModal`: linhas `{ name: string; grams: string }[]`; cada linha é o input do nome (`flex-1`) + input de gramas (`w-19.5`, `inputMode="numeric"`, só dígitos, máx. 4, placeholder "—", sufixo "g" em `text-ink-read`, `aria-label="Gramas"`) + o `X` de hoje; Enter no nome cria a próxima linha; `canSave` = `toMealItems(rows).length > 0`; edição semeia as linhas a partir de `editing.items`. `corpo/page.tsx`: `editing={editingMeal ? { type: editingMeal.type, items: editingMeal.items } : undefined}`. Gramas acima de 5000: botão Salvar desabilitado (validação no `canSave`, não clamp silencioso).
- [ ] **Step 8:** `bun check-types` e `bun run --cwd apps/web test` → sem erros, tudo verde.
- [ ] **Step 9:** Verificação visual em `/corpo`: uma refeição anterior à migration aparece com os itens separados; adicionar almoço com "Arroz 150", "Feijão" em branco → card "Arroz 150 g · Feijão"; editar reabre com as gramas; pendências de café/almoço/jantar seguem certas; a Home conta a refeição.

### Task 6: Campos numéricos do treino (bug "030")

**Causa raiz:** `NumField` (`treino/components/TreinoModal.tsx:70`) aplica `clamp(Number(value))` a cada tecla, então vazio vira o mínimo na hora; e com `type="number"` controlado por número o React não reescreve o DOM quando o valor numérico não muda ("030" == 30). `SerieList.tsx:39-61` tem o mesmo padrão (`sanitize("") → 0`).

**Files:**
- Modify: `apps/web/src/app/(app)/treino/hooks/format.ts`, `apps/web/src/app/(app)/treino/components/TreinoModal.tsx`, `apps/web/src/app/(app)/treino/components/SerieList.tsx`
- Test: `apps/web/src/app/(app)/treino/hooks/format.test.ts`

**Interfaces:**
- Produces: `numberDraft(raw: string, decimal?: boolean): string` (só dígitos — e uma vírgula/ponto se `decimal` — sem zero à esquerda); `commitDraft(draft: string, min: number, max: number): number` (vazio ou inválido → `min`; senão clamp e arredonda).

- [ ] **Step 1: Testes que falham:** `numberDraft("030") → "30"`, `numberDraft("") → ""`, `numberDraft("0") → "0"`, `numberDraft("3a") → "3"`, `numberDraft("07,5", true) → "7,5"`, `numberDraft("0,5", true) → "0,5"`; `commitDraft("", 1, 20) → 1`, `commitDraft("35", 1, 20) → 20`, `commitDraft("30", 0, 600) → 30`. Rodar → FAIL.
- [ ] **Step 2:** Implementar em `treino/hooks/format.ts`. Rodar → PASS.
- [ ] **Step 3:** `NumField`: estado local `draft: string | null` (como o `Stepper`); input `type="text" inputMode="numeric"`; `onChange` → `setDraft(numberDraft(raw))`; `onBlur` → `onChange(commitDraft(draft, min, max))` e `setDraft(null)`; exibe `draft ?? String(value)`.
- [ ] **Step 4:** `SerieList`: input vira `type="text"` com `inputMode={mode}`; digitação guarda o rascunho sem zero à esquerda e vazio no blur vira 0 (desvio registrado: `null` quebrava o PUT; design 6 manda "vazio → mínimo"); carga aceita decimal (`mode === "decimal"`). Botões ± seguem iguais.
- [ ] **Step 5:** `bun check-types` e `bun run --cwd apps/web test` → verde.

### Task 7: Barra de rolagem dos filtros de músculo

**Files:** Modify: `apps/web/src/app/(app)/treino/components/BuscaExercicio.tsx:87`

- [ ] **Step 1:** Na fileira `flex gap-2 overflow-x-auto pb-1`, somar `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` (Firefox + WebKit/Blink). Rolagem por toque continua.
- [ ] **Step 2:** `bun check-types` → sem erros.

### Task 8: Vários grupos musculares

**Files:**
- Modify: `packages/db/src/schema/workout.ts`; Create: migrations `0024_*` e `0025_*` (geradas)
- Modify: `apps/web/src/server/workout/{service,session}.ts`, rotas `apps/web/src/app/api/workouts/route.ts`, `apps/web/src/app/api/workouts/[id]/route.ts`, `apps/web/src/app/api/sessions/[id]/exercises/route.ts`, `apps/web/src/app/api/sessions/[id]/exercises/[sessionExerciseId]/route.ts`
- Modify: `apps/web/src/lib/api-types.ts` (seção Treino), `apps/web/src/app/(app)/treino/{hooks/format.ts,hooks/useTreinos.ts,hooks/useSessao.ts,components/TreinoModal.tsx,components/TreinoList.tsx}`, `apps/web/CONTEXT.md` (se descrever "foco"/"grupo muscular" como único)
- Test: `apps/web/src/server/workout/{service,session}.test.ts`, `apps/web/src/app/(app)/treino/hooks/format.test.ts`

**Interfaces:**
- Produces: colunas `workout.focuses: Focus[]` (`text("focuses", { mode: "json" })`, `DEFAULT '[]' NOT NULL`), `exercise.muscleGroups` e `sessionExercise.muscleGroups: Focus[]` (`text("muscle_groups", { mode: "json" })`, `DEFAULT '[]' NOT NULL`; `[]` = sem grupo). API/serviço: `WorkoutInput.focuses: Focus[]` (zod `z.array(z.enum(FOCUS_VALUES)).min(1).max(8)`), exercícios `muscleGroups?: Focus[]` (zod `.max(8)`, default `[]`; catálogo grava `[]`). Serviço remove duplicados e ordena por `FOCUS_VALUES`. Front: `Workout.focuses`, `muscleGroups` nos tipos de exercício; `formatFocuses(focuses: Focus[]): string` → `"Peito · Braços"`.

- [ ] **Step 0: Banco descartável.** Reusar `$SCRATCH/meal-mig.db` (já em 0023): inserir um `workout` com `focus='chest'`, um `exercise` com `muscle_group='arms'` e outro com `muscle_group` NULL.
- [ ] **Step 1: Migration de adição.** Somar as colunas novas mantendo as antigas; `bun db:generate`; conferir `ADD ... text DEFAULT '[]' NOT NULL` nas três tabelas; anexar (com `--> statement-breakpoint` antes):

```sql
UPDATE `workout` SET `focuses` = json_array(`focus`);--> statement-breakpoint
UPDATE `exercise` SET `muscle_groups` = CASE WHEN `muscle_group` IS NULL THEN '[]' ELSE json_array(`muscle_group`) END;--> statement-breakpoint
UPDATE `session_exercise` SET `muscle_groups` = CASE WHEN `muscle_group` IS NULL THEN '[]' ELSE json_array(`muscle_group`) END;
```
- [ ] **Step 2: Testes que falham:** em `workout/service.test.ts`, `cria treino com vários focos` (`focuses: ["arms","chest","arms"]` → volta `["chest","arms"]`) e `exercício personalizado com vários grupos` (`muscleGroups: ["legs","glutes"]` → `["legs","glutes"]`; exercício de catálogo → `[]`); em `session.test.ts`, a cópia treino → sessão e o apply-to-workout preservam `muscleGroups`; em `format.test.ts`, `formatFocuses(["chest","arms"]) → "Peito · Braços"`. Rodar → FAIL.
- [ ] **Step 3:** Tirar `focus`/`muscleGroup` do schema, gerar a migration de remoção (antes de rodar os testes — `createTestDb` roda todas as migrations), implementar serviço + rotas + ajustes de fixtures. Conferir que o SQL de remoção é só `DROP COLUMN` (`focus`, `muscle_group` ×2). Rodar → PASS.
- [ ] **Step 4:** `DATABASE_URL=file:$SCRATCH/meal-mig.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate` → `SELECT focuses FROM workout` = `["chest"]`; `SELECT muscle_groups FROM exercise` = `["arms"]` e `[]`. **Não migrar o Turso do `.env`** (produção).
- [ ] **Step 5: Front.** `TreinoModal`: estado `focuses: Focus[]` (novo treino nasce `[]`; edição semeia de `editing.focuses`); chip alterna, mas não desmarca o último; `canSave` exige `focuses.length > 0`. `MuscleGroupPicker` recebe/devolve `Focus[]`, alterna sem fechar, botão mostra os rótulos juntos por ", " ou "Grupo muscular". `TreinoList` usa `formatFocuses`. `useTreinos`/`useSessao` passam `focuses`/`muscleGroups: []`.
- [ ] **Step 6:** `bun check-types` e `bun run --cwd apps/web test` → verde; `rg -n "\bfocus\b|muscleGroup\b" apps/web/src/server/workout apps/web/src/app/api "apps/web/src/app/(app)/treino"` sem uso das colunas antigas.

### Task 9: Verificação final

- [ ] **Step 1:** `bun check-types` e `bun run --cwd apps/web test` na raiz do trabalho → sem erros; contagem ≥ 401 + testes novos.
- [ ] **Step 2:** `rg -n "description" apps/web/src/server/meals apps/web/src/app/api/meals apps/web/src/app/\(app\)/corpo` → nenhum uso de `meal.description` sobrando.
- [ ] **Step 3:** Review do diff inteiro (`git diff` + untracked) com `superpowers:requesting-code-review`.
- [ ] **Step 4:** Parar antes de qualquer commit e reportar o que ficou rodando (dev server, `db:local`, visual companion).
