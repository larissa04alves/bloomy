# Front-end do Bloomy — Design & fatiamento por telas

**Status:** aprovado no brainstorming (2026-07-07). Este documento é a autoridade de
**arquitetura de front e fatiamento**. A autoridade **visual** é `DESIGN.md` (raiz) +
`docs/README.md` + protótipos `docs/Diario App*.html`; a de **produto** é `PRODUCT.md`.

## Contexto

O back-end está 100% pronto (fases 1 e 2): todas as rotas REST em
`apps/web/src/app/api/**` e serviços em `apps/web/src/server/**`. O front-end está no
zero (`layout.tsx` placeholder, `page.tsx` default, `globals.css` com tokens cinza do
shadcn + dark mode). O objetivo é construir o front **por telas**, cada fase entregando
telas funcionando ponta-a-ponta contra a API existente, com **login por último**.

O visual é hi-fi e final — recria-se fielmente, não se reinterpreta (Design Principle 4).
Este spec só decide o que os docs de visual/produto **não** cobrem: a arquitetura de
dados/estado no cliente, a estrutura de arquivos e o sequenciamento das fases.

## Decisões de arquitetura (brainstorming)

### D1 — Camada de dados: `fetch` + hook caseiro
Sem lib de cache (nada de TanStack Query). `apps/web/src/lib/api.ts` é um client `fetch`
tipado que lança `ApiError(status, message)` — a `message` vem do `{ error }` padrão do
back. O hook `useResource(fetcher)` retorna `{ data, loading, error, reload, setData }`,
busca no mount e reexpõe `reload()` para re-buscar após mutação. Justificativa: o app é
~8 telas, o back já é REST fino, e cache global pagaria um custo sem retorno.

### D2 — Mutação: híbrido por caso
- **Otimista + reconcilia** nas ações de 1 toque de alta frequência: adicionar copo,
  marcar/desmarcar remédio, marcar série, registrar humor. A UI muda na hora via
  `setData`; a resposta reconcilia; em falha, reverte e mostra toast de erro.
- **Pending → `reload()`** nos modais de criação (refeição, remédio, consulta, treino),
  onde um micro-atraso é aceitável e a consistência com o servidor vale mais.

### D3 — Formulários dos modais: `@tanstack/react-form`
Os 5 bottom sheets de criação usam `@tanstack/react-form` (já instalado), com validação
`zod` no submit espelhando o shape do back. Uniformiza toque/erro/submit e cobre bem a
lista dinâmica de exercícios do modal de treino.

### D4 — Feedback: `sonner` só para erro
`sonner` (já instalado) exibe **apenas erro** — toast na cor coral (`#C77E93`), nunca
vermelho (Regra do Sem-Vermelho). A estilização vem por opção no call-site, sem editar o
`sonner.tsx`. "Celebrar" é **inline** na tela (barra de progresso, streak, check verde),
nunca um toast de parabéns (anti-gamificação punitiva do `PRODUCT.md`).

### D5 — Componentes shadcn são imutáveis
Os arquivos em `packages/ui/src/components/*` gerados pelo shadcn **nunca são editados**.
A gente **adiciona** (`bunx shadcn@latest add <item>` dentro de `packages/ui/`) e
**consome**. O look Bloomy sai por duas vias sancionadas:
1. **Tokens no `packages/ui/src/styles/globals.css`** (é `styles`, não `components`; a
   re-tokenização já é tarefa listada no `packages/ui/CLAUDE.md`) — faz `button`,
   `input`, `textarea`, etc. nascerem Bloomy sem tocá-los.
2. **Wrappers próprios** (arquivos nossos) que compõem o primitivo shadcn via `className`.

Consequência concreta: o **`BottomSheet` é componente nosso** em
`packages/ui/src/components/bottom-sheet.tsx` construído **direto sobre `vaul`**
(dependência direta), com controle total do grabber (40×5 `control-off`), raio de topo
28px, overlay `rgba(43,38,64,.42)` e `shadow-sheet` — **sem** gerar nem depender do
`drawer.tsx` do shadcn. Assim nenhum arquivo shadcn é tocado.

## Estrutura de arquivos

- **Primitivos reusáveis (globais)** → `apps/web/src/components/*` (arquivos nossos):
  `IconChip`, `MoodTiles`, `Stepper`, `ToggleSwitch`, `ChoiceChip`, `ProgressBar`,
  `BottomSheet`, `RitualCard`. Tom por domínio via `apps/web/src/lib/tone.ts` (mapa
  estático de classes). `packages/ui/src/components/*` é **só** dos arquivos que o
  shadcn gera — nada autoral lá; `cn` e os tokens (`globals.css`) continuam em
  `@bloomy/ui`. Componente específico de uma tela vai na `components/` dessa tela.
