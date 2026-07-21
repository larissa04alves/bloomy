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
  let result;
  try {
    result = await attachExam(db, examStorage, userId, id, {
      body,
      mime: file.type,
      name: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("R2 attachExam falhou:", err);
    return Response.json({ error: "erro ao processar o anexo" }, { status: 500 });
  }
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

  try {
    const object = await examStorage.get(meta.key);
    const asciiName = meta.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    const encodedName = encodeURIComponent(meta.name);
    return new Response(object.body, {
      headers: {
        "content-type": meta.mime,
        "content-disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (err) {
    console.error("R2 get falhou:", err);
    return Response.json({ error: "erro ao processar o anexo" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();
  const { id } = await params;

  const result = await removeExamAttachment(db, examStorage, userId, id);
  if (!result) return notFound();
  return Response.json({ exam: result });
}
