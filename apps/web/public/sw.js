/* Service worker do Bloomy — só notificações.
 *
 * Não faz cache offline de propósito: o app é online e um cache mal invalidado
 * serviria tela velha depois de um deploy. Aqui mora apenas o que exige um
 * worker de verdade — receber o push com o app fechado e abrir o deep link.
 *
 * Arquivo servido estático, fora do bundler: JS puro, sem import e sem TS.
 */

const ICON = "/favicon/web-app-manifest-192x192.png";

/* Fallback quando o payload não chega ou não é o JSON esperado. Melhor uma
 * notificação genérica que um push silencioso: o Android penaliza quem recebe
 * push e não mostra nada. */
const FALLBACK = {
  title: "Bloomy",
  body: "Você tem um lembrete.",
  url: "/home",
  tag: "bloomy",
};

/* skipWaiting + claim: um SW novo assume no primeiro carregamento em vez de
 * esperar todas as abas fecharem — senão uma correção de texto ficaria presa
 * atrás de uma aba aberta há dias. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readPayload(event) {
  if (!event.data) return FALLBACK;
  try {
    return { ...FALLBACK, ...event.data.json() };
  } catch {
    return FALLBACK;
  }
}

/* Fim do descanso com o treino na frente: a tela de treino já bipou e vibrou, e a
 * notificação só avisaria duas vezes. Em qualquer outra tela do app o timer não
 * está montado — aí a notificação é o único aviso. */
async function workoutVisible() {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return windows.some(
    (client) =>
      client.visibilityState === "visible" &&
      new URL(client.url).pathname.startsWith("/treino"),
  );
}

async function handlePush(data) {
  if (data.tag === "rest" && (await workoutVisible())) return;
  await self.registration.showNotification(data.title, {
    body: data.body,
    // tag agrupa: dois lembretes de água não empilham na bandeja. renotify faz
    // a substituta tocar e vibrar — sem ele ela troca a anterior em silêncio.
    tag: data.tag,
    renotify: true,
    icon: ICON,
    // Só o aviso de descanso manda padrão próprio; os lembretes ficam no do sistema.
    ...(data.vibrate && { vibrate: data.vibrate }),
    data: { url: data.url },
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(handlePush(readPayload(event)));
});

/* Foca a aba já aberta em vez de abrir outra — quem tem o app aberto não quer
 * uma segunda janela do mesmo app. Só abre nova se não houver nenhuma. */
async function focusOrOpen(url) {
  const target = new URL(url, self.location.origin);
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windows) {
    if (new URL(client.url).origin !== target.origin) continue;
    await client.focus();
    if ("navigate" in client && client.url !== target.href) {
      await client.navigate(target.href);
    }
    return;
  }

  await self.clients.openWindow(target.href);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/home";
  event.waitUntil(focusOrOpen(url));
});
