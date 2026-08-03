# Anexar resultado do exame (R2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir anexar um PDF/imagem de resultado a um exame em `result_available`, guardando o arquivo no Cloudflare R2 (bucket privado) e a referência no banco, com acesso sempre autenticado por proxy.

**Architecture:** Fatia vertical — migration adiciona 4 colunas de anexo em `exam`; um cliente R2 (`@aws-sdk/client-s3`, porta `ExamStorage` injetável) é consumido por funções de serviço (`attachExam`/`removeExamAttachment`/`getExamAttachmentMeta`) que a rota fina `api/exams/[id]/attachment` expõe (POST/GET/DELETE); a UI do modal ganha o bloco "Anexo do resultado" e o hook orquestra upload/remoção no Salvar.

**Tech Stack:** Next.js 16 (App Router), Drizzle + libsql/Turso, `@aws-sdk/client-s3`, `@t3-oss/env-core` (zod), `@tanstack/react-form`, `@phosphor-icons/react`, bun test.

## Global Constraints

- Rotas finas: zod → `requireUserId` (`server/shared/api.ts`) → serviço. Nenhuma regra de negócio em rota (ADR-0001).
- Serviços recebem `db: Db` (e aqui `storage: ExamStorage`) por parâmetro; `import "server-only"`; nunca importam de `app/`.
- Migrations sempre via `bun db:generate` + `bun db:migrate` (da raiz). NUNCA `drizzle-kit push`.
- Erros de API: `{ "error": string }` + status (400/401/404/409).
- Testes: `bun test` rodado **de `apps/web`** (usa `--conditions react-server`). Serviços testados com `createTestDb`/`createTestUser` de `@/server/shared/test-db`.
- Deps de catálogo: usar `"catalog:"` nos packages (não versão solta). `@aws-sdk/client-s3` já está no catálogo raiz.
- Tamanho de texto no JSX: só escala nomeada do Tailwind (`text-sm`, `text-base`…), nunca `text-[13px]`.
- Tipos de arquivo aceitos: `application/pdf`, `image/png`, `image/jpeg`, `image/webp`, `image/heic`. Tamanho máximo: **4 MB** (4 * 1024 * 1024 = 4194304 bytes).
- **NÃO commitar sem ordem explícita da Larissa.** As tarefas abaixo trazem passo de commit para quando ela autorizar; se não autorizado, entregar como mudança não-commitada.

---

### Task 1: Migration — colunas de anexo em `exam`

**Files:**
- Modify: `packages/db/src/schema/health.ts:46-70` (tabela `exam`)
- Create: `packages/db/src/migrations/00XX_*.sql` (gerado pelo drizzle)

**Interfaces:**
- Produces: colunas `attachmentKey`, `attachmentMime`, `attachmentName`, `attachmentSize` no tipo `Exam` (`typeof exam.$inferSelect`).

- [ ] **Step 1: Adicionar as 4 colunas na tabela `exam`**

Em `packages/db/src/schema/health.ts`, dentro do objeto de colunas de `exam` (depois de `parentId`, antes de `createdAt`):

```ts
    attachmentKey: text("attachment_key"),
    attachmentMime: text("attachment_mime"),
    attachmentName: text("attachment_name"),
    attachmentSize: integer("attachment_size"),
```

(`text` e `integer` já estão importados no arquivo.)

- [ ] **Step 2: Gerar a migration**

Run (da raiz): `bun db:generate`
Expected: cria `packages/db/src/migrations/00XX_<nome>.sql` com 4 `ALTER TABLE exam ADD ...`. Conferir o SQL gerado.

- [ ] **Step 3: Aplicar a migration no banco local**

Run (da raiz): `bun db:migrate`
Expected: aplica sem erro.

- [ ] **Step 4: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 5: Commit** (só se autorizado)

```bash
git add packages/db/src/schema/health.ts packages/db/src/migrations
git commit -m "feat(db): adicionar colunas de anexo em exam"
```

---

### Task 2: Envs do R2 + cliente `ExamStorage`

