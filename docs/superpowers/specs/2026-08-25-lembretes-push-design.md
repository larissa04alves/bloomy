# Lembretes com push real (issue #5)

**Data:** 2026-08-25 · **Branch:** `feat/criar-notificacoes` · **Issue:** [#5](https://github.com/larissa04alves/bloomy/issues/5)

## Objetivo

Entregar a tela de preferências de lembretes (`/notificacoes`) **e** a entrega real das
notificações por Web Push, fechando os cinco checkboxes do issue #5. Hoje o CRUD de
`reminder` existe e nenhuma tela o consome; o item "Notificações" do `PerfilMenu` está
`disabled` com badge "em breve".

Alvo: **PWA instalado em Android**. iOS fica fora desta entrega (lá o push exige o app na
Tela de Início; o `manifest.json` entra mesmo assim, porque é ele que torna o app instalável).

## Arquitetura

```
cron-job.org  ──5 min──▶  /api/cron/reminders  ──web-push──▶  Android (service worker)
 (despertador)             (varre e decide)       (VAPID)        (recebe e abre a tela)
```

Três peças independentes, cada uma trocável sem tocar nas outras:

1. **Despertador** — chama uma rota HTTP a cada 5 min. Externo ao código.
2. **Varredura** (`/api/cron/reminders`) — pergunta "quem tem slot devido agora?", envia, marca.
3. **Entrega** — `web-push` (npm), protocolo W3C com VAPID. Sem terceiro, sem conta.

### Por que varredura por janela, e não agendamento por evento

O servidor é serverless: não guarda timers, e um `setTimeout` morre no fim da requisição.
A varredura periódica resolve isso e traz três propriedades de graça:

- **Retry:** slot não entregue continua pendente e sai na varredura seguinte.
- **Resiliência a deploy:** nada fica pendurado em memória para se perder no restart.
- **Idempotência verificável:** o estado do que já foi enviado vive no banco, não no processo.

### Por que não agendar no próprio celular

Descartado com base em pesquisa, para registro:

| Ideia | Status |
|---|---|
| `Notification Triggers` (`TimestampTrigger`) | Experimento do Chrome, **descontinuado**. Não existe hoje. |
| `setTimeout` no service worker | O Android mata o SW em segundos de inatividade; o timer morre junto. |
| `Periodic Background Sync` | Existe, mas o navegador decide a frequência (~12h, sem garantia de horário). |

Push do servidor é o único caminho confiável para "toque às 18h com o app fechado".

### Por que cron-job.org e não Vercel Cron

Vercel Hobby roda cron **1x por dia** — inútil para lembretes. Mesmo no Pro, a Vercel avisa
que pode disparar em qualquer momento *dentro da hora* especificada.

cron-job.org é gratuito, sem limite de frequência e não exige SDK — só um GET autenticado.
Não tem retry, mas a varredura por janela já supre isso: uma chamada perdida é recuperada
5 minutos depois, dentro da tolerância de 30 min.

Alternativa avaliada e descartada: QStash (288 chamadas/dia contra ~500/dia de free tier —
cabe, mas sem folga, e custa uma conta e um token a mais).

### Por que web-push e não FCM/OneSignal

`web-push` fala o protocolo W3C direto com o navegador via VAPID: sem conta, sem custo,
sem enviar o token do dispositivo para terceiros. FCM só compensaria com app nativo junto;
OneSignal é plataforma de marketing, resolve problemas que o Bloomy não tem.

## Modelo de dados

### `reminder` — ampliar o enum e afrouxar `time`

`type` ganha `"appointments"`. A coluna é `text`, então **não há ALTER** para isso: muda o
`$type<>` no schema e o `z.enum` nas rotas.

```ts
type: text("type").$type<"water" | "meds" | "workout" | "mind" | "appointments">()
```

**`time` precisa virar nullable.** Hoje é `notNull`, mas três dos cinco tipos não têm
horário próprio: água é intervalo constante, remédios derivam de `medication.times` e
consultas derivam de `scheduledAt`. Sem isso, o lazy seed seria obrigado a gravar um
`"00:00"` de mentira — um valor que parece horário e não é.

```ts
time: text("time"),  // null quando o horário é derivado ou constante
```

Só `workout` e `mind` têm `time` preenchido. O zod das rotas passa a exigir `time` apenas
para esses dois, e o `PUT` rejeita com **422** tentativa de gravar horário em tipo derivado
(valor sintaticamente válido, fora da regra do recurso — conforme `apps/web/CLAUDE.md`).

Em SQLite, afrouxar `NOT NULL` recria a tabela: o Drizzle gera isso no `db:generate`, mas a
migration precisa ser **conferida à mão** antes de rodar.

### `push_subscription` (nova)

Uma linha por navegador/aparelho. N por usuário — celular e desktop convivem.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | text PK | uuid |
| `userId` | text FK → user | cascade |
| `endpoint` | text | **unique** — é a identidade da subscription |
| `p256dh` | text | chave pública do cliente |
| `auth` | text | segredo do cliente |
| `createdAt` | timestamp_ms | |

Índice: `push_subscription_user_idx (user_id)`.

**Limpeza:** quando `web-push` devolve **404 ou 410**, a subscription morreu (app
desinstalado, permissão revogada). A linha é apagada na hora, dentro do mesmo envio.

### `reminder_delivery` (nova)

Registro do que já foi entregue. É o que garante idempotência **e** viabiliza o retry.

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | text PK | uuid |
| `userId` | text FK → user | cascade |
| `reminderId` | text FK → reminder | cascade |
| `day` | text | `YYYY-MM-DD` via `dayFor()` (ADR-0002) |
| `slot` | text | `HH:MM` do horário devido |
| `refId` | text | **notNull, default `""`** — identifica o evento dentro do tipo |
| `status` | text | `"sent"` \| `"missed"` |
| `createdAt` | timestamp_ms | |

Índice único: **`reminder_delivery_unique_idx (reminder_id, day, slot, ref_id)`** — mesma
ideia do `medication_intake_unique_idx` que o projeto já usa.

**Por que `refId` existe.** Consultas e exames compartilham uma única linha de `reminder`,
mas geram vários eventos. Duas consultas diferentes marcadas para a mesma hora colidiriam
na chave `(reminder_id, day, slot)` e só uma seria notificada. `refId` guarda
`appt:<id>` ou `exam:<id>` e separa as duas.

Ele é `notNull` com default `""` — e não nullable — porque **no SQLite dois NULLs são
considerados distintos num índice único**, o que desligaria silenciosamente a idempotência
justamente para água, treino e mente, que não têm evento associado.

O insert acontece **antes** do envio. Se o unique estourar, outro processo já pegou o slot
e este pula. Se o envio falhar depois do insert, a linha fica registrada como tentativa —
o custo é uma notificação perdida em vez de duas notificações iguais, que é a troca certa.

**Retenção: 3 dias.** A própria varredura apaga o que passou disso, no fim da execução.
Sem job novo, sem infra extra, e sobra histórico para investigar "por que não recebi ontem".

## Regras por tipo de lembrete

| Linha | Quando dispara | Pula quando | Ao tocar abre |
|---|---|---|---|
| 💧 Água | 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 | meta de ml do dia já batida | `/home` |
| 💊 Remédios | cada horário distinto em `medication.times` — **um push agregado** | todas as tomas daquele horário já confirmadas | `/saude` |
| 🏋️ Treino | horário configurado (default 18:00) | não existe `workout` ativo, ou já treinou hoje | `/treino` |
| 🙂 Mente | horário configurado (default 21:00) | check-in do dia já feito | `/mente` |
| 📅 Consultas e exames | 1 dia antes **e** 1h antes de `scheduledAt` | — | `/saude` |

### Água — intervalo, não horário

`reminder.time` fica sem uso para água. O intervalo e a janela são **constantes de produto**,
não schema:

```ts
export const WATER_INTERVAL_HOURS = 3;
export const WATER_WINDOW = { start: "06:00", end: "21:00" };
// → slots: 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
```

**Dívida consciente:** tornar isso editável exige uma coluna `interval_minutes` + janela.
A decisão foi não criar schema antes de haver quem consuma. Se a janela precisar ser
ajustável, é uma migration futura, não um remendo.

### Remédios — agregado por horário, não por remédio

Três remédios às 08:00 geram **uma** notificação: *"Hora do remédio — 3 pra tomar agora"*.
A chave de idempotência é o horário, não o medicamento.

Na tela, a linha aparece **desabilitada com o motivo** ("Cadastre um remédio primeiro")
quando não há `medication` ativo — em vez de sumir (esconde a feature) ou permitir ligar
algo que comprovadamente não dispara.

### Consultas e exames — chave-mestra + flag por item

O toggle da tela é chave-mestra: **OFF derruba tudo**, mesmo consulta com
`remindDayBefore` marcado.

Com o toggle ON:

- **1h antes** → toda consulta com `status = "scheduled"` e todo exame com
  `status = "scheduled"`, ambos com `scheduledAt` preenchido e no futuro. Consulta ou exame
  em `to_schedule`, `awaiting_result` ou `completed` nunca lembra.
- **1 dia antes** → só consulta com `remindDayBefore = true`. Exame **sempre** recebe,
  porque `exam` não tem essa flag e adicioná-la sairia do escopo desta feature.

Isso preserva o significado que `remindDayBefore` já tem no `AppointmentModal` em vez de
transformá-lo num controle morto.

### Fuso

Tudo em `America/Sao_Paulo` fixo, conforme **ADR-0002**. O cron chega em UTC; a conversão
acontece **num único lugar** — `slots.ts` — e `day` é sempre gravado via `dayFor()`.

### Tolerância a atraso

Slot pendente há **menos de 30 min** ainda é enviado. Mais velho que isso é gravado como
`missed` e não toca.

Motivo: depois de uma queda longa, disparar todos os slots acumulados de uma vez é pior que
não disparar — "hora do remédio" às 23h por causa de um slot das 08h destrói a confiança na
feature inteira.

## Estado inicial (lazy seed)

`reminder` nasce vazia hoje. No **primeiro GET** de `/api/reminders`, o serviço cria as
cinco linhas:

| Tipo | `enabled` | `time` |
|---|---|---|
| `water` | ✅ | — (constante) |
| `meds` | ✅ | — (derivado de `medication.times`) |
| `workout` | ✅ | `18:00` |
| `mind` | ✅ | `21:00` |
| `appointments` | ✅ | — (derivado de `scheduledAt`) |

O seed é lazy (e não no onboarding) porque já existem usuários que passaram pelo onboarding —
eles ficariam sem lembrete nenhum.

**`appointments` nasce ON**, divergindo do protótipo (que desenha OFF). O protótipo não
previa lembrete de exame nem o aviso de 1h antes; nascer OFF significaria não receber nada
até ligar na mão, contrariando o pedido explícito.

O padrão é **opt-out** (o app lembra por padrão). O navegador ainda exige permissão, então
não há risco de notificar alguém que não consentiu.

## Interface

### Rota e navegação

- Rota: **`/notificacoes`**, H1 **"Notificações"** — alinhado ao rótulo que já existe no
  `PerfilMenu`.
- `PerfilMenu`: o item perde `disabled` e o badge "em breve", e ganha
  `render={<Link href="/notificacoes" />}` (mesmo padrão do item "Metas").

### Estrutura (segue `apps/web/CLAUDE.md`)

`page.tsx` só renderiza; toda a lógica em `hooks/useNotificacoes.ts`; fetch e mutações via
REST no hook; tela nasce com skeleton.

```
app/(app)/notificacoes/
  page.tsx
  hooks/useNotificacoes.ts
  components/LembreteCard.tsx      ← chip de ícone + título + subtítulo + toggle
  components/HorarioSheet.tsx      ← mesmo padrão do MetaSheet de /metas
  components/PermissaoAviso.tsx    ← estado da permissão do navegador
  components/NotificacoesSkeleton.tsx
  components/NotificacoesError.tsx
```

### Visual

Do artboard "Lembretes · ajustes" do protótipo, traduzido para os tokens do `@bloomy/ui`:
card branco raio 20, chip de ícone 42×42 raio 13 na cor tint do domínio, toggle 46×27
(ON `#A78BD0`, OFF `#E2D8F0`, knob 21). Rodapé com faixa `lilac-tint`:
*"Lembretes chegam como notificação, mesmo com o app fechado."*

Tamanhos de texto sempre na escala nomeada do Tailwind — nunca arbitrário.

### Editar horário

Tocar na linha de **treino** ou **mente** abre um sheet com seletor de horário, no mesmo
padrão do `MetaSheet` de `/metas`. Água (intervalo constante), remédios e consultas
(derivados) não têm sheet — só o toggle.

### Permissão de notificação

Pedida **ao ligar o primeiro toggle** — depois da intenção declarada, que é quando as
pessoas aceitam. Nunca ao entrar na tela.

Se negada, `PermissaoAviso` fica visível de forma persistente explicando como reverter nas
configurações do Android. **Os toggles continuam gravando** — a preferência fica salva para
quando a permissão for liberada.

### Textos das notificações

Gentis, curtos, um texto fixo por tipo, no tom "sem cobrança" do app:

| Tipo | Título | Corpo |
|---|---|---|
| Água | Hora da água 💧 | Um copo agora te deixa mais perto da meta. |
| Remédios | Hora do remédio | `{n}` pra tomar agora. |
| Treino | Seu treino te espera | Bora mexer o corpo? |
| Mente | Como foi seu dia? | Um check-in rápido, sem cobrança. |
| Consultas (1 dia) | Consulta amanhã | `{profissional}` às `{hora}`. |
| Consultas (1h) | Consulta em 1 hora | `{profissional}` às `{hora}`. |

### Service worker e manifest

- `public/sw.js` — trata `push` (mostra a notificação) e `notificationclick`
  (**foca a aba já aberta** se houver, em vez de abrir outra; senão abre o deep link).
- `public/manifest.json` — nome, cores do design system, `display: standalone`, ícones.
- Ícones 192px e 512px gerados a partir da marca do protótipo: quadrado lilás `#A78BD0`
  com coração branco, raio 24.

## Env novo

| Variável | Escopo | Nota |
|---|---|---|
| `VAPID_PUBLIC_KEY` | server | par gerado uma vez por `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | server | segredo |
| `VAPID_SUBJECT` | server | `mailto:` do responsável |
| `CRON_SECRET` | server | header que autentica o cron-job.org |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | web | mesma chave pública, para o `subscribe()` |

Validadas em `packages/env` (server e web separados, como já é feito) e configuradas via
`bun env:preview` / `env:production`.

## Estrutura de código

```
packages/db/src/schema/reminder.ts        ← +appointments, +push_subscription, +reminder_delivery
apps/web/src/server/reminders/
  service.ts                              ← CRUD existente + lazy seed
  slots.ts                                ← dueSlotsAt(now, estado) → slots devidos (função pura)
  slots.test.ts                           ← fuso, tolerância, janela de água, pula-se-cumprido
  dispatch.ts                             ← idempotência, envio, limpeza, retenção
  messages.ts                             ← textos por tipo
apps/web/src/server/push/service.ts       ← registrar/remover subscription, limpar 404/410
apps/web/src/app/api/cron/reminders/route.ts     ← valida CRON_SECRET → dispatch
apps/web/src/app/api/push/subscriptions/route.ts ← POST/DELETE subscription
apps/web/public/{manifest.json,sw.js,icon-192.png,icon-512.png}
apps/web/src/app/(app)/notificacoes/...
```

**`slots.ts` é o coração.** Recebe `now` e o estado (reminders, medications, appointments,
exams, progresso do dia) e devolve a lista de slots devidos. Função pura: sem `Date.now()`
interno, sem banco, sem rede — por isso é testável de verdade.

`dispatch.ts` orquestra: chama `slots.ts`, insere em `reminder_delivery`, envia por
`web-push`, limpa subscriptions mortas, apaga entregas com mais de 3 dias.

A rota de cron é um wrapper fino, como manda o ADR-0001: valida o `CRON_SECRET` e chama o
serviço. Nenhuma regra de negócio nela.

## Testes

`bun test` a partir de `apps/web`. Cobertura mínima nos pontos críticos:

- `dueSlotsAt` com fuso `America/Sao_Paulo` — inclusive a virada de dia em UTC.
- Janela e intervalo de água (06:00 e 21:00 nas bordas; 22:00 fora).
- Tolerância de 30 min: slot de 29 min envia; de 31 min vira `missed`.
- Pula-se-cumprido para água, treino e mente.
- Unique de `reminder_delivery`: duas varreduras no mesmo slot geram um envio só.
- Agregação de remédios: três medicações às 08:00 geram um slot, não três.

Sem teste de rede nem de navegador — tudo em serviço puro.

## Entrega

**PR 1 — back.** Migrations, `slots.ts` + testes, `dispatch.ts`, `messages.ts`,
`/api/cron/reminders`, `/api/push/subscriptions`, `web-push`, env. Validável por `curl`
antes de existir qualquer tela.

**PR 2 — front.** `manifest.json`, `sw.js`, ícones, `/notificacoes`, fluxo de opt-in,
item do `PerfilMenu` deixa de ser "em breve".

Migrations sempre geradas (`bun db:generate`), nunca `db:push` direto em produção.
`bun check-types` antes de cada PR.

## Limitações conhecidas

Registradas de propósito, não esquecidas:

1. **Treino toca em dia de descanso.** O lembrete dispara todo dia no horário se existe
   `workout` ativo — o schema não guarda quais dias da semana a pessoa treina (o onboarding
   grava só o *número*, em `goal` com `unit: "days"`). São ~3 avisos indevidos por semana
   para quem treina 4 dias. Resolver exige uma coluna `workout_weekdays` no `profile`.

2. **Intervalo de água não é editável.** 3h e janela 06:00–21:00 são constantes. Mudar
   exige deploy.

3. **iOS fora.** No iPhone o push só chega com o app na Tela de Início, e não há detecção
   nem aviso. Usuária de iPhone liga o toggle e não recebe nada, sem explicação.

4. **Colisão de horários.** Os slots de água às 18:00 e 21:00 coincidem com os defaults de
   treino e mente — chegam duas notificações no mesmo minuto. Não há agrupamento entre
   tipos diferentes. Vale observar no uso real antes de complicar.

5. **Sem retry no despertador.** cron-job.org não reenvia falhas. A varredura seguinte
   cobre, desde que dentro dos 30 min de tolerância.

## Ajustes feitos durante a implementação da Fase 1

Coisas que só apareceram ao escrever o código, registradas para o spec não mentir:

1. **`reminder` ganhou `UNIQUE (user_id, type)`.** O lazy seed roda no GET: dois
   requests concorrentes no primeiro acesso duplicariam as linhas. O unique deixa o
   segundo cair no `onConflictDoNothing`, mesmo padrão de `ensureGoals`.

2. **`POST` e `DELETE /api/reminders` deixaram de existir.** As cinco linhas são fixas
   e nascem do seed — a tela liga, desliga e ajusta horário, nunca cria nem apaga.
   Manter os verbos seria oferecer uma operação que quebra o modelo.

3. **A migration gerada pelo Drizzle precisou de correção à mão.** Para afrouxar o
   `NOT NULL` de `reminder.time`, o SQLite exige recriar a tabela, e o Drizzle emite
   um "derruba todos os índices → altera → recria". O recreate usa o snapshot
   anterior: os cinco índices criados nesta mesma migration eram dropados e nunca
   recriados — incluindo `reminder_delivery_unique_idx`, o que teria desligado a
   idempotência **em silêncio**, e `reminder_user_type_idx`, cujo DROP falhava contra
   um índice inexistente. Os `DROP INDEX` desses cinco foram removidos.

   **Isso vale para qualquer migration futura com `ALTER COLUMN` em SQLite.** A
   verificação é mecânica: todo índice dropado tem de existir em alguma migration
   anterior, e todo índice criado no arquivo não pode aparecer num `DROP` dele.

## Decisões de referência

ADR-0001 (REST fino + serviços) · ADR-0002 (dia local com fuso fixo) ·
`docs/README.md` §10 · artboard "Lembretes · ajustes" do protótipo.
