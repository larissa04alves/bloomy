# Anexar resultado do exame (upload de PDF/imagem no Cloudflare R2)

- **Issue:** #13
- **Data:** 2026-07-19
- **Depende de:** nada (pode começar já)
- **Habilita:** #14 (acessar o anexo no histórico)

## Objetivo

Quando um exame está em `result_available`, a usuária anexa o resultado (um PDF
ou uma imagem). O arquivo vai pro Cloudflare R2 num bucket privado dedicado e o
exame passa a guardar a referência. Um exame tem no máximo um anexo. O acesso ao
arquivo é sempre autenticado (proxy), nunca por URL pública ou assinada.

Fatia vertical: schema → API (upload/download/remove) → UI do modal de exame,
mais um ADR registrando storage e modelo de acesso (reaproveitado pelo #14).

## Decisões

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Storage | Cloudflare R2 (mesma conta dos GIFs), **bucket privado dedicado** |
| 2 | Modelo de acesso | **Proxy autenticado** — toda leitura revalida `requireUserId` + posse. Nunca URL pública nem assinada |
| 3 | Upload/download | **Proxy puro** — bytes passam pela function nos dois sentidos |
| 4 | Tamanho máximo | **4 MB** (limite de 4.5 MB da Vercel, request e response) |
| 5 | Lib R2 | **@aws-sdk/client-s3** (mesmo idioma do seed de GIFs `packages/db`; já no catálogo) |
| 6 | Gate do anexo | **Só em `result_available`**. Concluído = view-only (via #14). Anexo persiste na conclusão |
| 7 | Validação de tipo | **Allowlist de content-type** + tamanho (sem sniff de magic bytes) |
| 8 | Wiring do upload | **No Salvar** (fluxo único): file pendente em memória → cria/atualiza exame → sobe/deleta arquivo |
| 9 | Endpoint de download (GET) | Fica **neste #13** junto de POST/DELETE (compartilham cliente R2, auth, chave). #14 vira só UI |

### Contexto que motivou as decisões

- **4.5 MB da Vercel** (confirmado nos docs: `FUNCTION_PAYLOAD_TOO_LARGE`, 413) —
  limita request **e** response de Functions. Como o acesso é proxy puro (stream
  pelos dois lados), o teto real de arquivo é ~4 MB. Signed URL levantaria esse
  teto, mas foi descartada: reabriria uma janela em que a URL sozinha dá acesso
  (bearer), indesejável pra dado de saúde.
- **App single-user**: a única usuária sobe os próprios arquivos → allowlist de
  content-type basta; sniff de magic bytes seria custo sem ameaça real.
- **Visualização (herda pro #14)**: **download simples** (`Content-Disposition:
  attachment`) — o SO do celular abre no app apropriado. Sem viewer/preview
  inline. Isso **ajusta o AC do #14** (que dizia "PDF abre em visualização /
  imagem em preview") e elimina o problema de HEIC não renderizar inline no
  Chrome/Firefox.

## Schema (`packages/db`)

Migration adicionando 4 colunas nullable em `exam` (`src/schema/health.ts`):

```
attachment_key   text     null   -- chave do objeto no R2
attachment_mime  text     null   -- content-type (ex.: application/pdf)
attachment_name  text     null   -- nome original do arquivo
attachment_size  integer  null   -- bytes
```

Todas nullable: exame sem anexo tem os 4 campos `null`. `bun db:generate` +
`bun db:migrate` (nunca `push`).

## Env (`@bloomy/env`, `src/server.ts`)

Novas envs server-only:

```
R2_ACCOUNT_ID          string min 1
R2_ACCESS_KEY_ID       string min 1
R2_SECRET_ACCESS_KEY   string min 1
R2_EXAM_BUCKET         string min 1
```

Endpoint derivado em runtime: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`.
Bucket privado dedicado, distinto do bucket público dos GIFs de exercício
(`NEXT_PUBLIC_EXERCISE_GIF_BASE`).

**Reuso**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` já existem
no `apps/web/.env` (o seed `packages/db/src/seed/seed-catalog.ts` os usa via
`process.env`), mas **não** estão no `@bloomy/env`. Este ticket os adiciona à
validação do `@bloomy/env` server e provisiona **`R2_EXAM_BUCKET`** (única env
realmente nova; as chaves da conta são as mesmas, com acesso ao novo bucket).

## Cliente R2 (`apps/web/src/server/health/r2.ts`, novo)

Wrapper fino sobre `@aws-sdk/client-s3` (mesmo idioma do seed em
`packages/db/src/seed/seed-catalog.ts`), `import "server-only"`. Expõe uma porta
`ExamStorage` injetável (pro serviço ser testável sem tocar no R2):

```ts
export type ExamStorage = {
  put(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string }>;
  delete(key: string): Promise<void>;
};
```

- `examStorage`: implementação real. `S3Client` com `region: "auto"`,
  `endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credenciais das
  envs; `PutObjectCommand` / `GetObjectCommand` / `DeleteObjectCommand`. Sem
  presign (proxy puro). O `get` devolve `Body.transformToWebStream()`.

Serviço recebe `storage: ExamStorage` (como recebe `db`); testes passam um fake
que captura chamadas.

## Serviço (`apps/web/src/server/health/service.ts`)

Novas funções (recebem `db: Db` e `storage: ExamStorage`, seguem o padrão dos
exames existentes):

- `attachExam(db, storage, userId, examId, { body, mime, name, size })`:
  1. Valida posse do exame (`id` + `userId`) e que `status === "result_available"`.
     Se não for dono → retorna `null` (rota responde 404). Se status errado →
     lança/retorna sinal de conflito (rota responde 409).
  2. Se já houver `attachment_key`, guarda a chave antiga.
  3. Gera nova chave `exam-attachments/{userId}/{examId}/{uuid}-{name}`.
  4. `storage.put(novaChave, body, mime)`.
  5. `update exam set attachment_* = ...` (`updatedAt` novo).
  6. Se havia chave antiga (troca), `storage.delete(chaveAntiga)` — depois do
     update persistir, pra não deixar o exame apontando pra objeto inexistente
     se o delete falhar.
  7. Retorna o `Exam` atualizado.
- `removeExamAttachment(db, storage, userId, examId)`:
  1. Valida posse; lê `attachment_key`.
  2. `update exam set attachment_* = null`.
  3. `storage.delete(key)` (best-effort; falha vira log, não reverte o update).
  4. Retorna o `Exam` atualizado (ou `null` se não for dono).
- `getExamAttachmentMeta(db, userId, examId)`: valida posse; retorna
  `{ key, mime, name } | null` (a rota GET usa e faz o stream via `storage.get`).
- `deleteExam` (existente) ganha `storage: ExamStorage` e passa a: **ler
  `attachment_key` antes**, deletar a linha, e se havia chave, `storage.delete(key)`
  (best-effort). Atualizar o call site (`api/exams/[id]/route.ts` DELETE) pra
  passar `examStorage`. Assim excluir o exame não deixa órfão no R2.

Órfãos cobertos nos 3 pontos: excluir exame, trocar anexo, remover anexo.

## API (`apps/web/src/app/api/exams/[id]/attachment/route.ts`, novo)

Rotas finas (ADR-0001): zod/parse → `requireUserId` → serviço.

- **POST** (multipart `FormData`, campo `file`):
  - `requireUserId`; 401 se sem sessão.
  - Lê o `File`; valida `type` na allowlist e `size ≤ 4 MB` — senão 400.
  - Allowlist: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`,
    `image/heic`.
  - Chama `attachExam`; 404 se não dono, 409 se status ≠ `result_available`.
  - 200 com `{ exam }`.
- **GET** (download):
  - `requireUserId`; 401 se sem sessão.
  - `getExamAttachmentMeta(db, userId, id)` → 404 se não dono ou sem anexo.
  - `examStorage.get(key)`; devolve `new Response(body, { headers })` com
    `Content-Type: mime` e
    `Content-Disposition: attachment; filename="name"`.
- **DELETE** (remover anexo):
  - `requireUserId`; 401 se sem sessão.
  - `removeExamAttachment`; 404 se não dono. 200 com `{ exam }`.

## UI — modal (`ExamModal.tsx`)

Novo bloco **"Anexo do resultado"** abaixo do campo Status, renderizado **só
quando `status === "result_available"`**.

Estados:

- **Vazio**: botão tracejado lilás "⬆ Anexar resultado" + subtexto "PDF ou
  imagem · até 4 MB". Abre o seletor de arquivo.
- **Anexado (pendente ou já salvo)**: chip com ícone por tipo (PDF vermelho /
  IMG verde), nome (com ellipsis), tamanho, e duas ações **por ícone** (alvo
  34px): **trocar** (`ArrowsClockwise`, lilás) e **remover** (`Trash`, tom
  rosado). "Trocar" reabre o seletor; "Remover" limpa a seleção.

Sem estado de progresso separado no modal — o upload acontece no Salvar, coberto
pelo `LoadingOverlay` existente. Exame concluído reabre resetando pra
`to_schedule` (comportamento atual, não mexemos) → não mostra anexo; o acesso ao
arquivo de um concluído é pelo histórico (#14).

Ícones do `@phosphor-icons/react` (padrão do app).

## Wiring (`useExames.ts` + `page.tsx`)

O modal segura o `File` pendente (ou uma marca de "remover") em estado local e
passa junto do `onSubmit`. `useExames` ganha a orquestração no Salvar:

1. Cria (`POST /api/exams`) ou atualiza (`PUT /api/exams/[id]`) o exame → obtém
   `id`.
2. Se há file pendente: `POST /api/exams/[id]/attachment` (multipart).
3. Se há marca de remoção: `DELETE /api/exams/[id]/attachment`.
4. `list.reload()` pra reconciliar.

**Tratamento de erro**: se o exame persiste mas o upload falha, o exame **fica**
salvo; o erro do anexo vira `toastError` (não-fatal). A usuária reanexa editando.

O `ExamInput`/`ExamUpdate` não mudam no back; a intenção de anexo trafega só na
camada de UI (modal → hook → chamadas separadas de attachment).

## ADR novo (`docs/adr/0003-anexos-de-exame-no-r2.md`)

Registra, no formato dos ADRs existentes:

- **Contexto**: exame precisa guardar resultado (PDF/imagem); dado de saúde é
  sensível.
- **Decisão**: Cloudflare R2 (bucket privado dedicado) como storage; **acesso
  por proxy autenticado** (`requireUserId` + posse) em vez de bucket público ou
  URL assinada; teto de **4 MB** por causa do limite de 4.5 MB da Vercel.
- **Consequência**: #14 reaproveita o endpoint GET de download e o modelo de
  acesso; visualização é download simples (sem viewer inline).

## Fora de escopo (fica pro #14)

- Indicador de "tem anexo" + ação de abrir/baixar no `HistorySheet`.
- Ajuste do AC de visualização do #14 (download simples em vez de viewer inline).

## Critérios de aceite (do issue #13)

- [ ] No modal, em `result_available`, aparece a opção de anexar (PDF + png/jpg/webp/heic).
- [ ] Upload vai pro R2 (bucket dedicado), com validação de tipo e tamanho (≤4 MB).
- [ ] Config do R2 via `@bloomy/env` (novas envs).
- [ ] `exam` ganha campos do anexo via migration.
- [ ] Salvar persiste a referência; reabrir mostra o anexo, com trocar/remover.
- [ ] Rotas finas (ADR-0001), autenticadas com `requireUserId` + posse.
- [ ] ADR novo registrando storage + modelo de acesso.
- [ ] Objeto removido do R2 ao excluir exame ou trocar/remover anexo (sem órfãos).
```
