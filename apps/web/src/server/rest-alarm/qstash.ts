import "server-only";

import { Client } from "@upstash/qstash";

import { env } from "@bloomy/env/server";

import type { RestScheduler } from "./service";
import { verifySignature } from "./signature";

/** Destino do callback. `BETTER_AUTH_URL` é a URL pública do app em cada ambiente. */
const fireUrl = () => `${env.BETTER_AUTH_URL}/api/rest-alarm/fire`;

/** Agendador real. `null` sem `QSTASH_TOKEN`: o alarme fica desligado e só vale o
 *  aviso dentro do app. */
export function qstashScheduler(): RestScheduler | null {
  if (!env.QSTASH_TOKEN) return null;
  const client = new Client({
    token: env.QSTASH_TOKEN,
    ...(env.QSTASH_URL && { baseUrl: env.QSTASH_URL }),
  });

  return {
    publish: async ({ userId, endsAt }) => {
      const { messageId } = await client.publishJSON({
        url: fireUrl(),
        body: { userId },
        // `notBefore` é epoch em SEGUNDOS (UTC), não ms.
        notBefore: Math.ceil(endsAt.getTime() / 1000),
      });
      return messageId;
    },
    cancel: async (messageId) => {
      await client.messages.cancel(messageId);
    },
  };
}

/** Assinatura do callback, com as chaves do ambiente. */
export function verifyQstash(request: Request, rawBody: string): Promise<boolean> {
  const keys =
    env.QSTASH_CURRENT_SIGNING_KEY && env.QSTASH_NEXT_SIGNING_KEY
      ? { current: env.QSTASH_CURRENT_SIGNING_KEY, next: env.QSTASH_NEXT_SIGNING_KEY }
      : null;
  return verifySignature({
    signature: request.headers.get("upstash-signature"),
    rawBody,
    url: fireUrl(),
    keys,
  });
}
