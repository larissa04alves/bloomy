import "server-only";

import webpush from "web-push";

import { env } from "@bloomy/env/server";
import { REST_VIBRATION_PATTERN } from "@/lib/rest-alert";

import type { RestPushSender } from "./service";

const PAYLOAD = JSON.stringify({
  title: "Descanso acabou",
  body: "Bora para a próxima série.",
  url: "/treino",
  tag: "rest",
  vibrate: REST_VIBRATION_PATTERN,
});

/** `TTL` de 1 min: aviso de descanso que chega depois disso é pior que nenhum.
 *  `urgency: "high"` pelo mesmo motivo do dispatch de lembretes (Doze do Android). */
const OPTIONS = { urgency: "high", TTL: 60, timeout: 10_000 } as const satisfies webpush.RequestOptions;

export const webPushRestSender: RestPushSender = async (sub) => {
  if (!env.VAPID_SUBJECT || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return "failed";
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      PAYLOAD,
      OPTIONS,
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    // Sem endpoint no log: é URL única por aparelho, tratada como dado pessoal.
    console.error(`[rest-alarm] falha ao enviar (${status ?? "sem status"})`);
    return "failed";
  }
};
