# Acompanhamento de peso — design

Issue: [#11](https://github.com/larissa04alves/bloomy/issues/11) · Branch: `feat/11-acompanhamento-peso`
Data: 2026-08-03

## Problema

A issue #11 é uma nota de captura: "poder acompanhar o peso ao longo do tempo, em algum lugar
ligado a saúde/corpo", com três perguntas em aberto — onde mora, o que registrar, como visualizar.
Este documento fecha as três.

## Enquadramento

Peso não é um ritual do dia nem um item de gestão médica. É uma **série temporal de medida** —
um tipo de dado que ainda não existe no app:

| Superfície | Natureza | Peso se encaixa? |
| ---------- | -------- | ---------------- |
| Corpo | tudo `day`-scoped, do dia de hoje, com meta e pendência | Não — histórico de longo prazo quebraria o "tudo aqui é hoje" |
| Saúde | dados episódicos com ciclo de vida (`status`), sem `day` | Parcialmente — é a tela dos dados que não são de hoje |
| Mente | um registro por dia, único, com histórico em lista | Só a forma (um por dia), não o conteúdo |

A intenção validada é **medida ocasional com foco em tendência**: registrar quando lembrar
(semanal, mensal, ao acaso) e ver a linha ao longo do tempo. Isso descarta meta, pendência,
lembrete e card no Hoje — nada de cobrança por não ter pesado.

## Decisões

1. **Onde mora:** seção "Peso" na tela **Saúde**, como último bloco (depois de "Agenda de
   remédios"). Zero rota nova; reaproveita bottom sheet, swipe e calendário que já existem ali.
2. **O que registra:** valor em kg + data. Sem unidade selecionável (sempre kg), sem anotação.
3. **Um peso por dia:** registrar de novo no mesmo dia substitui o valor. Mesma semântica do
   check-in da Mente (`unique(user_id, day)`). Corrigir um valor errado é registrar de novo.
4. **Visualização:** card compacto (~150px) com gráfico do **shadcn/chart**, chips de período
   (30 dias / 3 meses / 1 ano) e tooltip ao tocar. Histórico completo em bottom sheet, agrupado
   por mês.
5. **Variação sempre neutra (lilás).** A seta indica direção; a cor não opina. Verde-desce/
   rosa-sobe embutiria que emagrecer é bom — o único lugar do app que julgaria um número da
   usuária. Coerente com a **Regra do Sem-Vermelho** (`DESIGN.md:148`) e com o glossário, que
   exige neutralidade até nas pendências.

Referência visual dos mockups aprovados: `.superpowers/brainstorm/*/content/final-consolidado.html`.

## Modelo de dados

Nova tabela em `packages/db/src/schema/health.ts`:

```ts
export const weightLog = sqliteTable(
  "weight_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    day: text("day").notNull(),          // YYYY-MM-DD, fuso BR (ADR-0002)
    grams: integer("grams").notNull(),   // 64,2 kg → 64200
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [uniqueIndex("weight_log_user_day_idx").on(table.userId, table.day)],
);
```

**Por que gramas inteiros e não decimal:** SQLite guardaria `REAL` e 64,2 vira 64.19999…, o que
contamina comparações e somas de variação. A hidratação já resolve isso com `ml` inteiro — mesma
escolha. Nada que seja persistido, comparado ou somado é float: o stepper opera em gramas
(`step={100}` = 0,1 kg) e a conversão para kg acontece só na borda de apresentação — o texto
`"64,2 kg"` e os pontos plotados no gráfico.

O `uniqueIndex(user_id, day)` também serve de índice para as consultas por intervalo — não é
preciso um índice extra.

Migration gerada com `bun db:generate` (nunca editar migration existente).

## Servidor

Arquivo novo `apps/web/src/server/health/weight.ts` — o `service.ts` da saúde já tem 501 linhas e
cobre consultas/exames/remédios; peso não pertence a esse ciclo de vida.

| Função | Comportamento |
| ------ | ------------- |
| `listWeights(db, userId)` | Todos os registros, `day` desc |
| `upsertWeight(db, userId, { day, grams })` | Insere ou atualiza o dia (`onConflictDoUpdate`) |
| `updateWeight(db, userId, id, { day?, grams? })` | Edita; mover para um dia já ocupado devolve a sentinela `"day_taken"` |
| `deleteWeight(db, userId, id)` | Remove |

**Conflito na edição:** o `POST` substituir o peso do dia é o esperado ("estou registrando hoje de
novo"). Já mover um registro para uma data que já tem peso apagaria outro dado silenciosamente —
por isso `updateWeight` recusa. O erro de domínio volta como sentinela de string e a rota traduz
para HTTP, como `createExam` já faz com `"missing_schedule"`; aqui a rota responde
`conflict("já existe peso registrado nessa data")` (helper de `server/shared/api.ts`).

**Validação** (zod, na rota): `grams` inteiro entre 20 000 e 300 000 (20–300 kg); `day` no formato
`DAY_SCHEMA` e **nunca no futuro** (pesar amanhã não existe). `day` ausente no `POST` assume
`dayFor()` de `server/shared/day.ts` — nunca recalcular fuso em outro lugar (ADR-0002).

### Rotas (wrappers finos, ADR-0001)

- `GET /api/weights` → `{ weights: WeightLog[] }`
- `POST /api/weights` → body `{ grams, day? }` → 201 `{ weight }`
- `PATCH /api/weights/[id]` → body `{ grams?, day? }` → `{ weight }` · 404 · 409
- `DELETE /api/weights/[id]` → `{ ok: true }` · 404

Formatos seguindo o que as rotas de exame/consulta já devolvem (lista nomeada no `GET`, recurso
nomeado no `POST`/`PATCH`, `{ ok: true }` no `DELETE` — não 204).

Tipo `WeightLog = { id: string; grams: number; day: string; createdAt: string }` em
`apps/web/src/lib/api-types.ts`.

### Derivações no cliente

O `GET` traz a lista inteira e todo o resto é derivado em funções puras. Volume máximo realista:
365 registros/ano — filtrar 30d/3m/1a no cliente troca o período **sem refetch** e mantém o
serviço raso. As derivações vivem em `saude/hooks/peso-helpers.ts`, testáveis sem banco:

- `formatKg(grams)` → `"64,2"` (vírgula decimal, uma casa)
- `deltaFrom(current, previous)` → gramas com sinal, `null` no primeiro registro
- `filterPeriod(weights, period)` → recorte de 30d / 3m / 1a
- `groupByMonth(weights)` → `[{ label: "Julho 2026", saldo: -200, items: [...] }]`, mês desc
- `chartSeries(weights)` → pontos `{ day, kg }` em ordem crescente para o recharts

## UI

### Tela Saúde

`saude/page.tsx` ganha `<PesoSection />` como último bloco. Novos componentes em
`saude/components/`:

**`PesoSection.tsx`** — o card (~150px):
- header: chip lilás com `Scales` (Phosphor, Fill) + "Peso" + chips de período à direita
- linha do valor: peso atual grande (Quicksand) + variação neutra + botão "+" redondo lilás
- faixa de gráfico (~43px)
- rodapé: "N registros" + "Ver todos ›"

**`PesoChart.tsx`** — wrapper do `ChartContainer` + `AreaChart` do recharts, com gradiente lilás,
`type="linear"` (traço reto: honesto com pesagens espaçadas — curva suave inventaria movimento
entre medições distantes de semanas) e tooltip mostrando `"65,2 kg"` + data.

**`PesoModal.tsx`** — bottom sheet "Registrar peso" (`tone="lilac"`):
- `Stepper` em gramas, `step={100}`, exibindo kg; **tocar no número abre o teclado decimal**
- valor inicial = último peso registrado; sem histórico, o campo nasce vazio pedindo o número
  (em vez de chutar um 70,0 kg)
- data pré-preenchida com hoje; tocar abre o `DatePickerField` já usado nos modais da Saúde
- botão "Registrar" lilás

**`PesoHistorySheet.tsx`** — bottom sheet "Histórico de peso":
- cabeçalho por mês ("Julho 2026") com o saldo do período à direita, em lilás
- linhas: data por extenso + peso + variação vs. pesagem anterior
- cada linha é um `SwipeableRow` (editar reabre o `PesoModal`; excluir remove)
- vazio: "Nada por aqui ainda." no card tracejado do padrão

Hook `saude/hooks/usePeso.ts`: fetch via `useResource`, mutações pelo `api` com `toastError`
(atualização otimista com rollback na edição/exclusão, refetch após registrar — como `useExames`
faz), e o período selecionado. A tela só renderiza (convenção de `apps/web/CLAUDE.md`).

### Estados de borda do card

| Estado | O que mostra |
| ------ | ------------ |
| Nenhum registro | "Nenhum peso registrado" + "Quando quiser acompanhar, é só registrar." + botão. Sem gráfico, sem chips, sem número zerado |
| Um único registro | O valor, sem variação, sem gráfico: "a tendência aparece no segundo registro" |
| Período sem pesagens (mas há histórico) | Último peso conhecido + "nenhuma pesagem nos últimos 30 dias · última em 3 de agosto" |

Todos os textos são convite, nunca cobrança.

### Alterações fora da pasta da tela

**`apps/web/src/components/stepper.tsx`** — ganha duas capacidades opcionais, sem quebrar os usos
atual (o único call site é o `WaterModal`): `format?: (value: number) => string` para exibir o valor formatado, e
número editável que abre entrada decimal e devolve o valor na unidade interna. ~20 linhas.

**`packages/ui`** — adicionar o `chart` do shadcn (style `base-lyra`):
- `recharts@3.8.0` entra em `workspaces.catalog` no `package.json` da raiz; `packages/ui` referencia
  `"catalog:"` (CLAUDE.md — nunca versão solta no package)
- `packages/ui/src/components/chart.tsx` é arquivo gerado pelo shadcn, fica como veio
- `packages/ui/src/styles/globals.css` ganha as vars `--chart-1…5` (hoje inexistentes) nos tokens
  Bloomy: `--chart-1` = lilás `#A78BD0`; as demais seguem rosa/verde/coral do design system

## Testes

`apps/web/src/server/health/weight.test.ts`:
- `upsertWeight` no mesmo dia substitui em vez de duplicar
- `updateWeight` movendo para dia ocupado → conflito
- `listWeights` ordenado por `day` desc e isolado por usuário
- `deleteWeight` de outro usuário não remove nada

`apps/web/src/app/(app)/saude/hooks/peso-helpers.test.ts`:
- `formatKg`: 64200 → `"64,2"`; 65000 → `"65,0"` (não `"65"`)
- `deltaFrom`: `null` no primeiro registro; sinal correto nos demais
- `groupByMonth`: meses em ordem desc, saldo = último menos primeiro do mês
- `filterPeriod`: limites de 30d/3m/1a, e período vazio com histórico existente

## Fora de escopo

Deliberadamente ausentes, cada um por um motivo:

- **Meta de peso** — `goal` tem domínios por área, mas alvo de peso é exatamente a cobrança que o
  produto evita
- **Card no Hoje, pendência e lembrete de pesagem** — a intenção é ocasional, não ritual
- **Outras medidas corporais** (altura, circunferências, % de gordura) — a tabela nasce específica
  (`weight_log`); se um dia vierem outras medidas, isso vira uma modelagem de medidas própria
- **Peso medido em consulta** — nenhum vínculo com `appointment`
- **Exportação / peso no PDF do treino** (issue #10)

## Pendências de documentação

Ao implementar, atualizar `apps/web/CONTEXT.md` com os termos do domínio: **Pesagem** (o registro
de peso de um dia; um por dia, o mais recente substitui) e **Variação** (diferença em relação à
pesagem anterior — sempre neutra, nunca ganho/perda com juízo de valor).
