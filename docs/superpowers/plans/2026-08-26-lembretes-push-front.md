# Lembretes com push real — Fase 2 (front) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para executar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

> **NUNCA COMMITAR.** O `CLAUDE.md` da raiz é explícito: só a Larissa commita. Cada tarefa
> termina em **checkpoint de verificação**, não em `git commit`. Entregue como mudanças
> não-commitadas.

**Goal:** Entregar a tela `/notificacoes`, o service worker e o fluxo de opt-in de Web Push,
fechando o PR 2 do spec `docs/superpowers/specs/2026-08-25-lembretes-push-design.md`.

**Architecture:** O back já está pronto e commitado (`/api/reminders`, `/api/reminders/[id]`,
`/api/push/subscriptions`, `/api/cron/reminders`, `dispatch.ts`, `slots.ts`, env VAPID). Falta
só o lado do navegador: um `public/sw.js` que mostra a notificação e abre o deep link, um
`src/lib/push.ts` que registra o SW e negocia a subscription com o servidor, e a tela
`/notificacoes` (page + hook + componentes) que liga/desliga os cinco lembretes e ajusta o
horário de treino e mente.

**Tech Stack:** Next.js 16 (App Router), React 19 + react-compiler, Tailwind 4 com tokens
`@bloomy/ui`, `vaul` (bottom sheet), `@phosphor-icons/react`, `bun test`.

## Global Constraints

- **Nunca commitar.** Sem `git commit`, `git push` ou `gh pr create` em passo nenhum.
- **Tamanho de texto sempre na escala nomeada do Tailwind** (`text-xs`, `text-sm`, `text-base`,
  `text-lg`…). Nunca `text-[13px]`. Cor arbitrária (`text-[#c9a8b8]`) é permitida.
- **`page.tsx` só renderiza.** Lógica, handlers e consts não-JSX vão para
  `hooks/useNotificacoes.ts` / `hooks/format.ts` (`apps/web/CLAUDE.md`).
- **Telas em PT, código em EN.** Nomes de arquivo de tela em PT; componentes e funções em EN.
- **Fetch e mutação via REST no hook**, com `api` de `@/lib/api`. Tela nasce com skeleton.
- **Tom do produto:** gentil, curto, sem cobrança. Erro nunca em vermelho — coral (`toastError`).
- **Uma cor por domínio:** água `lilac`, remédios `coral`, treino `pink`, mente `lilac`,
  consultas `lilac` — exatamente como `RituaisGrid` e `ConsultaCard` já pintam.
- **Rota:** `/notificacoes`, H1 `Notificações` (o rótulo que o `PerfilMenu` já usa).
- **Verificação obrigatória ao fim de cada tarefa:** `bun check-types` na raiz e `bun test`
  em `apps/web` (quando a tarefa tocar em algo testável).

## O que o back já entrega (não reimplementar)

| Superfície | Contrato |
|---|---|
| `GET /api/reminders` | `{ reminders: Reminder[] }` — cinco linhas, lazy seed, ordenadas água → remédios → treino → mente → consultas |
| `PUT /api/reminders/[id]` | corpo `{ enabled?: boolean; time?: "HH:MM" }` → `{ reminder }`. **422** se mandar `time` para água, remédios ou consultas |
| `POST /api/push/subscriptions` | corpo = `PushSubscription.toJSON()` (`{ endpoint, keys: { p256dh, auth } }`) → 201 `{ subscription }` |
| `DELETE /api/push/subscriptions` | corpo `{ endpoint }` → `{ ok: true }`, ou 404 |
| `GET /api/medications` | `{ medications: Medication[] }` — `active` diz se a linha de remédios pode ligar |
| `@/lib/api-types` | `Reminder`, `ReminderType`, `Medication` já existem |
| `@/server/reminders/slots` | módulo **client-safe** (sem `server-only`): exporta `WATER_INTERVAL_HOURS`, `WATER_WINDOW`, `DEFAULT_TIME` |
| `packages/env` | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (web) e o par VAPID + `CRON_SECRET` (server) já validados |

**Manifest já resolvido.** O spec pedia `public/manifest.json` e ícones 192/512. O repo já tem
`apps/web/src/app/manifest.ts` (rota de metadata do Next, `display: "standalone"`, tema
`#A78BD0`) apontando para `public/favicon/web-app-manifest-{192x192,512x512}.png`. O Next
injeta o `<link rel="manifest">` sozinho. **Não crie `public/manifest.json`** — seriam dois
manifests concorrentes.

## Estrutura de arquivos

```
apps/web/
  public/sw.js                                      ← CRIAR  service worker (push + click)
  src/lib/api.ts                                    ← MODIFICAR  `del` passa a aceitar corpo
  src/lib/push.ts                                   ← CRIAR  suporte, permissão, subscribe/unsubscribe
  src/lib/push.test.ts                              ← CRIAR
  src/components/toggle-switch.tsx                  ← MODIFICAR  ganha `disabled?: boolean`
  src/components/time-select.tsx                    ← MOVER de app/(app)/saude/components/TimeSelect.tsx
  src/app/(app)/saude/components/TimeSelect.tsx     ← APAGAR (3 imports atualizados)
  src/app/(app)/notificacoes/
    page.tsx                                        ← CRIAR  só renderiza
    hooks/useNotificacoes.ts                        ← CRIAR  toda a lógica
    hooks/format.ts                                 ← CRIAR  subtítulo de cada linha
    hooks/format.test.ts                            ← CRIAR
    components/LembreteCard.tsx                     ← CRIAR
    components/HorarioSheet.tsx                     ← CRIAR
    components/PermissaoAviso.tsx                   ← CRIAR
    components/NotificacoesSkeleton.tsx             ← CRIAR
    components/NotificacoesError.tsx                ← CRIAR
  src/app/(app)/home/components/PerfilMenu.tsx      ← MODIFICAR  tira `disabled` + "em breve"
docs/superpowers/specs/2026-08-25-lembretes-push-design.md  ← MODIFICAR  seção de ajustes da Fase 2
```

