"use client";

import { api, ApiError } from "@/lib/api";

const SW_PATH = "/sw.js";

/** Mesma chave pública do `VAPID_PUBLIC_KEY` do servidor. Lida direto de
 *  `process.env` (e não de `@bloomy/env/web`) porque é o padrão do repo em
 *  client — ver `app/(app)/treino/hooks/gif.ts`; a validação acontece no
 *  `next.config.ts`, que importa `@bloomy/env/web` no build. */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * Estado do push neste aparelho.
 *
 * - `unsupported` — navegador sem service worker / PushManager (inclui SSR).
 * - `unconfigured` — falta a chave VAPID no ambiente; problema de operação, não da pessoa.
 * - `default` | `granted` | `denied` — a permissão do navegador, como ela é.
 */
export type PushStatus = "unsupported" | "unconfigured" | "default" | "granted" | "denied";

export function pushStatus(): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  return Notification.permission;
}

/** A chave VAPID viaja em base64url sem padding; `applicationServerKey` quer bytes.
 *  Função pura e exportada só por causa disso: é o único ponto aqui testável sem
 *  navegador, e um erro de conversão só apareceria como `subscribe()` falhando.
 *
 *  O retorno é `Uint8Array<ArrayBuffer>`, e não `Uint8Array`: sob TS 6 o parâmetro
 *  genérico default é `ArrayBufferLike`, que inclui `SharedArrayBuffer` e por isso
 *  não satisfaz o `BufferSource` do DOM. Fixar o buffer aqui evita um cast na chamada. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Pede permissão (se ainda não foi pedida), registra o service worker, garante a
 * subscription e a registra no servidor. Devolve o estado final da permissão.
 *
 * Chamado ao ligar o **primeiro** toggle, nunca ao abrir a tela: depois da intenção
 * declarada é quando as pessoas aceitam.
 */
export async function enablePush(): Promise<PushStatus> {
  const status = pushStatus();
  if (status === "unsupported" || status === "unconfigured" || status === "denied") {
    return status;
  }

  const permission =
    status === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;

  // Reaproveita a subscription existente: chamar `subscribe()` de novo com a mesma
  // chave devolve a mesma, mas com chave diferente lança — e o upsert do servidor
  // já cuida do endpoint repetido.
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await api.post("/api/push/subscriptions", subscription.toJSON());
  return "granted";
}

/** 404 no DELETE quer dizer que o servidor já não tem a linha — o `dispatch.ts` do
 *  back apaga sozinho quando o push service devolve 404/410 numa varredura. É
 *  exatamente o estado final que `disablePush` quer alcançar, não uma falha: só
 *  esse status é benigno, qualquer outro (500, rede fora) continua subindo. */
export function isMissingSubscriptionError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/**
 * Devolve a subscription deste aparelho — chamado quando o último lembrete é
 * desligado. Servidor primeiro: se o navegador desinscrevesse antes e o DELETE
 * falhasse, a linha ficaria órfã e cada varredura tentaria um endpoint morto até
 * tomar 410.
 */
export async function disablePush(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await api.del("/api/push/subscriptions", { endpoint: subscription.endpoint });
  } catch (error) {
    if (!isMissingSubscriptionError(error)) throw error;
  }
  await subscription.unsubscribe();
}
