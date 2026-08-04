# @bloomy/db

- Um arquivo de schema por domínio em `src/schema/` (EN), re-exportado em
  `src/schema/index.ts`. Seguir o padrão de `auth.ts`: ids `text`, timestamps
  `integer { mode: "timestamp_ms" }` com default `unixepoch('subsecond')`.
- Tabelas de registro diário têm coluna `day` (`text`, `YYYY-MM-DD`) com
  índice composto `(user_id, day)` (ADR-0002).
- **Migrations sempre**: `bun db:generate` + `bun db:migrate` (da raiz).
  NUNCA `drizzle-kit push`. Migrations ficam em `src/migrations/`.
- **`db:generate` sem `db:migrate` não dá erro na subida** — o app sobe normalmente e
  só estoura 500 (`no such table: X`) quando a feature nova é usada. Depois de gerar
  migration, rodar `bun db:migrate` antes de testar na tela.
- Dev local: `bun db:local` (turso dev em `local.db`), `.env` fica em
  `apps/web/.env`.
- Serviços recebem `Db` (`import type { Db } from "@bloomy/db"`); o singleton
  `db` só é importado por rotas/entrypoints.
- `src/client.ts` cria conexões sem tocar no env (`createDb({ url, authToken })`) — é o que os testes usam; `src/index.ts` valida env e expõe o singleton `db` do runtime.