---

### Task 1: `api.del` aceita corpo

`DELETE /api/push/subscriptions` exige `{ endpoint }` no corpo, e o client de hoje não sabe
mandar corpo em DELETE. `request()` já suporta — só o atalho `del` não repassa.

**Files:**
- Modify: `apps/web/src/lib/api.ts` (última linha do objeto `api`)
- Test: `apps/web/src/lib/api.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `api.del<T>(path: string, body?: unknown): Promise<T>` — Task 3 usa.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao final do `describe("api client", ...)` em `apps/web/src/lib/api.test.ts`:

```ts
  it("manda corpo em DELETE quando recebe um", async () => {
    const calls: RequestInit[] = [];
    globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
      calls.push(init);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await api.del("/api/push/subscriptions", { endpoint: "https://push.example/abc" });

    expect(calls[0]!.method).toBe("DELETE");
    expect(calls[0]!.body).toBe(JSON.stringify({ endpoint: "https://push.example/abc" }));
    expect((calls[0]!.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("segue mandando DELETE sem corpo quando não recebe um", async () => {
    const calls: RequestInit[] = [];
    globalThis.fetch = mock(async (_url: string, init: RequestInit) => {
      calls.push(init);
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    await api.del("/api/meals/abc");

    expect(calls[0]!.body).toBeUndefined();
    expect(calls[0]!.headers).toBeUndefined();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd apps/web && bun test src/lib/api.test.ts
```

Esperado: FAIL no primeiro teste — `calls[0].body` vem `undefined`, porque `del` ignora o
segundo argumento.

- [ ] **Step 3: Implementar**

Em `apps/web/src/lib/api.ts`, troque a linha do `del`:

```ts
  del: <T>(path: string, body?: unknown) => request<T>(path, "DELETE", body),
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd apps/web && bun test src/lib/api.test.ts
```

Esperado: PASS em todos.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. **Não commitar.**

---

### Task 2: Service worker (`public/sw.js`)

O arquivo que recebe o push e abre a tela. É JS puro servido estaticamente — não passa pelo
bundler, então **sem `import`, sem TypeScript, sem sintaxe que o navegador não entenda direto**.

O payload é exatamente o que `notificationFor()` produz em
`apps/web/src/server/reminders/messages.ts`: `{ title, body, url, tag }`.

**Files:**
- Create: `apps/web/public/sw.js`

**Interfaces:**
- Consumes: payload `{ title: string; body: string; url: string; tag: string }` enviado por
  `dispatch.ts`.
- Produces: um SW registrável em `/sw.js` com escopo `/` — Task 3 registra.

- [ ] **Step 1: Criar o arquivo**

`apps/web/public/sw.js`:

```js
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

self.addEventListener("push", (event) => {
  const data = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      // tag agrupa: dois lembretes de água não empilham na bandeja.
      tag: data.tag,
      icon: ICON,
      data: { url: data.url },
    }),
  );
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
```

- [ ] **Step 2: Conferir que é servido**

```bash
cd /home/larissa/Projects/bloomy && bun dev:web
```

Em outro terminal:

```bash
curl -sI http://localhost:3001/sw.js | head -3
```

Esperado: `HTTP/1.1 200 OK` e `content-type: application/javascript` (ou `text/javascript`).
Derrube o dev server depois.

- [ ] **Step 3: Conferir a sintaxe**

```bash
bun build public/sw.js --target=browser --outfile=/dev/null
```

Esperado: build sem erro (só valida a sintaxe — o arquivo continua sendo servido cru).

- [ ] **Step 4: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros (`public/` não entra no `tsc`, mas a rodada confirma que nada quebrou).
**Não commitar.**

---

### Task 3: `src/lib/push.ts` — permissão e subscription

A camada entre a tela e o navegador. Responde "dá pra notificar aqui?", pede permissão,
registra o SW, cria a subscription e sincroniza com `/api/push/subscriptions`.

**Files:**
- Create: `apps/web/src/lib/push.ts`
- Test: `apps/web/src/lib/push.test.ts`

**Interfaces:**
- Consumes: `api.post` / `api.del` (Task 1), `/sw.js` (Task 2),
  `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Produces:
  - `type PushStatus = "unsupported" | "unconfigured" | "default" | "granted" | "denied"`
  - `pushStatus(): PushStatus`
  - `enablePush(): Promise<PushStatus>`
  - `disablePush(): Promise<void>`
  - `urlBase64ToUint8Array(base64: string): Uint8Array`

  Task 6 (`useNotificacoes`) consome os quatro.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/lib/push.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { urlBase64ToUint8Array } from "./push";

describe("urlBase64ToUint8Array", () => {
  it("decodifica base64url para os bytes originais", () => {
    // "Bloomy" em base64 padrão é "Qmxvb215" — sem caractere especial nem padding.
    expect([...urlBase64ToUint8Array("Qmxvb215")]).toEqual([66, 108, 111, 111, 109, 121]);
  });

  it("traduz - e _ do alfabeto base64url", () => {
    // Bytes 0xFB 0xFF 0xBE viram "+/++" em base64 padrão e "-_--" em base64url.
    expect([...urlBase64ToUint8Array("-_--")]).toEqual([251, 255, 190]);
  });

  it("repõe o padding que a chave VAPID não traz", () => {
    // "QQ" precisa de "==" para fechar o quarteto; sem isso o atob lança.
    expect([...urlBase64ToUint8Array("QQ")]).toEqual([65]);
  });

  it("devolve o tamanho que o applicationServerKey espera de uma chave VAPID", () => {
    // Chave pública VAPID real tem 65 bytes (P-256 descomprimida) = 87 chars base64url.
    const key = "B" + "A".repeat(86);
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd apps/web && bun test src/lib/push.test.ts
```

Esperado: FAIL — `Cannot find module './push'`.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/push.ts`:

```ts
"use client";

import { api } from "@/lib/api";

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
 *  navegador, e um erro de conversão só apareceria como `subscribe()` falhando. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
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

  await api.del("/api/push/subscriptions", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd apps/web && bun test src/lib/push.test.ts
```

Esperado: PASS nos quatro.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. **Não commitar.**

---

### Task 4: Subtítulo de cada lembrete (`hooks/format.ts`)

O texto sob o título de cada linha. Puro, testável, e — no caso da água — **derivado das
constantes de `slots.ts`**, para a tela nunca prometer um intervalo diferente do que o
servidor dispara.

**Files:**
- Create: `apps/web/src/app/(app)/notificacoes/hooks/format.ts`
- Test: `apps/web/src/app/(app)/notificacoes/hooks/format.test.ts`

**Interfaces:**
- Consumes: `WATER_INTERVAL_HOURS`, `WATER_WINDOW`, `DEFAULT_TIME` de
  `@/server/reminders/slots` (módulo client-safe, sem `server-only`); `ReminderType` de
  `@/lib/api-types`.
- Produces:
  - `reminderSubtitle(type: ReminderType, opts: { time: string | null; hasMedication: boolean }): string`
  - `MEDS_BLOCKED_REASON: string`

  Task 7 (`page.tsx`) consome.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/app/(app)/notificacoes/hooks/format.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { MEDS_BLOCKED_REASON, reminderSubtitle } from "./format";

const withMeds = { time: null, hasMedication: true };

describe("reminderSubtitle", () => {
  it("água anuncia o intervalo e a janela constantes", () => {
    expect(reminderSubtitle("water", withMeds)).toBe("A cada 3h, das 6h às 21h");
  });

  it("remédios apontam para o cadastro quando não há nenhum ativo", () => {
    expect(reminderSubtitle("meds", { time: null, hasMedication: false })).toBe(
      MEDS_BLOCKED_REASON,
    );
  });

  it("remédios seguem os horários cadastrados quando há remédio ativo", () => {
    expect(reminderSubtitle("meds", withMeds)).toBe("Nos horários dos seus remédios");
  });

  it("treino e mente mostram o horário escolhido", () => {
    expect(reminderSubtitle("workout", { time: "07:30", hasMedication: true })).toBe(
      "Todo dia às 07:30",
    );
    expect(reminderSubtitle("mind", { time: "22:00", hasMedication: true })).toBe(
      "Todo dia às 22:00",
    );
  });

  it("treino e mente caem no default quando a linha ainda não tem horário", () => {
    expect(reminderSubtitle("workout", withMeds)).toBe("Todo dia às 18:00");
    expect(reminderSubtitle("mind", withMeds)).toBe("Todo dia às 21:00");
  });

  it("consultas descrevem os dois avisos", () => {
    expect(reminderSubtitle("appointments", withMeds)).toBe("1 dia antes e 1 hora antes");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd apps/web && bun test "src/app/(app)/notificacoes"
```

Esperado: FAIL — `Cannot find module './format'`.

- [ ] **Step 3: Implementar**

`apps/web/src/app/(app)/notificacoes/hooks/format.ts`:

```ts
import type { ReminderType } from "@/lib/api-types";
import {
  DEFAULT_TIME,
  WATER_INTERVAL_HOURS,
  WATER_WINDOW,
} from "@/server/reminders/slots";

/** Motivo de a linha de remédios nascer desabilitada. Ligar um lembrete que
 *  comprovadamente não dispara seria pior que dizer o que falta. */
export const MEDS_BLOCKED_REASON = "Cadastre um remédio primeiro";

/** "06:00" → "6h". A tela fala como gente; o schema fala HH:MM. */
function hourLabel(time: string): string {
  return `${Number(time.slice(0, 2))}h`;
}

/**
 * Linha sob o título de cada lembrete, em PT.
 *
 * Água lê o intervalo e a janela de `slots.ts` em vez de repetir "3h" e "6h às 21h":
 * são constantes de produto e a tela não pode prometer um ritmo diferente do que a
 * varredura dispara.
 */
export function reminderSubtitle(
  type: ReminderType,
  opts: { time: string | null; hasMedication: boolean },
): string {
  switch (type) {
    case "water":
      return `A cada ${WATER_INTERVAL_HOURS}h, das ${hourLabel(WATER_WINDOW.start)} às ${hourLabel(WATER_WINDOW.end)}`;
    case "meds":
      return opts.hasMedication
        ? "Nos horários dos seus remédios"
        : MEDS_BLOCKED_REASON;
    case "workout":
      return `Todo dia às ${opts.time ?? DEFAULT_TIME.workout}`;
    case "mind":
      return `Todo dia às ${opts.time ?? DEFAULT_TIME.mind}`;
    case "appointments":
      return "1 dia antes e 1 hora antes";
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd apps/web && bun test "src/app/(app)/notificacoes"
```

Esperado: PASS nos seis.

- [ ] **Step 5: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. **Não commitar.**

---

### Task 5: Promover `TimeSelect` para componente global

A sheet de horário (Task 6) precisa do mesmo seletor HH:MM que a Saúde já usa em três modais.
Hoje ele mora dentro de `app/(app)/saude/components/` — importar de outra tela furaria o
encapsulamento, e copiar criaria dois seletores que podem divergir.

`apps/web/CLAUDE.md` diz que global é ">2 telas". Com a `/notificacoes` são 2 telas e 4 usos —
esta tarefa é o ponto em que a regra vira julgamento, e ela vem separada justamente para poder
ser recusada sem derrubar o resto do plano. Se for recusada, a alternativa é `HorarioSheet`
importar `../../saude/components/TimeSelect`.

**Files:**
- Create: `apps/web/src/components/time-select.tsx` (mesmo conteúdo, sem alteração de código)
- Delete: `apps/web/src/app/(app)/saude/components/TimeSelect.tsx`
- Modify: `apps/web/src/app/(app)/saude/components/AppointmentModal.tsx:14`
- Modify: `apps/web/src/app/(app)/saude/components/MedicationModal.tsx:12`
- Modify: `apps/web/src/app/(app)/saude/components/ExamModal.tsx:20`

**Interfaces:**
- Consumes: nada.
- Produces: `TimeSelect` em `@/components/time-select` com a mesma assinatura de hoje —
  `{ hour: string; minute: string; onChange: (next: { hour: string; minute: string }) => void }`.
  Task 6 consome.

- [ ] **Step 1: Mover o arquivo sem tocar no conteúdo**

```bash
cd /home/larissa/Projects/bloomy/apps/web
git mv "src/app/(app)/saude/components/TimeSelect.tsx" src/components/time-select.tsx
```

(`git mv` só reorganiza a árvore de trabalho e o índice — não é commit.)

- [ ] **Step 2: Atualizar os três imports**

```bash
cd /home/larissa/Projects/bloomy/apps/web
sed -i 's|import { TimeSelect } from "./TimeSelect";|import { TimeSelect } from "@/components/time-select";|' \
  "src/app/(app)/saude/components/AppointmentModal.tsx" \
  "src/app/(app)/saude/components/MedicationModal.tsx" \
  "src/app/(app)/saude/components/ExamModal.tsx"
```

- [ ] **Step 3: Conferir que não sobrou referência antiga**

```bash
cd /home/larissa/Projects/bloomy/apps/web && grep -rn "from \"./TimeSelect\"\|components/TimeSelect" src/ || echo "sem referência antiga"
```

Esperado: `sem referência antiga`.

- [ ] **Step 4: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd apps/web && bun test
```

Esperado: typecheck limpo e a suíte inteira passando. **Não commitar.**

---

### Task 6: Componentes da tela

Cinco componentes de apresentação. Nenhum busca dados nem decide regra — recebem props e
desenham. É a tarefa que um reviewer avalia por "está com a cara do Bloomy?".

Medidas do artboard "Lembretes · ajustes", já traduzidas para o que o repo tem:
card branco `rounded-card` (20px) + `shadcard`; chip de ícone via `IconChip size="lg"`;
toggle 46×27 com knob 21 = o `ToggleSwitch` de `@/components/toggle-switch`, que já nasceu
com essas medidas (`h-6.75 w-11.5`, knob `size-5.25`, ON `bg-lilac`, OFF `bg-control-off`).
**Não crie um toggle novo.**

**Files:**
- Modify: `apps/web/src/components/toggle-switch.tsx` (ganha `disabled?: boolean`)
- Create: `apps/web/src/app/(app)/notificacoes/components/LembreteCard.tsx`
- Create: `apps/web/src/app/(app)/notificacoes/components/HorarioSheet.tsx`
- Create: `apps/web/src/app/(app)/notificacoes/components/PermissaoAviso.tsx`
- Create: `apps/web/src/app/(app)/notificacoes/components/NotificacoesSkeleton.tsx`
- Create: `apps/web/src/app/(app)/notificacoes/components/NotificacoesError.tsx`

**Interfaces:**
- Consumes: `IconChip`, `ToggleSwitch`, `BottomSheet`, `TimeSelect` (Task 5), `Tone`,
  `PushStatus` (Task 3).
- Produces, para a Task 8 (`page.tsx`):
  - `LembreteCard(props: { tone: Tone; icon: ReactNode; title: string; subtitle: string; enabled: boolean; blocked?: boolean; onToggle: (next: boolean) => void; onEditTime?: () => void })`
  - `HorarioSheet(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; tone: Tone; icon: ReactNode; time: string; onSave: (time: string) => void })`
  - `PermissaoAviso(props: { status: PushStatus })`
  - `NotificacoesSkeleton()`
  - `NotificacoesError(props: { onRetry: () => void })`
  - `ToggleSwitch` passa a aceitar `disabled?: boolean`

- [ ] **Step 1: `ToggleSwitch` aceita `disabled`**

A linha de remédios sem cadastro precisa mostrar o estado real e não responder ao toque.
Um `<button>` sem `disabled` continua focável e anunciado como acionável pelo leitor de tela.

Em `apps/web/src/components/toggle-switch.tsx`, acrescente o prop:

```tsx
export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  /** Mostra o estado real, mas não aceita toque — ver `LembreteCard`. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6.75 w-11.5 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
        checked ? "bg-lilac" : "bg-control-off",
        disabled && "cursor-not-allowed",
      )}
    >
```

O resto do arquivo (o `<span>` do knob e o fechamento) fica igual. O `disabled` sozinho já
barra o clique — não acrescente guarda no `onClick`.

Confira que os usos existentes não quebraram:

```bash
cd /home/larissa/Projects/bloomy/apps/web && grep -rn "ToggleSwitch" src/ | grep -v "components/toggle-switch.tsx"
```

Esperado: os chamadores atuais seguem sem passar `disabled` — o default `false` preserva o
comportamento.

- [ ] **Step 2: `LembreteCard.tsx`**

```tsx
"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { Tone } from "@/lib/tone";

export function LembreteCard({
  tone,
  icon,
  title,
  subtitle,
  enabled,
  blocked = false,
  onToggle,
  onEditTime,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  /** Linha explicativa — vem de `reminderSubtitle`. */
  subtitle: string;
  enabled: boolean;
  /** Linha existe mas não pode ligar (ex.: remédios sem cadastro). O motivo já
   *  está no `subtitle` — some com a linha esconderia a feature. */
  blocked?: boolean;
  onToggle: (next: boolean) => void;
  /** Só treino e mente têm horário próprio; sem isso a linha não é tocável. */
  onEditTime?: () => void;
}) {
  const body = (
    <>
      <IconChip tone={tone} icon={icon} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="truncate text-xs font-semibold text-ink-read">{subtitle}</span>
      </span>
      {onEditTime ? (
        <CaretRightIcon size={16} weight="bold" className="shrink-0 text-ink-faint" />
      ) : null}
    </>
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-card bg-white p-4 shadow-card ${
        blocked ? "opacity-60" : ""
      }`}
    >
      {onEditTime && !blocked ? (
        <button
          type="button"
          onClick={onEditTime}
          aria-label={`Ajustar horário de ${title}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      <ToggleSwitch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={blocked}
        label={`Lembrete de ${title}`}
      />
    </div>
  );
}
```

Duas notas:

1. O `ToggleSwitch` fica **fora** do botão de propósito — botão dentro de botão é HTML
   inválido e o clique no toggle subiria para o de editar.
2. Com `blocked`, o toggle mostra o valor **real** guardado (a preferência continua ligada) e
   só não aceita toque. Mostrar OFF seria mentir sobre o que está no banco — e no dia em que
   um remédio for cadastrado, o lembrete passa a funcionar sem a pessoa mexer em nada.

- [ ] **Step 3: `HorarioSheet.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { TimeSelect } from "@/components/time-select";
import type { Tone } from "@/lib/tone";

/** "18:00" → { hour: "18", minute: "00" } */
function split(time: string): { hour: string; minute: string } {
  const [hour = "18", minute = "00"] = time.split(":");
  return { hour, minute };
}

const pad2 = (v: string) => (v === "" ? "00" : v.padStart(2, "0"));

export function HorarioSheet({
  open,
  onOpenChange,
  title,
  tone,
  icon,
  time,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tone: Tone;
  icon: ReactNode;
  /** Horário atual em HH:MM. */
  time: string;
  onSave: (time: string) => void;
}) {
  const [draft, setDraft] = useState(() => split(time));

  // Semeia só na abertura, mesmo motivo do MetaSheet: `time` muda de forma otimista
  // ao salvar e re-semear no meio da edição travaria os campos.
  useEffect(() => {
    if (open) setDraft(split(time));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependência deliberada só em `open`
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={icon}
      tone={tone}
      footer={
        <button
          type="button"
          onClick={() => {
            onSave(`${pad2(draft.hour)}:${pad2(draft.minute)}`);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Salvar
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-read">Horário do lembrete</span>
        <TimeSelect
          hour={draft.hour}
          minute={draft.minute}
          onChange={(next) => setDraft(next)}
        />
      </div>
      <p className="text-sm font-semibold text-ink-faint">
        A notificação chega nesse horário, todo dia.
      </p>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: `PermissaoAviso.tsx`**

```tsx
"use client";

import { BellSlashIcon } from "@phosphor-icons/react";

import type { PushStatus } from "@/lib/push";

/** Texto por estado. `granted` e `default` não aparecem: um está resolvido e o outro
 *  ainda não foi perguntado — avisar antes da intenção seria pedir permissão na porta.
 *  `unconfigured` também some: é falta de chave VAPID no ambiente, problema de
 *  operação, e não há nada que a pessoa possa fazer a respeito. */
const AVISO: Partial<Record<PushStatus, { title: string; body: string }>> = {
  denied: {
    title: "As notificações estão bloqueadas",
    body: "Suas preferências ficam salvas aqui. Para receber, libere as notificações do Bloomy nas configurações do aparelho: mantenha o ícone do app pressionado → Informações do app → Notificações.",
  },
  unsupported: {
    title: "Este navegador não recebe lembretes",
    body: "Suas preferências ficam salvas. No Android, instale o Bloomy na tela de início pelo Chrome para receber as notificações.",
  },
};

export function PermissaoAviso({ status }: { status: PushStatus }) {
  const aviso = AVISO[status];
  if (!aviso) return null;

  return (
    <div className="flex items-start gap-3 rounded-card bg-coral-tint p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-[14px] bg-white text-coral">
        <BellSlashIcon size={18} weight="fill" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-sm font-bold text-coral">{aviso.title}</span>
        <span className="text-xs font-semibold text-coral">{aviso.body}</span>
      </span>
    </div>
  );
}
```

- [ ] **Step 5: `NotificacoesSkeleton.tsx`**

```tsx
export function NotificacoesSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="size-9.5 animate-pulse rounded-control bg-lilac-tint" />
        <div className="h-6 w-36 animate-pulse rounded-control bg-lilac-tint" />
        <div className="size-9.5" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-lilac-tint-soft" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `NotificacoesError.tsx`**

```tsx
"use client";

export function NotificacoesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 text-center">
      <p className="font-display text-lg font-bold text-ink">
        Não conseguimos carregar seus lembretes
      </p>
      <p className="text-sm font-semibold text-ink-read">
        Pode ser a conexão. Tenta de novo em um instante.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 min-h-11 rounded-control bg-lilac px-5 font-display text-sm font-bold text-white shadow-btn"
      >
        Tentar de novo
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. Se `text-ink-read` ou `shadow-card` não existirem, confira os tokens em
`packages/ui/src/globals.css` — eles são usados hoje em `MetaCard.tsx`, então devem existir.
**Não commitar.**

---

### Task 7: `hooks/useNotificacoes.ts`

Todo o comportamento da tela: buscar, ligar/desligar de forma otimista, ajustar horário,
negociar a permissão no primeiro toggle ligado e devolver a subscription quando o último
é desligado.

**Files:**
- Create: `apps/web/src/app/(app)/notificacoes/hooks/useNotificacoes.ts`

**Interfaces:**
- Consumes: `api` (Task 1), `enablePush`/`disablePush`/`pushStatus`/`PushStatus` (Task 3),
  `useResource`, `toastError`, `Reminder`/`Medication` de `@/lib/api-types`.
- Produces, para a Task 8:

```ts
{
  reminders: Reminder[];
  hasMedication: boolean;
  /** `null` até o primeiro efeito no client — ver comentário no código. */
  permission: PushStatus | null;
  ready: boolean;
  error: Error | null;
  reload: () => void;
  setEnabled: (id: string, enabled: boolean) => void;
  setTime: (id: string, time: string) => void;
  sheetId: string | null;
  openSheet: (id: string) => void;
  setSheetOpen: (id: string, open: boolean) => void;
}
```

- [ ] **Step 1: Implementar**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Medication, Reminder } from "@/lib/api-types";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useNotificacoes() {
  const {
    data: remindersData,
    setData: setReminders,
    error: remindersError,
    reload: reloadReminders,
  } = useResource<{ reminders: Reminder[] }>(
    useCallback(() => api.get<{ reminders: Reminder[] }>("/api/reminders"), []),
  );

  // Os remédios entram só para saber se a linha pode ligar: sem medicação ativa o
  // lembrete não tem horário para derivar e nunca dispararia.
  const {
    data: medsData,
    error: medsError,
    reload: reloadMeds,
  } = useResource<{ medications: Medication[] }>(
    useCallback(() => api.get<{ medications: Medication[] }>("/api/medications"), []),
  );

  // `null` até o primeiro efeito: `Notification.permission` não existe no servidor, e
  // renderizar "bloqueada" no SSR pintaria o aviso coral em quem nunca foi perguntado.
  const [permission, setPermission] = useState<PushStatus | null>(null);
  useEffect(() => {
    setPermission(pushStatus());
  }, []);

  /** A permissão é pedida ao ligar o primeiro toggle — depois da intenção declarada,
   *  que é quando as pessoas aceitam. Desligar o último devolve a subscription: sem
   *  lembrete ligado não há motivo para o servidor guardar o endpoint deste aparelho. */
  const syncPush = useCallback(async (anyEnabled: boolean) => {
    try {
      if (anyEnabled) setPermission(await enablePush());
      else await disablePush();
    } catch (e) {
      // A preferência já foi salva; o que falhou foi só o registro do aparelho.
      toastError(e, "Não foi possível ativar as notificações neste aparelho");
      setPermission(pushStatus());
    }
  }, []);

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const current = remindersData;
      const found = current?.reminders.find((r) => r.id === id);
      if (!current || !found || found.enabled === enabled) return;

      const next = current.reminders.map((r) => (r.id === id ? { ...r, enabled } : r));
      // Otimista: o toggle anda no dedo, não depois do round-trip.
      setReminders({ reminders: next });

      try {
        await api.put(`/api/reminders/${id}`, { enabled });
      } catch (e) {
        setReminders(current);
        toastError(e, "Não foi possível salvar o lembrete");
        return;
      }

      await syncPush(next.some((r) => r.enabled));
    },
    [remindersData, setReminders, syncPush],
  );

  const setTime = useCallback(
    async (id: string, time: string) => {
      const current = remindersData;
      const found = current?.reminders.find((r) => r.id === id);
      if (!current || !found || found.time === time) return;

      setReminders({
        reminders: current.reminders.map((r) => (r.id === id ? { ...r, time } : r)),
      });

      try {
        await api.put(`/api/reminders/${id}`, { time });
      } catch (e) {
        setReminders(current);
        // O 422 ("this reminder has no editable time") só apareceria se a tela abrisse
        // a sheet para água, remédios ou consultas — o toast entrega o texto do servidor.
        toastError(e, "Não foi possível salvar o horário");
      }
    },
    [remindersData, setReminders],
  );

  const [sheetId, setSheetId] = useState<string | null>(null);

  return {
    reminders: remindersData?.reminders ?? [],
    hasMedication: (medsData?.medications ?? []).some((m) => m.active),
    permission,

    // `ready` só com os DOIS recursos em mãos: sem os remédios a linha de remédios
    // piscaria habilitada antes de descobrir que não há cadastro.
    ready: remindersData !== null && medsData !== null,
    error: remindersError ?? medsError,
    reload: useCallback(() => {
      reloadReminders();
      reloadMeds();
    }, [reloadReminders, reloadMeds]),

    setEnabled,
    setTime,
    sheetId,
    openSheet: useCallback((id: string) => setSheetId(id), []),
    setSheetOpen: useCallback(
      (id: string, open: boolean) => setSheetId(open ? id : null),
      [],
    ),
  };
}
```

- [ ] **Step 2: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. **Não commitar.**

---

### Task 8: `page.tsx` — a tela

Só renderiza. O mapa visual (cor, ícone, título por tipo) fica aqui porque é JSX — mesmo
lugar onde `metas/page.tsx` guarda os seus ícones.

**Files:**
- Create: `apps/web/src/app/(app)/notificacoes/page.tsx`

**Interfaces:**
- Consumes: `useNotificacoes` (Task 7), `reminderSubtitle` (Task 4), os cinco componentes
  (Task 6).
- Produces: a rota `/notificacoes` — Task 9 linka.

- [ ] **Step 1: Implementar**

```tsx
"use client";

import {
  ArrowLeftIcon,
  BarbellIcon,
  CalendarHeartIcon,
  DropIcon,
  PillIcon,
  SmileyIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ReminderType } from "@/lib/api-types";
import type { Tone } from "@/lib/tone";

import { HorarioSheet } from "./components/HorarioSheet";
import { LembreteCard } from "./components/LembreteCard";
import { NotificacoesError } from "./components/NotificacoesError";
import { NotificacoesSkeleton } from "./components/NotificacoesSkeleton";
import { PermissaoAviso } from "./components/PermissaoAviso";
import { reminderSubtitle } from "./hooks/format";
import { useNotificacoes } from "./hooks/useNotificacoes";

/** Cor e ícone de cada domínio, iguais aos da Hoje (`RituaisGrid`, `ConsultaCard`):
 *  uma cor por domínio, em todas as telas, sem exceção. Fica no `page.tsx` porque é
 *  JSX — mesmo lugar onde a Metas guarda os dela. */
const META: Record<ReminderType, { tone: Tone; icon: ReactNode; title: string }> = {
  water: { tone: "lilac", icon: <DropIcon size={22} weight="fill" />, title: "Água" },
  meds: { tone: "coral", icon: <PillIcon size={22} weight="fill" />, title: "Remédios" },
  workout: { tone: "pink", icon: <BarbellIcon size={22} weight="fill" />, title: "Treino" },
  mind: { tone: "lilac", icon: <SmileyIcon size={22} weight="fill" />, title: "Mente" },
  appointments: {
    tone: "lilac",
    icon: <CalendarHeartIcon size={22} weight="fill" />,
    title: "Consultas e exames",
  },
};

/** Só estes dois têm horário escolhido pela pessoa — os outros derivam ou são constantes. */
const TIMED: ReminderType[] = ["workout", "mind"];

export default function NotificacoesPage() {
  const n = useNotificacoes();

  if (!n.ready) {
    if (n.error) return <NotificacoesError onRetry={n.reload} />;
    return <NotificacoesSkeleton />;
  }

  const aberto = n.reminders.find((r) => r.id === n.sheetId);

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">Notificações</h1>
        <span className="size-9.5" aria-hidden="true" />
      </header>

      {n.permission ? <PermissaoAviso status={n.permission} /> : null}

      <div className="flex flex-col gap-3">
        {n.reminders.map((reminder) => {
          const meta = META[reminder.type];
          const blocked = reminder.type === "meds" && !n.hasMedication;
          return (
            <LembreteCard
              key={reminder.id}
              tone={meta.tone}
              icon={meta.icon}
              title={meta.title}
              subtitle={reminderSubtitle(reminder.type, {
                time: reminder.time,
                hasMedication: n.hasMedication,
              })}
              enabled={reminder.enabled}
              // Sem remédio cadastrado o lembrete não tem horário para derivar: ligar
              // seria prometer uma notificação que nunca sai. O toggle mostra o valor
              // guardado e o `disabled` do botão barra o toque — sem guarda no handler.
              blocked={blocked}
              onToggle={(next) => n.setEnabled(reminder.id, next)}
              onEditTime={
                TIMED.includes(reminder.type)
                  ? () => n.openSheet(reminder.id)
                  : undefined
              }
            />
          );
        })}
      </div>

      <p className="rounded-card bg-lilac-tint px-4 py-3 text-center text-sm font-semibold text-lilac-deep">
        Lembretes chegam como notificação, mesmo com o app fechado.
      </p>

      {aberto ? (
        <HorarioSheet
          open
          onOpenChange={(open) => n.setSheetOpen(aberto.id, open)}
          title={META[aberto.type].title}
          tone={META[aberto.type].tone}
          icon={META[aberto.type].icon}
          time={aberto.time ?? "18:00"}
          onSave={(time) => n.setTime(aberto.id, time)}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Checkpoint de tipos**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros. `typedRoutes: true` está ligado — se `/notificacoes` reclamar como rota
desconhecida, rode `bun dev:web` uma vez para o Next regenerar os tipos de rota.

- [ ] **Step 3: Ver a tela de pé**

```bash
cd /home/larissa/Projects/bloomy && bun dev:web
```

Abra `http://localhost:3001/notificacoes`. Esperado:
1. Skeleton e depois cinco cards na ordem água → remédios → treino → mente → consultas.
2. Todos os toggles ligados (lazy seed nasce opt-out).
3. Tocar na linha de treino abre a sheet; salvar 07:30 muda o subtítulo para
   "Todo dia às 07:30" e persiste depois de recarregar.
4. Sem remédio cadastrado, a linha de remédios aparece esmaecida com
   "Cadastre um remédio primeiro"; o toggle mostra o valor guardado e não responde ao toque.
5. Rodapé lilás com "Lembretes chegam como notificação, mesmo com o app fechado."

**Não commitar.**

---

### Task 9: `PerfilMenu` deixa de dizer "em breve"

**Files:**
- Modify: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx` (item "Notificações")

**Interfaces:**
- Consumes: a rota `/notificacoes` (Task 8).
- Produces: nada.

- [ ] **Step 1: Trocar o item**

Substitua o bloco:

```tsx
          <DropdownMenuItem disabled className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <BellIcon size={16} weight="fill" />
            </span>
            Notificações
            <span className="ml-auto text-xs font-bold text-ink-faint">
              em breve
            </span>
          </DropdownMenuItem>
```

por:

```tsx
          <DropdownMenuItem render={<Link href="/notificacoes" />} className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <BellIcon size={16} weight="fill" />
            </span>
            Notificações
          </DropdownMenuItem>
```

O `Link` já está importado no arquivo (o item "Metas" usa o mesmo padrão) — não acrescente
import nenhum.

- [ ] **Step 2: Checkpoint**

```bash
cd /home/larissa/Projects/bloomy && bun check-types
```

Esperado: sem erros.

- [ ] **Step 3: Conferir no app**

Com `bun dev:web` rodando, abra `/home`, toque no avatar: o item "Notificações" já não está
cinza, não tem badge, e leva para `/notificacoes`. **Não commitar.**

---

### Task 10: Push de ponta a ponta — PENDENTE, precisa da Larissa

> **Estado em 2026-08-26.** Tasks 1–9 estão feitas, revisadas e não-commitadas na
> árvore de trabalho. O **Step 6 desta tarefa já foi executado**: o spec
> `docs/superpowers/specs/2026-08-25-lembretes-push-design.md` ganhou a seção
> "Ajustes feitos durante a implementação da Fase 2" (10 itens) e o item 6 das
> limitações conhecidas.
>
> O que sobra abaixo **não pode ser feito por agente**: exige gerar segredos,
> aceitar a permissão de notificação num navegador de verdade e clicar na
> notificação que chega. Retomar daqui.

**Files:**
- Modify: `apps/web/.env` (4 variáveis novas — nenhuma existe hoje)

- [ ] **Step 0: decidir o `VAPID_SUBJECT`** ⚠️ BLOQUEIO

O protocolo VAPID exige um `mailto:` de contato do responsável, e ele **viaja em toda
requisição** para os push services (Google, Mozilla). Não é um campo interno.

O plano original escreveu `mailto:larissa.silva@altoqi.com.br`. Decida antes do Step 1:
esse email de trabalho, um pessoal, ou um alias do projeto.

- [ ] **Step 1: gerar as chaves VAPID**

```bash
bunx web-push generate-vapid-keys
```

Acrescente ao `apps/web/.env` (é onde moram as outras envs do app):

```
VAPID_PUBLIC_KEY=<pública>
VAPID_PRIVATE_KEY=<privada>
VAPID_SUBJECT=mailto:<o endereço decidido no Step 0>
CRON_SECRET=<32+ chars aleatórios>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<a MESMA pública>
```

Para o `CRON_SECRET`: `openssl rand -hex 24`.

**Confirmado em 2026-08-26:** nenhuma dessas cinco existe no `apps/web/.env` hoje.
As cinco já estão validadas em `packages/env` (todas opcionais — sem elas o dispatch
sai em silêncio e a tela não oferece opt-in).

Se um dia as chaves já existirem, **não regere**: trocar o par invalida todas as
subscriptions registradas.

- [ ] **Step 2: registrar o aparelho**

```bash
cd /home/larissa/Projects/bloomy && bun dev:web
```

Abra `http://localhost:3001/notificacoes` no Chrome, desligue e religue um toggle.
O navegador pede permissão — aceite.

**Esta é também a verificação visual que ficou pendente das Tasks 8 e 9.** Confira:
1. Skeleton e depois cinco cards, na ordem água → remédios → treino → mente → consultas.
2. Todos os toggles ligados (o lazy seed nasce opt-out).
3. Tocar na linha de treino abre a sheet; salvar 07:30 muda o subtítulo para
   "Todo dia às 07:30" e persiste depois de recarregar.
4. Sem remédio cadastrado, a linha de remédios aparece esmaecida com
   "Cadastre um remédio primeiro"; o toggle mostra o valor guardado e não responde ao toque.
5. Rodapé lilás com "Lembretes chegam como notificação, mesmo com o app fechado."
6. Em `/home`, o avatar → item "Notificações" já não está cinza, sem badge, e leva pra tela.

Confirme que a linha entrou no banco:

```bash
cd /home/larissa/Projects/bloomy && bun db:studio
```

Esperado: uma linha em `push_subscription` com o `user_id` da sessão.

> Se o Chrome recusar o service worker, confirme que a origem é `localhost` (SW só roda
> em `localhost` ou HTTPS) e que `/sw.js` responde 200 — isso já foi verificado na Task 2.

- [ ] **Step 3: disparar a varredura**

A rota exige o header `Authorization: Bearer <CRON_SECRET>`
(`apps/web/src/app/api/cron/reminders/route.ts:24`). O `.env` não é exportado para a
sua shell — troque `<CRON_SECRET>` pelo valor literal:

```bash
curl -s -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3001/api/cron/reminders
```

Esperado: JSON com `{ scanned, sent, missed, failed, cleaned }`. Sem o header, 401;
sem `CRON_SECRET` no ambiente, 503.

Para forçar um envio, ajuste o horário de treino ou mente na tela para o minuto
corrente e chame de novo: `sent` sobe para 1 e a notificação aparece.

- [ ] **Step 4: conferir o clique**

Clique na notificação. Esperado: a aba já aberta ganha foco e navega para `/treino`
(ou `/mente`) — sem abrir uma segunda janela.

- [ ] **Step 5: verificação final**

```bash
cd /home/larissa/Projects/bloomy && bun check-types && cd apps/web && bun run test
```

**Já rodado em 2026-08-26, limpo:** typecheck 3/3 tasks sem erros, 374/374 testes
passando. Vale re-rodar depois de qualquer ajuste que os steps acima motivarem.

- [x] **Step 6: registrar os ajustes no spec** — FEITO

- [ ] **Step 7: revisão final do branch inteiro**

Ficou pendente junto com os steps acima: uma revisão ampla faz mais sentido depois de
a feature ter sido vista funcionando. Os minors deferidos estão listados no ledger em
`.superpowers/sdd/2026-08-26-lembretes-push-front/progress.md` — dois deles merecem
triagem:

- `useNotificacoes.ts:81` — o fallback de erro do `syncPush` diz "ativar as
  notificações" nos dois ramos; se `disablePush` falhar com erro não-`ApiError`, o
  toast fala em ativar quando a ação era desligar.
- `page.tsx:126` — `time={aberto.time ?? "18:00"}` só bate com o default de treino;
  para "mente" o certo seria 21:00. Inalcançável hoje (o seed nunca grava `null` em
  workout/mind), mas latente. Correção: `DEFAULT_TIME[aberto.type]`.

---

## Cobertura do spec

| Item do spec (PR 2) | Tarefa |
|---|---|
| `manifest.json` | Já existe como `app/manifest.ts` — verificado na Task 10, nada a criar |
| `sw.js` (push + notificationclick com foco na aba aberta) | Task 2 |
| Ícones 192/512 | Já existem em `public/favicon/` |
| Rota `/notificacoes` + H1 "Notificações" | Task 8 |
| `page.tsx` só renderiza, lógica no hook | Tasks 7 e 8 |
| `LembreteCard` | Task 6 |
| `HorarioSheet` (padrão `MetaSheet`, só treino e mente) | Tasks 5, 6 e 8 |
| `PermissaoAviso` persistente quando negada | Task 6 |
| `NotificacoesSkeleton` / `NotificacoesError` | Task 6 |
| Toggle 46×27 ON `#A78BD0` / OFF `#E2D8F0`, knob 21 | `ToggleSwitch` existente (ganha `disabled`) — Task 6 |
| Card branco raio 20, chip de ícone tint do domínio | Task 6 |
| Rodapé faixa `lilac-tint` com o texto do spec | Task 8 |
| Remédios desabilitado com motivo quando não há cadastro | Tasks 4, 6 e 8 |
| Permissão pedida ao ligar o primeiro toggle | Tasks 3 e 7 |
| Toggles continuam gravando com a permissão negada | Task 7 |
| `PerfilMenu` sem `disabled` e sem "em breve" | Task 9 |
| Textos das notificações | Já feito no back (`messages.ts`) |
| Escala nomeada de texto em toda a tela | Constraint global, verificada em cada tarefa |
