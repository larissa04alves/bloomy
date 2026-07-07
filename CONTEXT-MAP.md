# Context Map

Este repo é multi-context. Cada contexto tem seu próprio `CONTEXT.md` (glossário/linguagem do domínio) e `docs/adr/` (decisões locais). Decisões system-wide ficam em `docs/adr/` na raiz.

| Contexto | Caminho    | CONTEXT.md              | Descrição                                    |
| -------- | ---------- | ----------------------- | -------------------------------------------- |
| Diário   | `apps/web` | `apps/web/CONTEXT.md`   | App de diário pessoal (produto principal)    |

Os `CONTEXT.md` por contexto são criados lazily pelo `/domain-modeling` quando termos ou decisões forem de fato resolvidos — a ausência de um arquivo não é erro.

Novos apps em `apps/*` entram aqui como novos contextos. Packages em `packages/*` são infra compartilhada, não contextos de domínio.
