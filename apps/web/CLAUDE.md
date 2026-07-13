# apps/web

Glossário canônico em `CONTEXT.md` (nesta pasta). Decisões em `/docs/adr/`.

## Organização

- **Telas** (PT): `src/app/<tela>/page.tsx` é a própria tela e SÓ renderiza.
  Toda lógica/consts/handlers em `src/app/<tela>/hooks/use<Tela>.ts`
  (ex.: `app/hoje/page.tsx` + `app/hoje/hooks/useHoje.ts`). Fetch inicial
  e mutações acontecem no hook, via API REST (telas nascem com skeleton).
- **Componentes** (EN): globais (usados em >2 telas) em `src/components/`, mesmo
  quando envolvem um shadcn; específicos de uma tela na `components/` dentro da
  pasta da tela. `packages/ui/src/components/` é SÓ dos arquivos gerados pelo
  shadcn — nada autoral lá. Tokens Bloomy vêm de `@bloomy/ui` (`globals.css`);
  `cn` de `@bloomy/ui/lib/utils`.
- **Serviços** (EN): `src/server/<domínio>/service.ts` — donos das regras.
  Recebem `db: Db` por parâmetro (testabilidade). Nunca importam de `app/`.
  Marcados com `import "server-only"` (build-time: nunca vão pro client).
  `day.ts` fica fora (util de fuso, client-safe).
- **Rotas** (EN): `src/app/api/<recurso>/route.ts` — wrappers finos:
  zod → sessão (`requireUserId` de `server/shared/api.ts`) → serviço.
  Nenhuma regra de negócio em rota.

## Regras

- Registro diário grava `day` (`YYYY-MM-DD`) via `dayFor()` de
  `server/shared/day.ts` — nunca recalcular fuso em outro lugar (ADR-0002).
- Erros de API: `{ "error": string }` + status (400/401/404/409).
- Tomas de remédio derivam do cadastro na leitura; só confirmação vira linha;
  estoque muda na mesma transação do mark/unmark.
- Testes: `bun test` (rodar de apps/web) roda com `--conditions react-server`
  (neutraliza `server-only` nos imports). Cobertura mínima = pontos críticos.
- **Tamanho de texto: sempre a escala nomeada do Tailwind** (`text-xs`, `text-sm`,
  `text-base`, `text-lg`, `text-xl`, `text-2xl`...) — **nunca** valor arbitrário
  (`text-[13px]`, `text-[15px]`). A escala não tem `text-md`: o passo entre `sm`
  e `lg` é `text-base`. (Cor arbitrária como `text-[#c9a8b8]` é permitida — a regra
  é só sobre tamanho de fonte.)