**Files:**
- Modify: `packages/env/src/server.ts:22-34` (bloco `server` do `createEnv`)
- Modify: `apps/web/package.json` (dependência `@aws-sdk/client-s3`)
- Create: `apps/web/src/server/health/r2.ts`

**Interfaces:**
- Consumes: envs `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_EXAM_BUCKET`.
- Produces:
  - `type ExamStorage = { put(key, body, contentType): Promise<void>; get(key): Promise<{ body: ReadableStream; contentType?: string }>; delete(key): Promise<void> }`
  - `const examStorage: ExamStorage` (implementação real, exportada de `r2.ts`).

- [ ] **Step 1: Adicionar as envs do R2**

Em `packages/env/src/server.ts`, no objeto `server` do `createEnv`, adicionar:

```ts
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_EXAM_BUCKET: z.string().min(1),
```

- [ ] **Step 2: Declarar a dependência no app web**

Em `apps/web/package.json`, no bloco `dependencies`, adicionar (mantendo ordem alfabética):

```json
    "@aws-sdk/client-s3": "catalog:",
```

- [ ] **Step 3: Instalar**

Run (da raiz): `bun install`
Expected: adiciona `@aws-sdk/client-s3` ao app web sem erro.

- [ ] **Step 4: Criar o cliente R2 (`r2.ts`)**

Create `apps/web/src/server/health/r2.ts`:

```ts
import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@bloomy/env/server";

export type ExamStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType?: string }>;
  delete(key: string): Promise<void>;
};

// Cliente único; endpoint e credenciais no mesmo idioma do seed (packages/db).
const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const Bucket = env.R2_EXAM_BUCKET;

export const examStorage: ExamStorage = {
  async put(key, body, contentType) {
    await client.send(
      new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
    );
  },
  async get(key) {
    const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
    return {
      body: res.Body!.transformToWebStream(),
      contentType: res.ContentType,
    };
  },
  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
  },
};
```

- [ ] **Step 5: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS. (`r2.ts` ainda não é importado por ninguém — valida só o tipo.)

- [ ] **Step 6: Commit** (só se autorizado)

```bash
git add packages/env/src/server.ts apps/web/package.json apps/web/src/server/health/r2.ts bun.lock
git commit -m "feat(web): cliente R2 (ExamStorage) e envs do bucket de exames"
```

---

### Task 3: Serviço — `attachExam`

**Files:**
- Modify: `apps/web/src/server/health/service.ts` (novas funções + import do tipo)
- Modify: `apps/web/src/server/health/service.test.ts` (testes)

**Interfaces:**
- Consumes: `type ExamStorage` de `./r2` (import type — não puxa o `examStorage` real).
- Produces:
  - `type ExamStorageError = "not_found" | "wrong_status"` (sinal p/ a rota mapear 404/409).
  - `attachExam(db: Db, storage: ExamStorage, userId: string, examId: string, file: { body: Uint8Array; mime: string; name: string; size: number }): Promise<Exam | ExamStorageError>`
  - `KEY_PREFIX = "exam-attachments"` (uso interno).

- [ ] **Step 1: Escrever o teste que falha (fake storage captura chamadas)**

Em `apps/web/src/server/health/service.test.ts`, adicionar no topo (junto dos imports) e um novo `describe`:

