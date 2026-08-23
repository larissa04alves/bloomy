# Tela de metas + dropdown do perfil — design

Branch: `feat/criar-metas`
Data: 2026-08-22
Design de referência: `docs/Diario App.dc.html` (artboard `Metas`, offset 104490) · `docs/README.md:135-137`

## Problema

O item **Metas** do dropdown do perfil está `disabled` com badge "em breve" desde a Tela Hoje
(`2026-08-04-tela-hoje-design.md`, decisão 10) — a tela nunca foi feita. O back-end de metas já
existe inteiro (`goal`, `GET /api/goals`, `PUT /api/goals/[id]`), mas os alvos só podem ser
alterados escrevendo no banco.

Dois defeitos vieram junto na conversa:

1. O **dropdown do perfil** está com o visual cru do shadcn — não recebeu os tokens do sistema.
2. A hidratação fala em **garrafas de 500 ml**, uma constante hardcoded
   (`GARRAFA_ML`, `lib/api-types.ts:56`) que ninguém pode ajustar. Quem bebe em copo de 250 ml
   vê o app contar errado. O `WaterModal` já se contradiz hoje: chama 750 ml de "Garrafa"
   enquanto a constante é 500.

## Enquadramento

A tela de Metas **não é um domínio** — é um painel de configuração sobre um domínio que já
existe. Não cria dado novo; só edita `goal.target` e um campo novo de `profile`.

Decisão de escopo que define tudo o mais: **a tela mostra alvos, não progresso.** O anel de 82%
da semana, as barras de "hoje 5/8", as bolinhas de dias e o streak que aparecem no mockup ficam
fora. O progresso já vive na Hoje, na Corpo, no Treino e na Mente; repeti-lo aqui exigiria uma
agregação semanal cross-domínio que não existe no servidor e duplicaria a leitura mais cara do
app. O painel responde a uma pergunta só: *quais são meus alvos e como eu mudo?*

Disso decorre um critério de admissão: **um card só entra se tiver alvo numérico editável E um
consumidor real na UI.** Ele elimina Remédios (o alvo é a agenda, não um número) e a meta de
mente (nenhuma tela a lê).

## Decisões

1. **Só alvos, sem progresso.** Nenhum anel, barra, bolinha ou streak na tela de Metas. Cada
   card mostra ícone, nome, "Meta: …" e a pill de ajuste. Isso reduz a tela ao que o back-end
   já sustenta e evita que a Metas vire uma segunda Hoje pior.

2. **Três cards: Hidratação, Alimentação, Treino.** São as três metas que passam no critério de
   admissão. Remédios sai (sem alvo numérico). "Nova meta" sai (metas custom exigem domain de
   texto livre, ícone, unidade e uma fonte de progresso genérica — é outra feature).

3. **A meta de `mind` é removida do código e do banco.** `ensureGoals` a cria para todo usuário
   desde sempre e nenhuma tela a lê. Sai de `DEFAULT_GOALS`, uma migration apaga as linhas e
   `GoalDomain` encolhe para `"water" | "meals" | "workout"` — assim o TypeScript aponta
   qualquer referência esquecida em vez de deixar estado morto. Reversível: se a Mente ganhar
   meta um dia, é uma linha de volta no array.

