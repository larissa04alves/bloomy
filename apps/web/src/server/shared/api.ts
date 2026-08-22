import "server-only";

import type { z } from "zod";

import { eq } from "drizzle-orm";

import { auth } from "@bloomy/auth";
import { db } from "@bloomy/db";
import { user as userTable } from "@bloomy/db/schema/auth";
import { env } from "@bloomy/env/server";

type SessionUser = { id: string; name: string };

let devUserCache: SessionUser | null | undefined;
let devUserWarned = false;

/**
 * Fallback de desenvolvimento: com `DEV_USER_EMAIL` no `.env` e nenhuma sessão
 * válida, as rotas respondem como esse usuário — útil pra testar rotas de API
 * direto (curl/Postman) sem passar pelo login com Google. Este fallback é um
 * mecanismo separado do login de página, e vale só das rotas de API.
 * Nunca ativa em produção, mesmo se a variável escapar pro ambiente.
 */
async function devUser(): Promise<SessionUser | null> {
  const email = env.DEV_USER_EMAIL;
  if (env.NODE_ENV === "production" || !email) return null;

  if (devUserCache === undefined) {
    const rows = await db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    devUserCache = rows[0] ?? null;
  }
  if (!devUserWarned) {
    devUserWarned = true;
    // Sem interpolar o e-mail: é dado pessoal e o log pode acabar num coletor central.
    console.warn(
      devUserCache
        ? "[auth] DEV_USER_EMAIL ativo: requests sem sessão respondem como esse usuário"
        : "[auth] DEV_USER_EMAIL não existe no banco — rotas seguem em 401",
    );
  }
  return devUserCache;
}

export async function requireUserId(request: Request): Promise<string | null> {
  return (await requireUser(request))?.id ?? null;
}

/** Como `requireUserId`, mas também traz o nome — a Hoje saúda pelo primeiro nome. */
export async function requireUser(request: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) return { id: session.user.id, name: session.user.name };
  return devUser();
}

/** Lê o corpo JSON com segurança; body malformado vira `undefined` (→ zod 400, não 500). */
export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

/** 400 estável a partir de um erro do zod (primeira issue, sem o JSON cru). */
export function invalidBody(error: z.ZodError): Response {
  return badRequest(error.issues[0]?.message ?? "invalid request");
}

export function notFound(): Response {
  return Response.json({ error: "not found" }, { status: 404 });
}

export function conflict(message: string): Response {
  return Response.json({ error: message }, { status: 409 });
}