```ts
import { attachExam, createExam, updateExam } from "./service";
import type { ExamStorage } from "./r2";

function fakeStorage() {
  const calls: { put: string[]; del: string[] } = { put: [], del: [] };
  const storage: ExamStorage = {
    async put(key) { calls.put.push(key); },
    async get() { return { body: new ReadableStream() }; },
    async delete(key) { calls.del.push(key); },
  };
  return { storage, calls };
}

const FILE = { body: new Uint8Array([1, 2, 3]), mime: "application/pdf", name: "r.pdf", size: 3 };

describe("attachExam", () => {
  test("anexa em exame result_available: grava colunas e sobe pro R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    const { storage, calls } = fakeStorage();

    const result = await attachExam(db, storage, userId, exam.id, FILE);

    expect(result).not.toBe("not_found");
    expect(result).not.toBe("wrong_status");
    const updated = result as Awaited<ReturnType<typeof attachExam>> & { attachmentKey: string };
    expect(updated.attachmentName).toBe("r.pdf");
    expect(updated.attachmentMime).toBe("application/pdf");
    expect(updated.attachmentSize).toBe(3);
    expect(updated.attachmentKey).toContain(`exam-attachments/${userId}/${exam.id}/`);
    expect(calls.put).toHaveLength(1);
    expect(calls.del).toHaveLength(0);
  });

  test("troca: sobe o novo e deleta a chave antiga do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    const { storage, calls } = fakeStorage();

    const first = (await attachExam(db, storage, userId, exam.id, FILE)) as { attachmentKey: string };
    await attachExam(db, storage, userId, exam.id, { ...FILE, name: "novo.pdf" });

    expect(calls.put).toHaveLength(2);
    expect(calls.del).toEqual([first.attachmentKey]);
  });

  test("exame de outra usuária → not_found", async () => {
    const db = await createTestDb();
    const owner = await createTestUser(db);
    const exam = await createExam(db, owner, { name: "Hemograma", status: "result_available" });
    const { storage } = fakeStorage();
    const other = await createTestUser(db, "user-other");

    expect(await attachExam(db, storage, other, exam.id, FILE)).toBe("not_found");
  });

  test("status ≠ result_available → wrong_status, sem tocar no R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "scheduled" });
    const { storage, calls } = fakeStorage();

    expect(await attachExam(db, storage, userId, exam.id, FILE)).toBe("wrong_status");
    expect(calls.put).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test src/server/health/service.test.ts`
Expected: FAIL (`attachExam` não existe / import de `./r2` type ok).

- [ ] **Step 3: Implementar `attachExam`**

Em `apps/web/src/server/health/service.ts`: no topo adicionar o import de tipo e (se faltar) `import { randomUUID } from "node:crypto"`:

```ts
import type { ExamStorage } from "./r2";
import { randomUUID } from "node:crypto";
```

No fim da seção "Exames", adicionar:

