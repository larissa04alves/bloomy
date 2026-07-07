# @bloomy/ui

- **Todo componente shadcn é instalado AQUI**, nunca em apps/web:
  rodar `bunx shadcn@latest add <item>` DENTRO de `packages/ui/`
  (o `components.json` daqui aponta os aliases `@bloomy/ui/*`).
- Consumo no app: `import { Button } from "@bloomy/ui/components/button"`.
- **`src/components/` guarda SÓ os arquivos que o shadcn gera** — nunca editar
  um deles nem criar componente autoral aqui. Componentes que NÓS criamos (mesmo
  envolvendo um shadcn) moram em `apps/web`: globais (usados em >2 lugares) em
  `apps/web/src/components/`; específicos de uma tela na `components/` da própria
  tela (ver `apps/web/CLAUDE.md`). Migrar algo pra cá só quando um 2º app
  (mobile/worker) consumir — hoje há um consumidor só.
- `src/lib/utils.ts` (o `cn`) e o `src/styles/globals.css` (tokens Bloomy) são
  compartilhados: podem ser consumidos por `apps/web` e editados — não são
  "componentes", então não caem na regra acima.
- DESIGN.md na raiz é a autoridade visual; protótipos em `docs/`.
