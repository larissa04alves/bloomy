<div align="center">

<br>

# 🌸 Bloomy

### *Seu jardim de bolso — cuidar de você, todo dia.*

PWA mobile-first de **acompanhamento diário de bem-estar**:<br>
água 💧 · comida 🥗 · remédios 💊 · treino 🏋️ · humor 🧠 · agenda de saúde 🩺

**Cuidado que parece carinho, não prontuário.**

<br>

![Next.js](https://img.shields.io/badge/Next.js_16-A78BD0?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-8768BC?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-C76E9E?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-7FC4A0?style=for-the-badge&logo=tailwindcss&logoColor=white)

![Drizzle](https://img.shields.io/badge/Drizzle-4E9C74?style=for-the-badge&logo=drizzle&logoColor=white)
![Turso](https://img.shields.io/badge/Turso-C77E93?style=for-the-badge&logo=turso&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-A78BD0?style=for-the-badge&logo=bun&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-8768BC?style=for-the-badge&logo=turborepo&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-E08AB0?style=for-the-badge&logo=pwa&logoColor=white)

<br>

### [🌱 Abrir o app](https://bloomy.laridev.com) &nbsp;·&nbsp; [📖 Produto](PRODUCT.md) &nbsp;·&nbsp; [🎨 Design](DESIGN.md) &nbsp;·&nbsp; [🗺️ Handoff](docs/README.md) &nbsp;·&nbsp; [🧭 ADRs](docs/adr/)

</div>

---

## 🌼 A ideia

Um app pra quem quer acompanhar o próprio dia sem culpa e sem burocracia. Abrir, registrar em segundos, fechar — várias vezes por dia, do celular.

> **O princípio que estrutura tudo:** separar **o que se faz todo dia** (registrar, marcar, checar) **do que se gerencia de vez em quando** (cadastrar remédio, agendar consulta).

O que **não** é: painel clínico, dashboard de performance fitness, streak que envergonha. Sucesso aqui é o registro diário ser tão leve que vira hábito. 🌿

---

## 🧭 As 5 abas

| | Aba | O que mora ali |
|:--:|---|---|
| 🏠 | **Hoje** | O resumo gentil do dia — humor, grid de rituais (água, comida, treino, remédio) e a próxima consulta. É a tela aberta ~90% das vezes. |
| 💗 | **Corpo** | O físico do dia: hidratação em ml, refeições e remédios de hoje. |
| 🏋️ | **Treino** | Lista de treinos + treino em andamento (séries, carga, timer de descanso). |
| 🧠 | **Mente** | Check-in de humor e ansiedade + mini-diário, em linguagem acolhedora. |
| 🩺 | **Saúde** | A gestão: consultas, exames e a agenda de remédios cadastrados. |

### ✨ E mais

- 🎯 **Minhas metas** — alvo + progresso de cada ritual, com anel de resumo
- 🔔 **Lembretes** — notificações push (Web Push / VAPID) com varredura por cron
- 🌱 **Onboarding** — 3 passos curtos: água, refeições e dias de treino
- 🔑 **Login** — só Google, com um jardim que brota na tela de entrada

---

## 🎨 Cada domínio tem sua cor

A paleta é parte da navegação: a mesma cor acompanha o assunto em chips, tints e botões, em todas as telas.

| | Cor | Domínio | Hex |
|:--:|---|---|---|
| 💜 | Lilás | Geral e hidratação | `#A78BD0` |
| 💚 | Verdinho | Alimentação | `#A8D5BA` |
| 🩷 | Rosa | Treino | `#F3B6D0` |
| ❤️ | Coral | Remédios | `#C77E93` |

**Tipografia:** `Quicksand` nos títulos e números, `Nunito` no corpo. **Ícones:** Phosphor (peso Fill).
**Layout:** coluna mobile de ~420px, centrada — inclusive no desktop. Tema light, por ora.

> 🌸 **Celebrar, nunca cobrar.** Progresso é sempre o que foi feito ("5 de 8 copos"); pendência é neutra (card tracejado), nunca vermelha.

---

## 🧱 A stack

| Camada | Escolha |
|---|---|
| 🖥️ **App** | Next.js 16 (App Router) + React 19 · porta `3001` |
| 🎨 **UI** | Tailwind 4 + shadcn/ui compartilhado em `packages/ui` |
| 🗄️ **Banco** | Drizzle ORM + libsql/Turso |
| 🔐 **Auth** | better-auth (Google OAuth) |
| 📦 **Monorepo** | Turborepo + Bun workspaces (deps de catálogo na raiz) |
| 📱 **PWA** | manifest + service worker + Web Push |
| ☁️ **Deploy** | Vercel · arquivos de exame no Cloudflare R2 |

---

## 🚀 Começando

**Pré-requisitos:** [Bun](https://bun.sh) `1.3+` e uma conta [Turso](https://turso.tech) (ou o banco local).

```bash
# 1. Instalar dependências
bun install

# 2. Criar o apps/web/.env com as variáveis da tabela abaixo
$EDITOR apps/web/.env

# 3. Subir um libsql local (opcional — pule se usar Turso remoto)
bun db:local

# 4. Aplicar o schema no banco
bun db:push

# 5. Rodar 🌱
bun dev:web
```

Abra **[http://localhost:3001](http://localhost:3001)** e seja bem-vinda. 🌸

---

## 🔑 Variáveis de ambiente

Validadas com zod em `packages/env` — o app **não sobe** com uma obrigatória faltando.

| Variável | Obrigatória | Pra que serve |
|---|:--:|---|
| `DATABASE_URL` · `DATABASE_AUTH_TOKEN` | ✅ | Conexão libsql/Turso |
| `BETTER_AUTH_SECRET` | ✅ | Segredo de sessão (≥32 chars) |
| `BETTER_AUTH_URL` · `CORS_ORIGIN` | ✅ | Origem pública do app |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | ➖ | Login com Google |
| `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_EXAM_BUCKET` | ✅ | Anexos de exame ([ADR-0003](docs/adr/0003-anexos-de-exame-no-r2.md)) |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` | ➖ | Web Push — sem elas, o dispatch sai em silêncio |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ➖ | Mesma chave pública, pro `pushManager.subscribe()` |
| `NEXT_PUBLIC_EXERCISE_GIF_BASE` | ➖ | Base R2 dos GIFs do catálogo de exercícios |
| `CRON_SECRET` | ➖ | Autentica o agendador externo na rota de varredura |
| `DEV_USER_EMAIL` | ➖ | Atalho de usuário em desenvolvimento |

> ⚠️ Em **produção** `BETTER_AUTH_URL` e `CORS_ORIGIN` precisam ser `https://` — o build falha com `http://` de propósito, porque o Google recusa o callback e o erro só apareceria na tela de login.
>
> 🔔 Gere o par VAPID uma única vez com `bunx web-push generate-vapid-keys`.

---

## 🗂️ Estrutura

```
bloomy/
├── apps/
│   └── web/                  # 🖥️ Next.js 16 — o app inteiro
│       ├── src/app/(app)/    #    telas: home, corpo, treino, mente, saude, metas…
│       ├── src/app/api/      #    rotas REST finas
│       ├── src/server/       #    serviços por domínio (a regra de negócio mora aqui)
│       ├── src/components/   #    componentes do app
│       └── src/lib/          #    utilidades de client
├── packages/
│   ├── ui/                   # 🎨 shadcn/ui + tokens compartilhados
│   ├── db/                   # 🗄️ schema Drizzle + migrations
│   ├── auth/                 # 🔐 better-auth
│   ├── env/                  # 🔑 validação de env com zod
│   └── config/               # ⚙️ tsconfig compartilhado
└── docs/                     # 📚 handoff de design + ADRs
```

**Como o código se organiza:** rota REST fina, serviço em `server/` ([ADR-0001](docs/adr/0001-api-rest-com-camada-de-servico.md)) · telas em PT, código em EN · sem lógica no `.tsx` (vai pra hook) · o "dia" é uma coluna com fuso BR fixo ([ADR-0002](docs/adr/0002-dia-local-com-fuso-fixo.md)).

---

## 📜 Scripts

Todos rodam **da raiz**, com `bun`.

### 🛠️ Dia a dia

| Comando | O que faz |
|---|---|
| `bun dev:web` | Sobe só o app web (porta 3001) |
| `bun dev` | Sobe tudo em modo desenvolvimento |
| `bun build` | Builda tudo |
| `bun check-types` | ✅ Typecheck de todos os workspaces — **rode antes de commitar** |
| `bun test` | Roda os testes |

### 🗄️ Banco

| Comando | O que faz |
|---|---|
| `bun db:local` | Sobe um libsql local (`turso dev`) |
| `bun db:push` | Empurra o schema pro banco |
| `bun db:generate` | Gera as migrations |
| `bun db:migrate` | Aplica as migrations |
| `bun db:studio` | Abre o Drizzle Studio 🔍 |

### ☁️ Deploy

| Comando | O que faz |
|---|---|
| `bun deploy:setup` | Linka o repo a um projeto Vercel (primeira vez) |
| `bun env:preview` / `bun env:production` | Sincroniza o `.env` local com o ambiente Vercel |
| `bun deploy:check` | Dry-run: mostra o que iria subir, sem subir |
| `bun deploy` / `bun deploy:prod` | Preview / produção 🚀 |
| `bun dev:vercel` | Roda o ambiente Vercel localmente |

---

## 🧩 Trabalhando na UI

Os primitivos shadcn/ui são compartilhados via `packages/ui`:

```tsx
import { Button } from "@bloomy/ui/components/button";
```

- 🎨 Tokens e estilos globais → `packages/ui/src/styles/globals.css`
- 🧱 Primitivos compartilhados → `packages/ui/src/components/*`
- ⚙️ Aliases do shadcn → `packages/ui/components.json` e `apps/web/components.json`

Adicionar novos primitivos **compartilhados** (da raiz):

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Pra blocos específicos do app, rode a CLI do shadcn de dentro de `apps/web`.

---

## ☁️ Deploy

Produção roda na Vercel em **[bloomy.laridev.com](https://bloomy.laridev.com)**.

Alguns detalhes que economizam uma tarde de debug:

- 🔗 Linke o projeto (`bun deploy:setup`) e **sincronize as envs antes do primeiro deploy** — deploys não sobem `.env` local sozinhos, e sem isso o build começa sem nenhuma variável.
- 🚫 `BETTER_AUTH_URL` e `CORS_ORIGIN` ficam **fora do sync** (`SKIP_KEYS`) e são definidas à mão por ambiente. Em Production, `https://bloomy.laridev.com`. Em Preview, deixe as duas **vazias** — o schema deriva a origem de `VERCEL_URL`.
- 🔐 O redirect URI no Google Cloud Console tem que ser exatamente `<BETTER_AUTH_URL>/api/auth/callback/google`.
- 🎛️ Flags da CLI da Vercel passam direto: `bun env:production --scope sua-equipe`.

---

## 📚 Documentação

| Arquivo | O que tem lá |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | Visão, público, personalidade de marca e princípios de design |
| [`DESIGN.md`](DESIGN.md) | Design system: tokens de cor, tipografia, raios e sombras |
| [`docs/README.md`](docs/README.md) | Handoff hifi — tela por tela, com comportamento e estados |
| [`docs/adr/`](docs/adr/) | Decisões de arquitetura, com o porquê de cada uma |
| [`CONTEXT-MAP.md`](CONTEXT-MAP.md) | Mapa dos contextos e seus glossários |
| [`CLAUDE.md`](CLAUDE.md) | Convenções pra agentes que trabalham no repo |

---

<div align="center">

<br>

**Feito com 💜 por [Larissa](https://github.com/larissa04alves)**

*Ninguém floresce sob cobrança.* 🌸

</div>