- **Telas** → `apps/web/src/app/(app)/<tela>/page.tsx` (só renderiza) +
  `hooks/use<Tela>.ts` (fetch/estado/handlers), conforme `apps/web/CLAUDE.md`.
- **Estrutura do app** → `apps/web/src/components/` (`tab-bar.tsx`, `screen.tsx`) +
  `app/(app)/layout.tsx` (server component: auth-gate + tab bar). `/login` e
  `/onboarding` ficam **fora** do grupo `(app)` — sem tab bar, sem gate.
- **Client de dados** → `apps/web/src/lib/api.ts` + `apps/web/src/lib/use-resource.ts`.

## Convenções transversais

- Skeleton de carregamento derivado de `useResource.loading`.
- `prefers-reduced-motion` respeitado em toda transição (crossfade/corte seco).
- Tap target ≥44px; contraste AA — escurecer `#8A82A0`→`~#6F6787` (`ink-read`) em corpo
  pequeno de leitura.
- Uma cor por domínio (lilás geral/água · verde alimentação · rosa treino/mente · coral
  remédios) em chip, tint e botão de modal.
- Bottom sheet ancorado embaixo, nunca modal centrado; botão primário na cor do domínio.
- Pendência é neutra (card tracejado + tinta suave), nunca vermelha.
- UI em PT-BR; wordmark **Bloomy** (protótipos usam "Diário" como placeholder).

## Sessão em dev (login é o último)

As telas F4–F9 vivem sob o `(app)/layout.tsx`. **Durante F3–F9 o auth-gate fica
desligado** (marcado com `TODO(F10)` no layout) para permitir navegar as telas em dev sem
sessão — a **F10 reativa o gate** quando o login real existir. Para ver **dados reais**
nas telas gated (F4+ chamam `/api`, que exige sessão → 401 sem ela), cria-se uma sessão de
teste pelo endpoint que já existe (`POST /api/auth/sign-up/email`) e reusa-se o cookie.
**A F10 depende de configurar o provider Google no `packages/auth`** — hoje o `createAuth()` só
habilita `emailAndPassword`; o botão "Continuar com Google" exige `socialProviders.google`
+ envs `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (primeira tarefa da F10, ou degradar o
botão para "em breve" se as credenciais não existirem no ambiente).

## Fatiamento por fases

Cada fase é detalhada em seu próprio plano (`docs/superpowers/plans/…-faseN-front-*.md`),
escrito no momento de executar. Cada fase entrega telas funcionando e encerra com
**verificação visual real** no dev server (porta 3001) — `bun check-types` verde não a
substitui.

| Fase | Tela(s) | Entregável | APIs |
|---|---|---|---|
| **F3** | Fundação & App Shell | tokens Bloomy, fontes (Quicksand/Nunito), Phosphor, primitivos, coluna sobre o board, tab bar de 5 abas, 5 rotas skeleton, `lib/api.ts`+`useResource`, auth-gate + `/login` stub | — |
| **F4** | Corpo (+ modais água/refeição/remédio) | resumo 3 col, gotas de hidratação, refeições, remédios do dia | `water`, `meals`, `medications`, `intakes` |
| **F5** | Treino (+ modal treino) | lista + streak; treino em andamento (máquina `lista→ex→fim` + timer) | `workouts`, `workouts/summary`, `sessions` |
| **F6** | Mente | check-in de humor, slider de ansiedade, mini-diário, histórico | `checkins`, `checkins/history` |
| **F7** | Saúde (+ modais consulta/exame) | consultas, exames (ciclo de retorno), agenda de remédios | `appointments`, `exams`, `medications` |
| **F8** | Gestão | Minhas metas (anel), Lembretes (toggles), notificações (visual) | `goals`, `reminders`, `profile` |
| **F9** | **Home** (penúltima) | saudação + avatar, mood tiles, grid 2×2 de rituais, próxima consulta | `checkins`, `goals`, `water`, `meals`, `medications`, `appointments/next` |
| **F10** | Onboarding + **Login** (última) | login Google + e-mail (better-auth); onboarding 3 passos que grava metas e conclui o perfil | `profile`, `goals`, auth |

**Ordem:** Corpo primeiro estabelece o vocabulário card-de-domínio + bottom sheet que as
outras abas reusam. Home é penúltima por **agregar leituras de todos os domínios** e
reusar mood tiles + card de ritual — nasce como composição de peças já provadas. Login é
o último a pedido do produto.

## Fora de escopo (YAGNI)

- Dark mode (produto é light por ora — `PRODUCT.md`).
- Layout desktop alternativo (é sempre a coluna mobile sobre o board).
- Lib de cache/estado global (D1), PWA offline/push real (a tela de notificações da F8 é
  visual; push com app fechado é extensão futura).
