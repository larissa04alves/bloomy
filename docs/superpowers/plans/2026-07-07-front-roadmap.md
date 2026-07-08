# Front-end do Bloomy — Roadmap por telas

> **Contexto:** o back-end está 100% pronto (fases 1 e 2 — todas as rotas REST em
> `apps/web/src/app/api/**` + serviços em `apps/web/src/server/**`). O front-end
> está no zero (`layout.tsx` com `<h1>teste</h1>`, `page.tsx` default, `globals.css`
> com tokens cinza do shadcn + dark mode). Este roadmap fatia o front em **8 fases**
> (F3→F10); cada fase entrega **telas funcionando de ponta a ponta** contra a API que
> já existe. Autoridade visual: `DESIGN.md` (raiz) + `docs/README.md` + protótipos
> `docs/Diario App*.html`. Autoridade de produto: `PRODUCT.md`.

**Regra de entrega:** o plano detalhado (tarefas TDD, passo a passo) é escrito **uma
fase por vez**, no momento de executar — como foi feito nas fases 1 e 2. Este arquivo é
o mapa; o detalhamento de cada fase vira um `2026-..-faseN-front-*.md` próprio.

## Princípios que valem para todas as fases

- **Fidelidade ao handoff.** Cores, tipografia, raios, espaçamentos e sombras se
  recriam fielmente do `DESIGN.md` — não se reinterpretam (Design Principle 4).
- **Uma cor por domínio.** Lilás = geral/água, verde = alimentação, rosa =
  treino/mente, coral = remédios — em chip, tint e botão de modal, sem exceção.
- **Regra do Sem-Vermelho.** Pendência é neutra (tracejado + tinta suave); nunca
  alerta vermelho. Erro de formulário usa coral profundo `#C76E93`.
- **Bottom sheet, nunca modal centrado.** Todo fluxo de "adicionar" é um sheet
  ancorado embaixo, com botão primário na cor do domínio.
- **Telas PT sem lógica no `.tsx`** (`apps/web/CLAUDE.md`): `page.tsx` só renderiza;
  fetch/estado/handlers moram em `hooks/use<Tela>.ts`. Telas nascem com skeleton.
- **`prefers-reduced-motion`** respeitado em toda transição; tap target ≥44px;
  contraste AA em corpo de leitura (escurecer `#8A82A0`→`~#6F6787` onde necessário).
- **Verificação visual real** encerra cada fase: `bun check-types` + render no dev
  server (porta 3001) — `check-types` verde ≠ UI funcionando.

## Sequência das fases

| Fase | Tela(s) | Entregável | APIs consumidas |
|---|---|---|---|
| **F3** | Fundação & App Shell | tokens Bloomy, fontes, Phosphor, primitivos reusáveis, coluna mobile sobre o board, tab bar de 5 abas, 5 rotas skeleton, client REST + `useResource`, auth-gate (redirect p/ `/login` stub) | — |
| **F4** | Corpo (+ modais água/refeição/remédio) | resumo 3 colunas, gotas de hidratação, lista de refeições, remédios do dia — tudo interativo | `water`, `meals`, `medications`, `intakes` |
| **F5** | Treino (+ modal treino) | lista + streak da semana; **treino em andamento** (máquina de estados `lista→ex→fim` + timer de descanso) | `workouts`, `workouts/summary`, `sessions` |
| **F6** | Mente | check-in de humor, slider de ansiedade, mini-diário, lista de registros | `checkins`, `checkins/history` |
| **F7** | Saúde (+ modais consulta/exame) | consultas, exames (com ciclo de retorno), agenda de remédios | `appointments`, `exams`, `medications` |
| **F8** | Gestão | Minhas metas (anel de progresso), Lembretes (toggles), tela de notificações (visual) | `goals`, `reminders`, `profile` |
| **F9** | **Home** (penúltima) | saudação + avatar, mood tiles, grid 2×2 de rituais, próxima consulta — a tela de ~90% do uso, pura composição dos primitivos e leituras já provados | `checkins`, `goals`, `water`, `meals`, `medications`, `appointments/next` |
| **F10** | Onboarding + **Login** (última) | login Google + e-mail (better-auth); onboarding em 3 passos que grava metas e conclui o perfil | `profile`, `goals`, auth |

**Por que esta ordem:** Corpo primeiro estabelece o vocabulário de card-de-domínio +
bottom sheet que todas as outras abas reusam. Home é penúltima porque **agrega leituras
de todos os domínios** e reusa mood tiles + card de ritual — nasce como composição de
peças já prontas e testadas. Login é a última a pedido do produto (o app é usável em
dev com sessão de teste; a porta de entrada real fecha por último).

## Dependências e pendências conhecidas

- **F3 instala** `@phosphor-icons/react` (hoje só há `lucide-react`) e adiciona
  Quicksand/Nunito via `next/font`; remove o dark mode do `globals.css` (produto é
  light-only por ora — `PRODUCT.md`).
- **F10 depende de configurar o provider Google no `packages/auth`** — hoje o
  `createAuth()` só habilita `emailAndPassword`. O botão "Continuar com Google" do
  `docs/README.md §7` exige `socialProviders.google` + envs
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Tratar como primeira tarefa da F10 (ou
  degradar o botão para "em breve" se as credenciais não existirem no ambiente).
- **Wordmark:** os protótipos usam "Diário" como placeholder; o nome real é **Bloomy**
  (`PRODUCT.md`) — usar "Bloomy" em login/onboarding mantendo o visual.
- **Rótulo da aba inicial:** "**Home**" (decisão do produto nesta rodada; substitui o
  "Hoje" do handoff). Rota `/home`, ícone `house`.

## Estado ao fim de cada fase (checklist de aceitação resumido)

- **F3:** abre em `/` → gate redireciona; com sessão de teste, navega pelas 5 abas
  (skeletons), tab bar destaca a ativa, fundo/board/fontes/raios já são Bloomy.
- **F4:** registrar água/refeição/remédio pelo modal reflete na tela sem reload manual.
- **F5:** iniciar treino → marcar série → timer de descanso → concluir → resumo.
- **F6:** salvar humor/ansiedade/nota persiste e aparece na lista de registros.
- **F7:** criar consulta/exame; concluir com "precisa retorno" gera follow-up.
- **F8:** editar meta muda o alvo; toggle de lembrete persiste `enabled`.
- **F9:** Home reflete o dia real (copos, refeições, remédios, humor, próxima consulta).
- **F10:** entrar por Google/e-mail; primeiro acesso passa pelo onboarding e cai na Home.
