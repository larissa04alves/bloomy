# bloomy

Diário pessoal (app "Diário") — monorepo Turborepo + Bun.

## Git

**NUNCA commitar sem eu mandar.** Só commite quando eu disser explicitamente pra commitar
("commita", "pode commitar X"). Eu faço os commits e reviso o trabalho antes. Em qualquer
dúvida ou instrução ambígua sobre commit, **pergunte** — não assuma autorização. Ao despachar
subagent, não instrua "commite por task" a menos que eu tenha pedido; entregue como mudanças
não-commitadas.

## Estrutura

- `apps/web` — Next.js 16 (App Router, `src/{app,components,lib}`), porta 3001
- `packages/db` — Drizzle ORM + libsql/Turso (schema, migrations)
- `packages/auth` — better-auth
- `packages/ui` — componentes compartilhados (shadcn, Tailwind 4)
- `packages/env` — validação de env com zod
- `packages/config` — tsconfig compartilhado

Dependências de catálogo ficam em `package.json` raiz (`workspaces.catalog`) — use `"catalog:"` nos packages, não versões soltas.

## Comandos (rodar da raiz, com bun)

- `bun dev:web` — dev server do web (porta 3001)
- `bun check-types` — typecheck de todos os workspaces (rodar antes de commit)
- `bun db:push` / `db:generate` / `db:migrate` / `db:studio` — Drizzle via `@bloomy/db`
- `bun db:local` — banco libsql local
- Deploy: Vercel (`bun deploy`, envs via `bun env:preview` / `env:production`)

## Docs de produto

`PRODUCT.md` (visão), `DESIGN.md` (design system), `docs/README.md` (spec do Diário).

## Convenções de código

Glossário: `apps/web/CONTEXT.md` · ADRs: `docs/adr/` · Convenções por pacote:
`apps/web/CLAUDE.md`, `packages/db/CLAUDE.md`, `packages/ui/CLAUDE.md`.
Resumo: REST fino + serviços em `server/` (ADR-0001); coluna `day` fuso BR
(ADR-0002); telas PT sem lógica no `.tsx` (hooks); código EN; migrations sempre.

## Agent skills

### Issue tracker

Issues vivem no GitHub Issues do repo (via `gh` CLI); PRs externos NÃO são superfície de triage. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulário padrão: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` na raiz aponta os `CONTEXT.md` por contexto; ADRs system-wide em `docs/adr/`. Ver `docs/agents/domain.md`.
