# API REST como porta única, com camada de serviço

Num app Next.js solo o caminho óbvio seriam Server Actions, mas decidimos expor o back-end como rotas REST por domínio (`/api/<domínio>/…`): o contrato HTTP fica pronto para um futuro cliente nativo, e as telas web — client components com toda a lógica em hooks (`app/<tela>/hooks/use<Tela>.ts`, o `.tsx` só renderiza) — consomem essa mesma API via fetch, tanto leituras quanto mutações. As regras não vivem nos handlers: ficam em funções de serviço (`apps/web/src/features/<domínio>/`), e os route handlers são wrappers finos (zod + sessão better-auth + serviço).

## Considered Options

- **Server Actions** — idiomático, menos código, mas sem contrato consumível por outro cliente.
- **Híbrido RSC** (páginas server chamando o serviço direto, API só para mutações) — primeiro render já com dados, porém duas portas de leitura e conflito com a convenção de telas client com lógica em hooks.

## Consequences

- Telas nascem em loading no primeiro render (skeleton) — o design deve prever esses estados.
- O serviço é o único dono das regras; além dos handlers, só os testes o chamam direto.