```ts
export type ExamStorageError = "not_found" | "wrong_status";
const KEY_PREFIX = "exam-attachments";

export async function attachExam(
  db: Db,
  storage: ExamStorage,
  userId: string,
  examId: string,
  file: { body: Uint8Array; mime: string; name: string; size: number },
): Promise<Exam | ExamStorageError> {
  const [current] = await db
    .select()
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!current) return "not_found";
  if (current.status !== "result_available") return "wrong_status";

  const oldKey = current.attachmentKey;
  const key = `${KEY_PREFIX}/${userId}/${examId}/${randomUUID()}-${file.name}`;

  await storage.put(key, file.body, file.mime);

  const [updated] = await db
    .update(exam)
    .set({
      attachmentKey: key,
      attachmentMime: file.mime,
      attachmentName: file.name,
      attachmentSize: file.size,
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)))
    .returning();

  // troca: remove o objeto antigo só depois do update persistir.
  if (oldKey) {
    try {
      await storage.delete(oldKey);
    } catch {
      /* órfão tolerável; não reverte o anexo novo */
    }
  }
  return updated;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run (de `apps/web`): `bun test src/server/health/service.test.ts`
Expected: PASS (todos os testes de `attachExam`).

- [ ] **Step 5: Commit** (só se autorizado)

```bash
git add apps/web/src/server/health/service.ts apps/web/src/server/health/service.test.ts
git commit -m "feat(web): serviço attachExam com upload e troca no R2"
```

---

### Task 4: Serviço — `removeExamAttachment`, `getExamAttachmentMeta`, limpeza no `deleteExam`

**Files:**
- Modify: `apps/web/src/server/health/service.ts` (`deleteExam` + 2 novas funções)
- Modify: `apps/web/src/server/health/service.test.ts` (testes)
- Modify: `apps/web/src/app/api/exams/[id]/route.ts` (call site do `deleteExam`)

**Interfaces:**
- Consumes: `attachExam` (Task 3), `ExamStorage`.
- Produces:
  - `removeExamAttachment(db, storage, userId, examId): Promise<Exam | null>`
  - `getExamAttachmentMeta(db, userId, examId): Promise<{ key: string; mime: string; name: string } | null>`
  - `deleteExam(db, storage, userId, id): Promise<boolean>` (assinatura mudou: ganhou `storage`).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `service.test.ts` (reaproveita `fakeStorage`/`FILE`/`attachExam` da Task 3). Incluir `removeExamAttachment`, `getExamAttachmentMeta`, `deleteExam` no import de `./service`:

```ts
describe("removeExamAttachment / getExamAttachmentMeta / deleteExam cleanup", () => {
  test("remove: limpa colunas e deleta objeto", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(db, storage, userId, exam.id, FILE)) as { attachmentKey: string };

    const result = await removeExamAttachment(db, storage, userId, exam.id);

    expect(result!.attachmentKey).toBeNull();
    expect(result!.attachmentName).toBeNull();
    expect(calls.del).toEqual([attached.attachmentKey]);
  });

  test("getExamAttachmentMeta devolve chave/mime/nome do dono", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    const { storage } = fakeStorage();
    await attachExam(db, storage, userId, exam.id, FILE);

    const meta = await getExamAttachmentMeta(db, userId, exam.id);
    expect(meta!.name).toBe("r.pdf");
    expect(meta!.mime).toBe("application/pdf");
    expect(meta!.key).toContain("exam-attachments/");
  });

  test("getExamAttachmentMeta: sem anexo → null", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    expect(await getExamAttachmentMeta(db, userId, exam.id)).toBeNull();
  });

  test("deleteExam com anexo remove o objeto do R2", async () => {
    const db = await createTestDb();
    const userId = await createTestUser(db);
    const exam = await createExam(db, userId, { name: "Hemograma", status: "result_available" });
    const { storage, calls } = fakeStorage();
    const attached = (await attachExam(db, storage, userId, exam.id, FILE)) as { attachmentKey: string };

    expect(await deleteExam(db, storage, userId, exam.id)).toBe(true);
    expect(calls.del).toEqual([attached.attachmentKey]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run (de `apps/web`): `bun test src/server/health/service.test.ts`
Expected: FAIL (funções não existem / `deleteExam` aridade errada).

- [ ] **Step 3: Implementar as funções e ajustar `deleteExam`**

Substituir a função `deleteExam` existente por:

```ts
export async function deleteExam(
  db: Db,
  storage: ExamStorage,
  userId: string,
  id: string,
): Promise<boolean> {
  const [row] = await db
    .select({ key: exam.attachmentKey })
    .from(exam)
    .where(and(eq(exam.id, id), eq(exam.userId, userId)));
  if (!row) return false;

  await db.delete(exam).where(and(eq(exam.id, id), eq(exam.userId, userId)));

  if (row.key) {
    try {
      await storage.delete(row.key);
    } catch {
      /* órfão tolerável */
    }
  }
  return true;
}
```

Adicionar depois de `attachExam`:

```ts
export async function removeExamAttachment(
  db: Db,
  storage: ExamStorage,
  userId: string,
  examId: string,
): Promise<Exam | null> {
  const [current] = await db
    .select()
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!current) return null;
  const oldKey = current.attachmentKey;

  const [updated] = await db
    .update(exam)
    .set({
      attachmentKey: null,
      attachmentMime: null,
      attachmentName: null,
      attachmentSize: null,
      updatedAt: new Date(),
    })
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)))
    .returning();

  if (oldKey) {
    try {
      await storage.delete(oldKey);
    } catch {
      /* órfão tolerável */
    }
  }
  return updated;
}

export async function getExamAttachmentMeta(
  db: Db,
  userId: string,
  examId: string,
): Promise<{ key: string; mime: string; name: string } | null> {
  const [row] = await db
    .select({
      key: exam.attachmentKey,
      mime: exam.attachmentMime,
      name: exam.attachmentName,
    })
    .from(exam)
    .where(and(eq(exam.id, examId), eq(exam.userId, userId)));
  if (!row?.key || !row.mime || !row.name) return null;
  return { key: row.key, mime: row.mime, name: row.name };
}
```

- [ ] **Step 4: Corrigir o call site do `deleteExam` na rota**

Em `apps/web/src/app/api/exams/[id]/route.ts`, no handler DELETE, passar `examStorage`. Adicionar o import `import { examStorage } from "@/server/health/r2";` e trocar a chamada `deleteExam(db, userId, id)` por `deleteExam(db, examStorage, userId, id)`.

- [ ] **Step 5: Rodar testes + type-check**

Run (de `apps/web`): `bun test src/server/health/service.test.ts`
Expected: PASS.
Run (da raiz): `bun check-types`
Expected: PASS (call site corrigido).

- [ ] **Step 6: Commit** (só se autorizado)

```bash
git add apps/web/src/server/health/service.ts apps/web/src/server/health/service.test.ts apps/web/src/app/api/exams/[id]/route.ts
git commit -m "feat(web): remover anexo, meta de download e limpeza de órfãos no deleteExam"
```

---

### Task 5: Rota `attachment` (POST / GET / DELETE)

**Files:**
- Create: `apps/web/src/app/api/exams/[id]/attachment/route.ts`

**Interfaces:**
- Consumes: `requireUserId`, `unauthorized`, `badRequest`, `notFound`, `conflict` (de `server/shared/api`); `attachExam`, `removeExamAttachment`, `getExamAttachmentMeta` (serviço); `examStorage` (r2); `db` (`@bloomy/db`).

- [ ] **Step 1: Criar a rota**

Create `apps/web/src/app/api/exams/[id]/attachment/route.ts`:

```ts
import { db } from "@bloomy/db";

import { badRequest, conflict, notFound, requireUserId, unauthorized } from "@/server/shared/api";
import { examStorage } from "@/server/health/r2";
import { attachExam, getExamAttachmentMeta, removeExamAttachment } from "@/server/health/service";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
]);

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();
  const { id } = await params;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("arquivo ausente");
  if (!ALLOWED.has(file.type)) return badRequest("tipo de arquivo não suportado");
  if (file.size > MAX_BYTES) return badRequest("arquivo acima de 4 MB");

  const body = new Uint8Array(await file.arrayBuffer());
  const result = await attachExam(db, examStorage, userId, id, {
    body,
    mime: file.type,
    name: file.name,
    size: file.size,
  });
  if (result === "not_found") return notFound();
  if (result === "wrong_status") return conflict("exame não está em resultado disponível");
  return Response.json({ exam: result });
}

export async function GET(request: Request, { params }: Ctx) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();
  const { id } = await params;

  const meta = await getExamAttachmentMeta(db, userId, id);
  if (!meta) return notFound();

  const object = await examStorage.get(meta.key);
  return new Response(object.body, {
    headers: {
      "content-type": meta.mime,
      "content-disposition": `attachment; filename="${encodeURIComponent(meta.name)}"`,
    },
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();
  const { id } = await params;

  const result = await removeExamAttachment(db, examStorage, userId, id);
  if (!result) return notFound();
  return Response.json({ exam: result });
}
```

- [ ] **Step 2: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 3: Verificação manual (requer bucket R2 provisionado + `R2_EXAM_BUCKET` no `.env`)**

Com `bun dev:web` rodando e logada, criar um exame `result_available` e:
```bash
# substituir <id> e <cookie> reais
curl -F "file=@/caminho/resultado.pdf" -b "<cookie>" http://localhost:3001/api/exams/<id>/attachment
```
Expected: `{ "exam": { ...attachmentName: "resultado.pdf" } }`. `GET` do mesmo path baixa o arquivo; `DELETE` limpa. (Se o bucket ainda não existir, este passo fica pendente até provisionar — a lógica está coberta pelos testes de serviço da Task 3/4.)

- [ ] **Step 4: Commit** (só se autorizado)

```bash
git add apps/web/src/app/api/exams/[id]/attachment/route.ts
git commit -m "feat(web): rota autenticada de anexo do exame (POST/GET/DELETE)"
```

---

### Task 6: `api-types` + `api.upload`

**Files:**
- Modify: `apps/web/src/lib/api-types.ts:221-231` (tipo `Exam`)
- Modify: `apps/web/src/lib/api.ts` (método `upload`)

**Interfaces:**
- Produces:
  - `Exam` ganha `attachmentKey/Mime/Name: string | null` e `attachmentSize: number | null`.
  - `api.upload<T>(path: string, form: FormData): Promise<T>`.

- [ ] **Step 1: Adicionar campos de anexo ao tipo `Exam`**

Em `apps/web/src/lib/api-types.ts`, no tipo `Exam`, antes de `createdAt`:

```ts
  attachmentKey: string | null;
  attachmentMime: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
```

- [ ] **Step 2: Adicionar `upload` ao client `api`**

Em `apps/web/src/lib/api.ts`, adicionar a função e a entrada no objeto `api`:

```ts
function upload<T>(path: string, form: FormData): Promise<T> {
  // sem content-type manual: o browser define o boundary do multipart.
  return fetch(path, { method: "POST", credentials: "same-origin", body: form }).then((res) =>
    handle<T>(res),
  );
}
```

No objeto `api`, adicionar:

```ts
  upload: <T>(path: string, form: FormData) => upload<T>(path, form),
```

- [ ] **Step 3: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 4: Commit** (só se autorizado)

```bash
git add apps/web/src/lib/api-types.ts apps/web/src/lib/api.ts
git commit -m "feat(web): campos de anexo no tipo Exam e api.upload"
```

---

### Task 7: UI do modal — bloco "Anexo do resultado"

**Files:**
- Modify: `apps/web/src/app/(app)/saude/components/ExamModal.tsx`

**Interfaces:**
- Produces: `ExamModal` chama `onSubmit(input: ExamInput, attachment: AttachmentIntent)`, onde
  `type AttachmentIntent = { file?: File; remove?: boolean }` (exportado deste arquivo).
- Consumes: `Exam` com campos de anexo (Task 6).

- [ ] **Step 1: Estender a assinatura e o estado do modal**

No `ExamModal.tsx`:
- Exportar o tipo e mudar a prop `onSubmit`:

```ts
export type AttachmentIntent = { file?: File; remove?: boolean };
```
```ts
  onSubmit: (input: ExamInput, attachment: AttachmentIntent) => void;
```

- Adicionar estado (junto dos outros `useState`):

```ts
  const [pendingFile, setPendingFile] = useState<File | undefined>();
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
```
(Adicionar `useRef` ao import de `react`.)

- No `useEffect` de reset (quando `open`), resetar também: `setPendingFile(undefined); setRemoveAttachment(false);`.

- No `onSubmit` do `useForm`, passar a intenção:

```ts
    onSubmit: ({ value }) => {
      onSubmit(
        {
          name: value.name.trim(),
          status,
          scheduledAt: date ? combineDateTime(date, hour, minute) : null,
        },
        { file: pendingFile, remove: removeAttachment },
      );
      onOpenChange(false);
    },
```

- [ ] **Step 2: Renderizar o bloco de anexo (só em `result_available`)**

Adicionar, depois do bloco de Status e antes do bloco de Data, dentro do `BottomSheet`:

```tsx
      {status === "result_available" ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">Anexo do resultado</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPendingFile(f);
                setRemoveAttachment(false);
              }
            }}
          />
          {(() => {
            const showFile =
              !removeAttachment &&
              (pendingFile || (initial?.attachmentName ?? null));
            if (!showFile) {
              return (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-control border border-dashed border-lilac bg-lilac-tint px-4 py-4 text-center text-sm font-bold text-lilac-deep"
                >
                  <UploadSimpleIcon size={18} weight="bold" className="mr-1 inline" />
                  Anexar resultado
                  <span className="mt-1 block text-xs font-semibold text-ink-faint">
                    PDF ou imagem · até 4 MB
                  </span>
                </button>
              );
            }
            const name = pendingFile?.name ?? initial?.attachmentName ?? "";
            const mime = pendingFile?.type ?? initial?.attachmentMime ?? "";
            const size = pendingFile?.size ?? initial?.attachmentSize ?? null;
            const isPdf = mime === "application/pdf";
            return (
              <div className="flex items-center gap-3 rounded-control border border-hairline p-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-control text-xs font-black ${isPdf ? "bg-[#fdecec] text-[#e0574f]" : "bg-[#eaf4ec] text-[#3fa15a]"}`}
                >
                  {isPdf ? "PDF" : "IMG"}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-ink">{name}</span>
                  {size ? (
                    <span className="text-xs font-semibold text-ink-faint">
                      {(size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Trocar arquivo"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-control text-lilac-deep"
                >
                  <ArrowsClockwiseIcon size={19} weight="bold" />
                </button>
                <button
                  type="button"
                  aria-label="Remover anexo"
                  onClick={() => {
                    setPendingFile(undefined);
                    setRemoveAttachment(true);
                  }}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-control text-[#c98a9a]"
                >
                  <TrashIcon size={19} weight="bold" />
                </button>
              </div>
            );
          })()}
        </div>
      ) : null}
```

Atualizar o import de ícones no topo:

```ts
import {
  ArrowsClockwiseIcon,
  TestTubeIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
```

- [ ] **Step 3: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS. (A prop `onSubmit` mudou → `page.tsx` vai acusar; corrigido na Task 8.)
Nota: se o check-types falhar **só** no call site em `page.tsx`, seguir — a Task 8 conserta. Qualquer outro erro deve ser resolvido aqui.

- [ ] **Step 4: Commit** (só se autorizado)

```bash
git add apps/web/src/app/(app)/saude/components/ExamModal.tsx
git commit -m "feat(web): bloco de anexo no ExamModal (estados + ícones)"
```

---

### Task 8: Wiring — `useExames` orquestra no Salvar + `page.tsx`

**Files:**
- Modify: `apps/web/src/app/(app)/saude/hooks/useExames.ts`
- Modify: `apps/web/src/app/(app)/saude/page.tsx:103-110` (props do `ExamModal`)

**Interfaces:**
- Consumes: `api.upload` (Task 6), `AttachmentIntent` (Task 7), rota `attachment` (Task 5).
- Produces: `create(input, attachment)` e `update(id, input, attachment)` no hook aplicam o anexo após persistir o exame.

- [ ] **Step 1: Extrair helper de anexo e usar em `create`/`update`**

Em `useExames.ts`, importar o tipo e adicionar um helper interno:

```ts
import type { AttachmentIntent } from "../components/ExamModal";
```

Adicionar dentro de `useExames` (antes de `create`):

```ts
  // Aplica a intenção de anexo depois que o exame já existe (tem id).
  const applyAttachment = useCallback(
    async (examId: string, attachment?: AttachmentIntent) => {
      if (!attachment) return;
      if (attachment.file) {
        const form = new FormData();
        form.append("file", attachment.file);
        await api.upload(`/api/exams/${examId}/attachment`, form);
      } else if (attachment.remove) {
        await api.del(`/api/exams/${examId}/attachment`);
      }
    },
    [],
  );
```

Alterar `create` para receber e aplicar o anexo:

```ts
  const create = useCallback(
    async (input: ExamInput, attachment?: AttachmentIntent) => {
      setCreating(true);
      try {
        const { exam } = await api.post<{ exam: Exam }>("/api/exams", input);
        await applyAttachment(exam.id, attachment);
        const data = await api.get<ListResponse>("/api/exams");
        list.setData(data);
      } catch (e) {
        toastError(e, "Não foi possível adicionar o exame");
      } finally {
        setCreating(false);
      }
    },
    [list, applyAttachment],
  );
```

Alterar `update` (manter o update otimista existente; aplicar anexo antes do reload). Substituir o corpo do `try`:

```ts
      try {
        await api.put(`/api/exams/${id}`, input);
        await applyAttachment(id, attachment);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar o exame");
      }
```
E a assinatura: `async (id: string, input: ExamInput, attachment?: AttachmentIntent) => {`.

- [ ] **Step 2: Passar o anexo do modal no `page.tsx`**

Em `apps/web/src/app/(app)/saude/page.tsx`, no `<ExamModal ... onSubmit={...}>`:

```tsx
        onSubmit={(input, attachment) =>
          examModal.initial
            ? exames.update(examModal.initial.id, input, attachment)
            : exames.create(input, attachment)
        }
```

- [ ] **Step 3: Type-check**

Run (da raiz): `bun check-types`
Expected: PASS (agora o call site de `page.tsx` bate com a nova prop).

- [ ] **Step 4: Rodar a suíte inteira**

Run (de `apps/web`): `bun test`
Expected: PASS.

- [ ] **Step 5: Verificação visual (obrigatória — não dizer "pronto" sem isso)**

Com `bun dev:web` e logada, em `/saude`: criar/editar um exame, escolher status "resultado disponível", anexar um PDF, Salvar (ver o `LoadingOverlay`), reabrir o exame e confirmar o chip do arquivo (nome + tamanho + ícones trocar/remover). Testar "Trocar" e "Remover". Confirmar que sem `result_available` o bloco some.

- [ ] **Step 6: Commit** (só se autorizado)

```bash
git add apps/web/src/app/(app)/saude/hooks/useExames.ts apps/web/src/app/(app)/saude/page.tsx
git commit -m "feat(web): orquestrar upload/remoção de anexo no salvar do exame"
```

---

### Task 9: ADR-0003 — anexos de exame no R2

**Files:**
- Create: `docs/adr/0003-anexos-de-exame-no-r2.md`

- [ ] **Step 1: Escrever o ADR**

Seguindo o formato dos ADRs existentes (`0001`, `0002`), create `docs/adr/0003-anexos-de-exame-no-r2.md`:

```markdown
# ADR-0003: Anexos de exame no Cloudflare R2 com acesso por proxy

## Contexto

Um exame em `result_available` pode ter o resultado anexado (PDF ou imagem).
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

- O ticket de histórico (#14) reaproveita o endpoint GET e este modelo de acesso;
  a visualização é **download simples** (`Content-Disposition: attachment`) — o SO
  do celular abre no app apropriado, sem viewer inline (o que também evita o
  problema de HEIC não renderizar inline no Chrome/Firefox).
- Órfãos no R2 são removidos ao excluir o exame, trocar ou remover o anexo.
```

- [ ] **Step 2: Commit** (só se autorizado)

```bash
git add docs/adr/0003-anexos-de-exame-no-r2.md
git commit -m "docs(adr): 0003 anexos de exame no R2 com acesso por proxy"
```

---

## Self-Review (feito na escrita)

- **Cobertura do spec:** schema (T1), envs+cliente R2 (T2), serviço attach/remove/meta/cleanup (T3-T4), rota POST/GET/DELETE (T5), api-types+upload (T6), UI modal (T7), wiring (T8), ADR (T9), órfãos nos 3 pontos (T3 troca, T4 remove+deleteExam). ✔
- **Fora de escopo (#14):** indicador no `HistorySheet` e ajuste do AC de visualização — não há task aqui, é o próximo ticket. ✔
- **Consistência de tipos:** `ExamStorage` (T2) usado em T3/T4/T5; `AttachmentIntent` (T7) consumido em T8; `attachExam` retorna `Exam | ExamStorageError` mapeado pra 404/409 na rota (T5); `getExamAttachmentMeta` retorna `{key,mime,name}|null` usado na rota GET. ✔
- **Provisão externa:** `R2_EXAM_BUCKET` (bucket privado) precisa ser criado no Cloudflare e a env preenchida no `.env` (e no Vercel via `bun env:*`) antes da verificação manual de T5/T8 — a lógica está coberta por testes de serviço que não tocam o R2 real.
```
