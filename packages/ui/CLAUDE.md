# @bloomy/ui

- **Todo componente shadcn é instalado AQUI**, nunca em apps/web:
  rodar `bunx shadcn@latest add <item>` DENTRO de `packages/ui/`
  (o `components.json` daqui aponta os aliases `@bloomy/ui/*`).
- Consumo no app: `import { Button } from "@bloomy/ui/components/button"`.
- Aqui moram só componentes visuais reusáveis; composição de tela fica na
  pasta da tela em `apps/web/src/app/<tela>/`.
- Pendências da fase de UI (decidir antes de estilizar): Phosphor Icons vs
  lucide (DESIGN.md exige Phosphor), remoção do dark mode (produto é light),
  re-tokenização do `globals.css` com a paleta Bloomy, fontes Quicksand/Nunito.
- DESIGN.md na raiz é a autoridade visual; protótipos em `docs/`.