4. **Toda a hidratação passa a falar em ml — na Metas, na Corpo e na Hoje.** "Garrafa" some do
   vocabulário. Isso **revoga a decisão 5 da spec da Tela Hoje** ("água em garrafas de 500 ml,
   não copos"), que resolvia a inconsistência escolhendo um recipiente; com a porção
   configurável, nomear recipiente volta a mentir. ml é a única unidade que continua verdadeira
   em qualquer configuração.

5. **A porção vira `profile.waterPortionMl`, não um campo do `goal`.** Quanto cabe num gole é
   preferência de comportamento do app — mesma natureza de `restSeconds` e `autoRest`, que já
   moram em `profile`. Pôr no `goal` sujaria a tabela genérica com uma coluna que 2 de 3 linhas
   ignoram e daria forma variável por domínio ao `PUT /api/goals/[id]`.

6. **As gotinhas da Corpo ficam, com contagem derivada.** `meta ÷ porção` define quantas gotas
   desenhar; o texto ao lado é `"1500 de 2000 ml"`. A pendência em tracejado é o elemento que o
   `DESIGN.md` chama de "pendência neutra" — o pedido foi trocar o vocabulário, não matar o
   visual. **Acima de 12 gotas** (ex.: meta 3000 com porção 200) o componente cai para uma barra
   de progresso: 15 gotas numa coluna de 342 px viram ruído.

7. **No anel da Hoje, a água entra como porções — só por dentro.** `dayProgress` continua
   somando unidades comparáveis (porções + refeições + remédios + treino); a divisão por
   `portionMl` vira detalhe interno. Sem isso, somar `1500` com `3 refeições` explodiria a
   conta. Nada disso aparece na tela: o rótulo segue "N de M metas".

8. **Pill com lápis abre bottom sheet com stepper.** Um `PUT` por confirmação em vez de um por
   toque no `+`, espaço para explicar a unidade, e alvo de toque grande. `BottomSheet` e
   `Stepper` já existem e o `Stepper` já suporta digitar o valor (`parse`), o que cobre saltos
   grandes sem precisar de input dedicado.

9. **Hidratação usa uma pill só, com dois campos na sheet.** A pill mostra a meta do dia
   (`2000 ml`); a sheet traz *Meta do dia* e *Cada porção*, com a linha viva "≈ 4 porções por
   dia" reagindo aos dois. Duas pills no card quebrariam a simetria com os outros dois numa
   linha de 342 px.

10. **Rota `(app)/metas`.** TabBar visível (como no mockup), guard de sessão herdado do
    `(app)/layout.tsx`, URL linkável, back → `/home`. Mesmo padrão das cinco telas existentes.

11. **Limites são contrato, passos são UI.** O range é validado no zod da rota; o passo do
    stepper existe só para o toque. Água 500–5000 ml (passo 100), porção 100–1000 ml (passo 50),
    refeições 1–8 por dia, treino 1–7 dias por semana.

12. **Dropdown vestido, não reescrito.** O `DropdownMenu` do shadcn fica: foco, teclado e o
    `signOut` com tratamento de erro já funcionam e estão em produção. O que muda é visual —
    tokens, ícones e um header com o nome. Trocar por bottom sheet jogaria fora comportamento
    testado por ganho estético discutível.

13. **Três etapas, nesta ordem.** Dropdown → refactor de ml → tela de Metas. A ordem não é
    estética: a tela de Metas edita `waterPortionMl`, que só existe depois da etapa 2. Entregar
    a tela antes significaria a pessoa configurar 250 ml e a Corpo continuar somando 500 — um
    bug entregue de propósito.

## Etapa 1 — Dropdown do perfil

Arquivo único: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx`.

- Largura `w-56` (~224px), `rounded-card`, `shadow-card`, borda `hairline`.
- Header: nome da pessoa em `font-display font-bold text-ink`, `text-sm`, truncado em uma linha,
  seguido de `DropdownMenuSeparator`. Com `name === null` (sessão sem nome), **o header e o
  separador não são renderizados** — o menu volta a começar direto pelos itens, em vez de exibir
  uma linha vazia.
- Itens com ícone Phosphor à esquerda (`size={18}`), texto `text-sm font-semibold`, hover
  `bg-lilac-tint-soft`, `rounded-control`:
  - **Metas** — `TargetIcon`, continua `disabled` com badge "em breve" **nesta etapa**
  - **Notificações** — `BellIcon`, continua `disabled` com badge "em breve"
  - **Sair** — `SignOutIcon`, `text-coral`, mantém a lógica de `signOut` intacta
- `PerfilMenu` recebe `name` como hoje; nenhuma mudança de contrato.

**O item "Metas" só é ativado na etapa 3**, quando a rota passa a existir: vira `asChild` +
`<Link href="/metas">` e perde o `disabled` e o badge. Ativá-lo agora deixaria o app linkando
para um 404 por duas etapas — e o acesso à tela continua sendo pelo dropdown, como hoje.

## Etapa 2 — ml em toda a UI + porção configurável

### Banco

```sql
ALTER TABLE profile ADD COLUMN water_portion_ml integer DEFAULT 500 NOT NULL;
```

Gerada por `bun db:generate` a partir de `packages/db/src/schema/profile.ts`.

### Servidor

| Arquivo | Mudança |
|---|---|
| `schema/profile.ts` | `waterPortionMl: integer("water_portion_ml").default(500).notNull()` |
| `server/profile/service.ts` | `ProfileUpdate` ganha `waterPortionMl?: number`; `updateProfile` propaga |
| `api/profile/route.ts` | `PATCH_SCHEMA` ganha `waterPortionMl: z.number().int().min(100).max(1000).optional()` |
| `server/shared/units.ts` | `garrafas(totalMl, goalMl)` → `portions(totalMl, goalMl, portionMl)` |
| `lib/api-types.ts` | `GARRAFA_ML` → `DEFAULT_PORTION_ML = 500` (agora só fallback de `waterPortionMl`) |
| `server/today/service.ts` | lê `ensureProfile` no `Promise.all` e passa `waterPortionMl` para `portions()` |

```ts
/** Porções feitas/alvo a partir de ml. Alvo mínimo 1; done nunca passa do alvo. */
export function portions(
  totalMl: number,
  goalMl: number,
  portionMl: number,
): { done: number; target: number } {
  const size = portionMl > 0 ? portionMl : DEFAULT_PORTION_ML;
  const target = Math.max(1, Math.round(goalMl / size));
  const done = Math.min(target, Math.round(totalMl / size));
  return { done, target };
}
```

`portionMl` cai no default se vier `0` — divisão por zero produziria `Infinity` e quebraria o
render das gotas. O zod já barra `0` na borda; a guarda existe porque a função é pura e
reutilizável.

### Contrato

`TodayPayload.water` deixa de ser só a contagem:

```ts
water: {
  totalMl: number;   // quanto foi bebido hoje
  goalMl: number;    // a meta do dia
  done: number;      // porções feitas   — derivado, para as gotas e o anel
  target: number;    // porções na meta  — derivado
}
```

Os dois campos derivados continuam no payload em vez de serem calculados no client: o anel da
Hoje e as gotas da Corpo precisam do mesmo arredondamento, e ele já é testado no servidor.

### Front

| Arquivo | Mudança |
|---|---|
| `HidratacaoSection.tsx` | texto vira `"{totalMl} de {goalMl} ml"`; gotas até 12, barra acima disso; prop `onAddGarrafa` → `onAddPortion` |
| `corpo/page.tsx` | botão adiciona `waterPortionMl` (não `GARRAFA_ML`); rótulo `"+{portionMl} ml"` |
| `corpo/hooks/useGoals.ts` | busca `/api/goals` **e** `/api/profile`; devolve `{ waterGoalMl, mealsTarget, waterPortionMl }` |
| `corpo/hooks/useHidratacao.ts` | recebe `portionMl` e repassa a `portions()` |
| `WaterModal.tsx` | `SHORTCUT_LABELS` perde o rótulo `"Garrafa"` do 750 — todos viram número puro |
| `RituaisGrid.tsx` | subtítulo `"{totalMl} de {goalMl} ml"` |
| `ResumoCard.tsx` | rótulo `"garrafas"` → `"ml"` |
| `home/hooks/format.ts` | `dayProgress` usa `water.done`/`water.target` (já derivados) — comentário atualizado |

O rename é guiado pelo compilador: trocar o nome de `garrafas` e de `GARRAFA_ML` quebra o build
em todos os pontos de uso, então não há como esquecer um.

## Etapa 3 — Tela `/metas`

### Servidor

```ts
// server/goals/service.ts
export const GOAL_LIMITS = {
  water:   { min: 500, max: 5000, step: 100 },
  meals:   { min: 1,   max: 8,    step: 1 },
  workout: { min: 1,   max: 7,    step: 1 },
} as const;
```

`DEFAULT_GOALS` perde a linha de `mind`. `schema/goals.ts` restringe
`domain` a `"water" | "meals" | "workout"`.

Migration manual (drizzle-kit gera DDL, não DML — precedente:
`0013_rename_status_awaiting_result.sql`):

```sql
DELETE FROM goal WHERE domain = 'mind';
```

`updateGoal` passa a validar contra o limite do domínio do próprio registro, porque o range
depende do domínio e o handler só recebe um `id`:

```ts
export type UpdateGoalResult =
  | { ok: true; goal: Goal }
  | { ok: false; reason: "not_found" | "out_of_range" };
```

O handler mapeia `not_found` → 404 e `out_of_range` → 422. Sem isso, um `PUT` com `target: 90000`
passaria: o zod da rota hoje só exige `int().positive()`, e ele não pode saber o domínio antes
de ler a linha.

### Front

```
app/(app)/metas/
  page.tsx                 # header (back + "Minhas metas") + lista de cards
  hooks/useMetas.ts        # GET /api/goals + /api/profile; PUT/PATCH otimistas
  hooks/format.ts          # rótulos "Meta: …" por domínio  (puro, testável)
  components/MetaCard.tsx  # chip de ícone + nome + "Meta: …" + pill (valor + pencil)
  components/MetaSheet.tsx # BottomSheet + N steppers + botão Salvar
```

`MetaSheet` recebe uma lista de campos, não um valor:

```ts
type SheetField = {
  label: string;      // "Meta do dia" | "Cada porção" | "Refeições por dia" | …
  value: number;
  min: number; max: number; step: number;
  unit?: string;      // "ml" · undefined para contagens
};
```

Hidratação passa dois campos e um `hint` calculado (`"≈ 4 porções por dia"`); Alimentação e
Treino passam um. Um componente só, sem sheet especial para água.

Os cards, por domínio:

| Card | Ícone / tone | Linha "Meta:" | Sheet |
|---|---|---|---|
| Hidratação | `Drop` / lilás | "2000 ml por dia" | *Meta do dia* 500–5000 (100) · *Cada porção* 100–1000 (50) |
| Alimentação | `ForkKnife` / verde | "3 refeições por dia" | *Refeições por dia* 1–8 |
| Treino | `Barbell` / rosa | "4 dias por semana" | *Dias por semana* 1–7 |

Salvar segue a convenção do `useHidratacao`: atualização otimista, rollback do estado anterior
em falha, `toastError` com mensagem em PT. A sheet fecha no toque em Salvar — o erro chega por
toast, não prendendo a pessoa numa sheet aberta.

Fecha a etapa 1: com a rota existindo, o item **Metas** do `PerfilMenu` perde o `disabled` e o
badge "em breve" e vira `asChild` + `<Link href="/metas">`.

## Estados

- **Carregando** — skeleton dos 3 cards (mesmo padrão de `HomeSkeleton`).
- **Erro de leitura** — bloco de erro com "Tentar de novo", como `HomeError`.
- **Vazio** — não existe: `ensureGoals` garante as 3 metas no primeiro `GET`.
- **Fora de faixa** — o `Stepper` desabilita `−`/`+` nos extremos e recusa digitação fora do
  range (comportamento que ele já tem); o 422 do servidor é rede de segurança, não fluxo normal.

## Testes

| Arquivo | Cobre |
|---|---|
| `server/shared/units.test.ts` | `portions()` com porção 250 / 500 / 100; arredondamento; `target` mínimo 1; `done` limitado ao alvo; `portionMl = 0` cai no default |
| `home/hooks/format.test.ts` | `dayProgress` com porção diferente de 500 (hoje o teste assume 4 garrafas) |
| `server/goals/service.test.ts` *(novo)* | `updateGoal`: sucesso, `not_found` por id inexistente, `not_found` por goal de outro usuário, `out_of_range` por domínio; `ensureGoals` já não cria `mind` |
| `metas/hooks/format.test.ts` *(novo)* | rótulo "Meta: …" por domínio; cálculo de "≈ N porções por dia" |

Testes de componente não entram — a convenção do repo é testar helpers e hooks puros
(`saude/hooks/format.test.ts`, `treino/hooks/session.test.ts`).

## Verificação

1. `bun check-types` e `bun test` limpos.
2. `bun db:generate` + `bun db:migrate` (nunca `db:push` — `packages/db/CLAUDE.md`) e conferir
   no `bun db:studio` que `goal` não tem mais linha `mind` e que `profile` tem
   `water_portion_ml`.
3. **Visual real, com o dev server rodando** (`check-types` verde não prova UI):
   - `/home` — dropdown vestido, nome no header, "Metas" navegando
   - `/metas` — os 3 cards, cada sheet abrindo, salvando e refletindo na pill
   - `/corpo` — texto em ml, gotas na contagem certa, botão somando a porção configurada
   - configurar porção 250 na Metas e conferir que a Corpo e a Hoje respondem

## Fora de escopo

- Anel de resumo semanal e qualquer indicador de progresso na tela de Metas
- Botão "Nova meta" / metas customizadas
- Card de Remédios
- Meta de check-in da mente (removida, não adiada — ver decisão 3)
- Tela de Notificações (segue "em breve" no dropdown)
