import "server-only";

import type { z } from "zod";

import { auth } from "@bloomy/auth";

export async function requireUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
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
