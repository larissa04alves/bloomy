# apps/web

Glossário canônico em `CONTEXT.md` (nesta pasta). Decisões em `/docs/adr/`.

## Organização

- **Telas** (PT): `src/app/<tela>/page.tsx` é a própria tela e SÓ renderiza.
  Toda lógica/consts/handlers em `src/app/<tela>/hooks/use<Tela>.ts`
  (ex.: `app/hoje/page.tsx` + `app/hoje/hooks/useHoje.ts`). Fetch inicial
  e mutações acontecem no hook, via API REST (telas nascem com skeleton).
- **Serviços** (EN): `src/features/<domínio>/service.ts` — donos das regras.
  Recebem `db: Db` por parâmetro (testabilidade). Nunca importam de `app/`.
- **Rotas** (EN): `src/app/api/<recurso>/route.ts` — wrappers finos:
  zod → sessão (`requireUserId` de `features/shared/api.ts`) → serviço.
  Nenhuma regra de negócio em rota.

## Regras

- Registro diário grava `day` (`YYYY-MM-DD`) via `dayFor()` de
  `features/shared/day.ts` — nunca recalcular fuso em outro lugar (ADR-0002).
- Erros de API: `{ "error": string }` + status (400/401/404/409).
- Tomas de remédio derivam do cadastro na leitura; só confirmação vira linha;
  estoque muda na mesma transação do mark/unmark.
- Testes: `bun test` (rodar de apps/web). Cobertura mínima = pontos críticos.
