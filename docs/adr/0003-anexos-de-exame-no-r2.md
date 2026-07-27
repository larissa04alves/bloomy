# ADR-0003: Anexos de exame no Cloudflare R2 com acesso por proxy

## Contexto

Um exame em `awaiting_result` pode ter o resultado anexado (PDF ou imagem).
É dado de saúde — sensível — e só a dona pode acessar. O projeto já usa uma
conta Cloudflare (bucket público para GIFs de exercício).

## Decisão

- **Storage:** Cloudflare R2, em um **bucket privado dedicado** (`R2_EXAM_BUCKET`),
  separado do bucket público dos GIFs. Cliente via `@aws-sdk/client-s3` (mesmo
  idioma do seed em `packages/db`).
- **Acesso:** **proxy autenticado**. Toda leitura passa por
  `GET /api/exams/[id]/attachment`, que revalida `requireUserId` + posse antes de
  fazer stream dos bytes. Sem bucket público e sem URL assinada — nenhuma URL
  concede acesso por si só.
- **Tamanho:** teto de **4 MB**. As Vercel Functions limitam request e response a
  4.5 MB (`FUNCTION_PAYLOAD_TOO_LARGE`); como o proxy faz stream pelos dois lados,
  4 MB é o teto seguro. Signed URL levantaria o teto mas reabriria uma janela de
  acesso por URL (bearer), descartada por ser dado de saúde.
- **Validação:** allowlist de content-type (`application/pdf`, `image/png`,
  `image/jpeg`, `image/webp`, `image/heic`) + tamanho. App single-user → sem sniff
  de magic bytes.

## Consequência

- O ticket de histórico (#14) reaproveita o endpoint GET e este modelo de acesso.
  A visualização é **inline** para `application/pdf` e `image/*`
  (`Content-Disposition: inline`, `attachment` para o resto) e o link abre em nova
  aba: o critério do #14 pede PDF em visualização e imagem em preview, e o
  visualizador do navegador já oferece o download. HEIC não renderiza inline no
  Chrome/Firefox — nesse caso o navegador cai no download, que é o comportamento
  aceitável.
- Órfãos no R2 são removidos ao excluir o exame, trocar ou remover o anexo.
- Quem fecha o exame é o laudo: anexar em `awaiting_result` conclui o exame na
  mesma operação (ver ADR-0004).
