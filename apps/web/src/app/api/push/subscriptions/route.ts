import { db } from "@bloomy/db";
import { z } from "zod";

import {
  invalidBody,
  notFound,
  parseJson,
  requireUserId,
  unauthorized,
} from "@/server/shared/api";
import { removeSubscription, saveSubscription } from "@/server/push/service";

/** Formato de `PushSubscription.toJSON()` do navegador. */
const BODY_SCHEMA = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const DELETE_SCHEMA = z.object({ endpoint: z.url() });

export async function POST(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = BODY_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const subscription = await saveSubscription(db, userId, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });

  return Response.json({ subscription }, { status: 201 });
}

export async function DELETE(request: Request) {
  const userId = await requireUserId(request);
  if (!userId) return unauthorized();

  const parsed = DELETE_SCHEMA.safeParse(await parseJson(request));
  if (!parsed.success) return invalidBody(parsed.error);

  const removed = await removeSubscription(db, userId, parsed.data.endpoint);
  if (!removed) return notFound();

  return Response.json({ ok: true });
}
