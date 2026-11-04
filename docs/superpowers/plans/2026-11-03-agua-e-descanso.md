# Água calculada no onboarding + aviso de fim do descanso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** sugerir a meta de água pelo peso (onboarding + Metas) e fazer o descanso do treino contar certo e avisar no fim, inclusive com a tela apagada.

**Architecture:** a fórmula fica numa função pura em `lib/` usada por client e servidor. O onboarding ganha um passo e grava altura, nascimento e pesagem na transação existente. O descanso passa a derivar o tempo de um `endsAt`, toca no app e agenda no QStash um callback que manda o push só para o aparelho que iniciou o descanso.

**Tech Stack:** Next.js 16 App Router, Drizzle + libsql/Turso, `bun test`, `web-push`, `@upstash/qstash`, service worker estático (`public/sw.js`).

**Spec:** a seção "Design aprovado" abaixo, neste mesmo arquivo.

**Branch:** `feat/agua-e-descanso` (de `origin/master` em 2026-11-03), sem upstream.

## Global Constraints

- **Nunca commitar.** Cada task termina com as mudanças não-commitadas; a Larissa revisa e commita.
- **Migrations sempre** (`packages/db/CLAUDE.md`).
  - Gerar com `bun db:generate` da raiz. **Nunca `drizzle-kit push`.**
  - O `apps/web/.env` aponta para o Turso de **produção**. Migrar só num banco local: `DATABASE_URL=file:/tmp/claude-1000/-home-larissa-Projects-bloomy/ee027661-fc10-47d1-9d92-656204478286/scratchpad/dev.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate`. Produção só na Task 8.
- **Dev server local** com o mesmo override de banco + `BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001`.
- **Fórmula da água:** `clamp(round100(kg × 35), 500, 5000)`.
- **Limites de entrada:**

  | Campo | Faixa | Observação |
  |---|---|---|
  | Altura | 100–250 cm | inteiro |
  | Peso | 20.000–300.000 g | mesma faixa de `/api/weights` |
  | Nascimento | `YYYY-MM-DD`, ≥ `1900-01-01` | ≤ hoje, no fuso BR (`dayFor()`) |

- **Código e regras do repo:**
  - Código, identificadores e erros em EN; textos de tela em PT.
  - Nada de lógica no `.tsx`: vai para os hooks (`apps/web/CLAUDE.md`).
  - Dependência nova entra no catálogo do `package.json` raiz e é usada com `"catalog:"`.
- **Implementer:**
  - `Read` em cada arquivo antes de `Edit`. Se o Edit falhar, re-`Read` antes de tentar de novo. `InputValidationError` → Edits menores.
  - Rodar `bun check-types` (raiz) e os testes antes de reportar.
  - Comando dos testes: `cd /home/larissa/Projects/bloomy/apps/web && bun test --conditions react-server <arquivo ou src>`. Sem o `--conditions`, o `server-only` quebra.
  - API de lib (QStash, Web Audio, Next): conferir com `find-docs`, nunca lendo `node_modules`.
- **Teste novo só conta se visto falhando:** escrever, rodar, ver FAIL, implementar.
- **UI pronta = verificada** no Chrome (claude-in-chrome) na rota real com o dev server local, mostrando o dado renderizado.

## Review Focus

1. **Voltar do passo 2 ao 1 e trocar o peso** → a meta da água recalcula ao avançar de novo. Uma meta ajustada à mão é sobrescrita só se o peso mudou (Task 2).
2. **Peso com vírgula ("62,5")** no input → vira 62.500 g, não `NaN` nem 62 (Task 2).
3. **"+15 s" repetido rápido / pular logo depois de começar** → no máximo um push e só do descanso vigente. A linha `rest_alarm` com `messageId` é a guarda, não o cancel (Task 6).
4. **Recarregar a página no meio do descanso** → o overlay volta com o tempo certo. Descanso de outra sessão salvo no localStorage é ignorado (Task 4).
5. **Callback do QStash sem assinatura válida** → 401 e nenhum push (Task 6).

## Design aprovado

### Por quê

1. **Água.** Quem não sabe quanto beber hoje chuta um número no stepper. A ideia é sugerir uma meta a partir do peso, sem impedir quem já sabe a própria.
2. **Descanso.** Com a tela apagada, o timer de descanso do treino congela. Ele desconta 1 s por tick de `setInterval` (`useDescanso.ts`), e o Android suspende o JS da página. Também não há som nem notificação ao fim. A pessoa treina quase sempre ouvindo música no celular.

### Objetivos

- O onboarding coleta altura, peso e data de nascimento (todos opcionais) e sugere a meta de água como **peso × 35 ml**.
- A mesma sugestão aparece ao editar a meta de água na tela Metas.
- O descanso mostra o tempo certo depois que a tela volta.
- Ao fim do descanso há aviso: som próprio + vibração com o app aberto, push com a tela apagada.

### Não-objetivos

- Usar altura e nascimento em qualquer cálculo agora. Ficam só guardados para metas futuras.
- Tela para editar altura e nascimento depois do onboarding.
- Ajuste da fórmula por idade, clima ou treino. Faixa 30–35 ml/kg também não.
- Tela de Configurações.
- Som customizado na notificação: o navegador usa o som padrão do sistema, e só a vibração é configurável.

### Anti-objetivos

Falhar nestes pontos conta como fracasso mesmo que o resto funcione.

- A tela da água ficar mais poluída que a de hoje. Foram rejeitados selo, pílulas e cartão de recomendação.
- O toque do app pausar a música da pessoa.
- Chegar push de um descanso que já foi pulado ou ajustado.
- Avisar duas vezes (som do app + notificação) com o app na frente.

### Fórmula da água

`recommendedWaterMl(kg) = clamp(round100(kg × 35), 500, 5000)`, com os limites de `GOAL_LIMITS.water`. Fonte: regra prática de 35 ml/kg usada por nutricionistas no Brasil. Não há diretriz oficial por peso. A EFSA usa valor fixo por sexo, 2,0 L/1,6 L de bebidas.

### Onboarding: de 4 para 5 passos

**Passo 1 novo, "Sobre você".** Campos de altura (cm), peso (kg) e data de nascimento, layout no padrão do `PassoLayout`.

- Cada campo é opcional e "Continuar" fica sempre habilitado.
- **"Pular" neste passo vai só para o passo da água.** Nos demais passos, "Pular" continua com o comportamento de hoje (`skipTarget`: dispensa as metas e vai para o pedido de push ou finaliza). É uma exceção deliberada, decidida pela Larissa.

**Passo 2, água, layout "C1".**

- Os dois steppers de hoje: meta do dia e porção.
- **Removidos:** as gotinhas e o hint "≈ N porções".
- **Com peso informado:**
  - a meta abre em `recommendedWaterMl(peso)`;
  - o subtítulo diz "Recomendado para o seu peso.";
  - se a meta for diferente da recomendada, o subtítulo vira "Recomendado: 2.200 ml · restaurar", e "restaurar" volta ao valor recomendado.
- **Sem peso:** tela igual à de hoje, menos as gotas e o hint.

Mockup de referência: `.superpowers/brainstorm/192886-1793753074/content/agua-limpo.html`, opção C1.

**Persistência no POST `/api/onboarding`.**

- `heightCm` e `birthDate` (`YYYY-MM-DD`) entram como colunas novas, nullable, em `profile`. Precisa de migration.
- O peso vira `upsertWeight` no dia de hoje (fuso BR, ADR-0002), em gramas.
- Tudo na mesma transação de `completeOnboarding`.
- Campos ausentes não gravam nada.

Passos 3–5 = os antigos passos 2–4 (refeições, treino, lembretes).

### Metas: sheet da água

A sheet da água ganha a mesma recomendação a partir da **última pesagem** (`listWeights`, a mais recente).

- **Sem nenhuma pesagem:** aparece um campo de peso. Digitado, gera a recomendação, e ao salvar a meta grava também a pesagem de hoje.
- O subtítulo e o "restaurar" seguem o layout C1.

### Descanso

1. **Contagem por hora de fim.**
   - O estado do descanso passa a ser `endsAt` (epoch ms), e `left` é derivado de `endsAt − Date.now()`.
   - Recalcula no tick e em `visibilitychange`.
   - `adjust(±15)` move `endsAt`; `stop` limpa.
   - Ao voltar, se já passou do fim, encerra sem tocar o som atrasado.
2. **App aberto ao fim:** toque curto próprio (Web Audio, sem arquivo) + `navigator.vibrate` com padrão próprio.
   - Requisito: não pausar a música de outro app (Spotify/YouTube).
   - Isso só se prova no Android real. Se o Web Audio pausar a música, parar e trazer para a Larissa antes de seguir.
3. **Tela apagada: push agendado no Upstash QStash.** Escolha da Larissa entre: rota esperando com `after()`; QStash; Vercel Workflows. Cron de 1 min descartado por atraso.
   - `start`: o client chama `POST /api/rest-alarm { endsAt }`. O servidor publica no QStash com `notBefore = endsAt`, destino `/api/rest-alarm/fire`, e guarda o descanso ativo da pessoa (uma linha por usuário: `messageId`, `endsAt`).
   - `adjust`: o mesmo POST com o novo `endsAt` cancela a mensagem anterior (`messages.cancel`) e publica outra.
   - `stop`: `DELETE /api/rest-alarm` cancela e apaga a linha.
   - `fire`: verifica a assinatura do QStash. Envia o push só se o `messageId` recebido for o da linha atual; senão ignora e responde 200. O cancelamento pode falhar se a mensagem já estiver a caminho, e a linha é a garantia.
   - Payload do push: `tag: "rest"`, título e corpo de fim de descanso, `url: "/treino"`, vibração própria.
   - O `sw.js` não mostra a notificação de `tag: "rest"` se houver janela do app focada/visível, para não avisar duas vezes.
   - Plano grátis: 1.000 mensagens/dia, mais que suficiente.
   - Env novas (validadas em `@bloomy/env`): `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.
   - Dev local: servidor de dev do QStash (CLI) ou túnel.
4. **Toggle "Aviso de fim do descanso"** na tela Notificações, **guardado no servidor** e válido para a conta.
   - Coluna nova em `profile`, ligada por padrão. Desligado: sem som, sem vibração e sem chamada ao `/api/rest-alarm`.
   - **Inscrição de push.** A regra "algum lembrete ligado" passa a ser "algum lembrete ligado **ou** aviso de descanso ligado", em dois lugares:
     - `saveSubscription` (`server/push/service.ts`), que hoje descarta o endpoint quando nada está ligado;
     - `syncPush` (`notificacoes/hooks/useNotificacoes.ts`), que hoje chama `disablePush`.
   - **Permissão.** Só é pedida ao ligar o toggle na tela Notificações, como os lembretes já fazem. Nunca durante o treino. Sem permissão, vale só o aviso dentro do app, e a tela mostra o aviso de ativar que já existe.

**Provisionamento e teste.**

- **Conta do Upstash.** A Larissa ainda não tem. O plano tem uma etapa parada para ela criar a conta e colar `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` no `.env` e na Vercel.
- **Onde testar.** O teste no Android real (push com a tela apagada; o toque não pausa o Spotify) é feito **em produção, depois do merge**, por decisão dela. Antes disso valem os testes automatizados e a verificação no navegador do desktop com o dev local. O risco aceito: se o toque pausar a música, isso só aparece depois de publicar e vira um fix.

**Decisões do Claude, depois do builder check (corrigíveis):**

- **Push só para o aparelho que iniciou o descanso.** A linha do descanso ativo guarda o `endpoint` desse aparelho; `fire` não usa o fan-out de `sendToDevices`. Senão o computador também apita no meio do treino.
- **Saída da sessão.** Sair do treino (`onExit`) ou concluir a sessão cancela o alarme (`DELETE`). Desmontar por recarga ou descarte da aba não cancela: o `endsAt` vai para o localStorage e, ao voltar, a sessão retoma o descanso se ele ainda não acabou.
- **Overlay.** Continua só na vista do exercício (`view === "ex"`), como hoje.
- **Sheet da água em Metas.** Segue o C1: o hint "≈ N porções" some. Sem pesagem, o campo de peso fica acima dos steppers, sem texto de apoio.
- **Env do QStash opcionais** em `@bloomy/env`, como as `VAPID_*`. Sem elas, `/api/rest-alarm` vira no-op e fica só o aviso no app.

### Abordagens consideradas

| Ponto | Opções | Escolhida |
|---|---|---|
| Entrada da recomendação | (A) pergunta "já sei / calcular" antes; (B) stepper + atalho para uma sheet; (C) cálculo como padrão; depois: passo de dados do corpo antes da água | Passo "Sobre você" antes e água pré-calculada. Layout C1, porque as versões com selo, pílulas e gotas ficaram poluídas. |
| Agendar o push | `after()` esperando na rota; QStash; Vercel Workflows; cron de 1 min | QStash, por escolha da Larissa. O cron foi descartado por atrasar até 60 s. |

### Fica para quem constrói

- Componentes dos inputs de altura, peso e nascimento: reusar o `DatePickerField` da Saúde se couber.
- Faixas de validação de altura, peso e nascimento (zod na rota + serviço, ADR-0001).
- O som exato e o padrão de vibração.
- Nome e forma da tabela do descanso ativo. Fixado na Task 6 como `rest_alarm`.

---

## Status

| Task | Status |
|---|---|
| 1. Fórmula + back do onboarding | feita (sem commit) |
| 2. Front do onboarding | feita (sem commit) |
| 3. Metas: recomendação | feita (sem commit) |
| 4. Descanso por `endsAt` + som no app | pendente |
| 5. Toggle `restAlert` + inscrição | pendente |
| 6. Back do alarme (QStash) | pendente |
| 7. Front do alarme + service worker | pendente |
| 8. Provisionamento + teste em produção (Larissa) | pendente |

---

### Task 1: Fórmula da água + back do onboarding com dados do corpo

**Files:**
- Create: `apps/web/src/lib/water.ts`, `apps/web/src/lib/water.test.ts`
- Modify: `packages/db/src/schema/profile.ts`; nova migration em `packages/db/src/migrations/` (gerada)
- Modify: `apps/web/src/server/health/weight.ts` (exportar a faixa de peso)
- Modify: `apps/web/src/app/api/weights/route.ts` (usar a constante exportada)
- Modify: `apps/web/src/lib/api-types.ts` (`OnboardingBody`, `Profile`)
- Modify: `apps/web/src/server/onboarding/service.ts`, `apps/web/src/app/api/onboarding/route.ts`
- Test: `apps/web/src/server/onboarding/service.test.ts`

**Interfaces:**
- Produces:
  - `recommendedWaterMl(kg: number): number` em `@/lib/water`. Usa `WATER_PER_KG_ML = 35` e limites 500/5000 iguais a `GOAL_LIMITS.water`, duplicados como constante local, porque `lib/` não importa `server/`.
  - `WEIGHT_GRAMS_LIMITS = { min: 20_000, max: 300_000 } as const` em `server/health/weight.ts`.
  - `HEIGHT_CM_LIMITS = { min: 100, max: 250 } as const` em `server/profile/service.ts`.
  - `BIRTH_DATE_MIN = "1900-01-01"` em `server/profile/service.ts`.
  - Colunas em `profile`:
    - `heightCm: integer("height_cm")`, nullable;
    - `birthDate: text("birth_date")`, nullable, formato `YYYY-MM-DD`.
  - `OnboardingBody` ganha `heightCm?: number; weightGrams?: number; birthDate?: string`.
  - `Profile` (api-types) ganha `heightCm: number | null; birthDate: string | null`.

- [ ] **Step 1: Testes da fórmula** em `lib/water.test.ts`:
  - `recommendedWaterMl(62)` → `2200` (2170 arredonda para 2200);
  - `recommendedWaterMl(70)` → `2500` (2450 → 2500);
  - `recommendedWaterMl(10)` → `500`;
  - `recommendedWaterMl(200)` → `5000`.
- [ ] **Step 2:** testes de `src/lib/water.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `recommendedWaterMl`; `round100` = `Math.round(x / 100) * 100`. → PASS.
- [ ] **Step 4: Testes do serviço** em `service.test.ts`, dentro de um `describe("dados do corpo")`:
  - Com `{...INPUT, heightCm: 165, weightGrams: 62_500, birthDate: "1995-03-14"}`:
    - `result.profile.heightCm === 165`;
    - `result.profile.birthDate === "1995-03-14"`;
    - `listWeights(db, userId)` devolve 1 linha com `grams === 62_500` e `day === dayFor()`.
  - Sem os três campos: `listWeights` vazio, `heightCm` e `birthDate` `null`.
  - `heightCm: 99` → `{ ok: false, reason: "out_of_range" }`, e `isOnboarded` continua `false`.
  - `weightGrams: 19_999` → `out_of_range`.
  - `birthDate` amanhã (`dayFor(new Date(Date.now() + 86_400_000))`) → `out_of_range`.
  - `birthDate: "1899-12-31"` → `out_of_range`.
- [ ] **Step 5:** Rodar → FAIL.
- [ ] **Step 6: Schema e migration.**
  - Colunas no schema; `bun db:generate` (raiz).
  - Conferir que o SQL gerado só tem `ALTER TABLE profile ADD`.
  - Aplicar no banco local (comando em Global Constraints).
- [ ] **Step 7: Serviço.**
  - `withinLimits` checa os opcionais quando presentes.
  - A transação de `completeOnboarding` grava `heightCm` e `birthDate` no `update(profile)` (só os presentes).
  - Faz insert em `weightLog` com `onConflictDoUpdate`, igual a `upsertWeight`, mas com `tx`, em `day: dayFor(now)`.
  - A rota aceita os campos opcionais no zod (`z.number().int().optional()`, `DAY_SCHEMA.optional()`) e só valida forma.
  - `/api/weights` passa a usar `WEIGHT_GRAMS_LIMITS`.
- [ ] **Step 8:** testes de `src` e `bun check-types` → PASS.
- [ ] **Step 9:** Marcar a Task 1 como feita na tabela de Status. Sem commit.

### Task 2: Front do onboarding — passo "Sobre você" + água C1

**Files:**
- Create: `apps/web/src/app/onboarding/components/PassoSobreVoce.tsx`
- Modify: `apps/web/src/app/onboarding/hooks/format.ts`, `format.test.ts`, `useOnboarding.ts`
- Modify: `apps/web/src/app/onboarding/components/FluxoOnboarding.tsx`, `PassoAgua.tsx`, `PassoRefeicoes.tsx`, `PassoTreino.tsx`, `PassoLayout.tsx`
- Ajustar também os `step={n}` fixos de cada passo.

**Interfaces:**
- Consumes: `recommendedWaterMl` (Task 1); `OnboardingBody` com os campos opcionais (Task 1).
- Produces:
  - `OnboardingStep = 1 | 2 | 3 | 4 | 5`, com 1 = Sobre você, 2 = água, 3 = refeições, 4 = treino, 5 = lembretes.
  - `OnboardingState` ganha `heightCm: number | null; weightKg: number | null; birthDate: string | null; recommendedMl: number | null`.
  - Em `@/lib/water` (compartilhado com a Task 3; testes em `lib/water.test.ts`):
    - `parseKg(raw: string): number | null`: aceita vírgula ou ponto e 1 casa decimal; vazio ou inválido → `null`.
    - `waterSubtitle(waterMl: number, recommendedMl: number | null): { text: string; restore: boolean }` (copy na Step 1).

- [ ] **Step 1: Testes** em `format.test.ts`; os de `parseKg` e `waterSubtitle` vão em `lib/water.test.ts`.
  - **Navegação, `nextStep`:**
    - `nextStep(1, x)` → `2`;
    - `nextStep(4, true)` → `5`;
    - `nextStep(4, false)` → `"finish"`.
  - **Navegação, `skipTarget`:**
    - `skipTarget(1, true)` → `2`;
    - `skipTarget(1, false)` → `2` (pula só esse passo);
    - `skipTarget(2, true)` → `5`;
    - `skipTarget(3, false)` → `"finish"`.
  - **Peso digitado, `parseKg`:**
    - `"62,5"` → `62.5`;
    - `"62.5"` → `62.5`;
    - `""` → `null`;
    - `"abc"` → `null`.
  - **Subtítulo da água, `waterSubtitle`:**
    - `waterSubtitle(2200, 2200)` → `{ text: "Recomendado para o seu peso.", restore: false }`;
    - `waterSubtitle(2500, 2200)` → `{ text: "Recomendado: 2.200 ml", restore: true }`;
    - `waterSubtitle(2000, null)` → `{ text: "A gente conta as porções ao longo do dia.", restore: false }` (o subtítulo de hoje).
  - **Payload, `onboardingPayload`:**
    - com `weightKg: 62.5, heightCm: 165, birthDate: "1995-03-14"` inclui `weightGrams: 62_500, heightCm: 165, birthDate: "1995-03-14"`;
    - com os três `null`, omite as chaves (não manda `null`).
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3: `format.ts` e `useOnboarding.ts`.**
  - **Ao avançar do passo 1 com peso:** se o peso mudou desde o último cálculo, faz `recommendedMl = recommendedWaterMl(weightKg)` e `waterMl = recommendedMl`. Se o peso não mudou, preserva o `waterMl` ajustado à mão (Review Focus 1).
  - **Sem peso:** `recommendedMl = null`, e `waterMl` fica como está.
  - **Contagem:** `totalSteps = askPush ? 5 : 4`.
  - **Limpeza:** `portionHint` sai deste `format.ts` se ficar sem uso (o de Metas é outro arquivo).
- [ ] **Step 4: `PassoSobreVoce`.**
  - Ícone e tom no padrão do `PassoLayout`. Título "Sobre você", subtítulo "Usamos para sugerir suas metas.", CTA "Continuar".
  - Três campos: altura (`inputMode="numeric"`, sufixo "cm"), peso (`inputMode="decimal"`, sufixo "kg"), data de nascimento. Reusar `DatePickerField` de `saude/components` se servir; senão `<input type="date" max={hoje}>`.
- [ ] **Step 5: `PassoAgua` C1.**
  - Remover as gotas (`MAX_GOTAS`) e o hint de porções.
  - O subtítulo vem de `waterSubtitle`. Quando `restore`, mostra a frase + " · " + botão-link "restaurar" (estilo `text-lilac-deep font-bold underline`), que volta `waterMl` para `recommendedMl`.
  - Referência visual: `.superpowers/brainstorm/192886-1793753074/content/agua-limpo.html`, C1.
- [ ] **Step 6:** testes de `src` + `bun check-types` → PASS.
- [ ] **Step 7: Verificação visual** com o dev server local e um usuário sem onboarding no banco local:
  - Em `/onboarding`, preencher 62,5 kg → o passo 2 mostra 2.200 ml e "Recomendado para o seu peso.".
  - "+" leva a 2.300 e aparece "Recomendado: 2.200 ml · restaurar". Tocar em restaurar → volta a 2.200.
  - "Pular" no passo 1 → passo 2 sem recomendação.
  - Concluir → a linha nova aparece em `weight_log` e `profile` no banco local.
  - Screenshot de cada passo.
- [ ] **Step 8:** Status da Task 2 na tabela. Sem commit.

### Task 3: Metas — recomendação na sheet da água

**Files:**
- Modify: `apps/web/src/app/(app)/metas/hooks/useMetas.ts`, `format.ts`, `format.test.ts`
- Modify: `apps/web/src/app/(app)/metas/components/MetaSheet.tsx`, `apps/web/src/app/(app)/metas/page.tsx`

**Interfaces:**
- Consumes:
  - `recommendedWaterMl` (Task 1);
  - `waterSubtitle` e `parseKg` de `@/lib/water` (Task 2);
  - `GET /api/weights` (`{ weights }`, ordenado por `day` desc) e `POST /api/weights { grams }`.
- Produces: `MetaSheet` ganha props opcionais:
  - `subtitle?: (values) => { text: string; restore?: () => void }`;
  - `weightInput?: { value: string; onChange: (raw: string) => void }`, renderizado acima dos steppers quando presente.

- [ ] **Step 1: Teste em `metas/hooks/format.test.ts`.** `latestWeightKg(weights)`:
  - `[]` → `null`;
  - `[{ day: "2026-11-02", grams: 62_000 }, { day: "2026-10-01", grams: 64_000 }]` → `62`.
- [ ] **Step 2:** Rodar → FAIL. Implementar `latestWeightKg` → PASS.
- [ ] **Step 3: `useMetas`.**
  - Carrega `/api/weights`. A spec da água perde o `hint` e ganha `subtitle`.
  - **Recomendação:**
    - Com pesagem: usa `recommendedWaterMl(latestWeightKg)`.
    - Sem pesagem: usa `weightInput`, e a recomendação sai do peso digitado (`parseKg`).
  - **Ao salvar:**
    - Se houve peso digitado válido, primeiro faz `POST /api/weights { grams }` e depois o PUT da meta, como hoje.
    - Se o POST falhar: `toastError` e não salva a meta.
  - Comportamento de "restaurar" igual ao do onboarding.
- [ ] **Step 4:** testes de `src` + `bun check-types` → PASS.
- [ ] **Step 5: Verificação visual em `/metas`.**
  - Com uma pesagem de 70 kg no banco local: a sheet da água mostra "Recomendado: 2.500 ml · restaurar" (se a meta atual ≠ 2500) e não mostra "≈ N porções".
  - Sem pesagem: aparece o campo de peso. Digitar 62 → recomendação 2.200. Salvar → nova pesagem em `/saude`.
  - Screenshots.
- [ ] **Step 6:** Status. Sem commit.

### Task 4: Descanso por hora de fim + som e vibração no app

**Files:**
- Modify: `apps/web/src/app/(app)/treino/hooks/rest.ts`, `rest.test.ts`, `useDescanso.ts`
- Create: `apps/web/src/lib/rest-alert.ts`
- Modify: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx` (passar `sessionId`; `stop` em `onExit` e ao concluir)

**Interfaces:**
- Produces:
  - `restLeft(endsAt: number, now: number): number | null` substitui `tickRest`. Arredonda para cima (`Math.ceil((endsAt - now) / 1000)`) e devolve `null` quando ≤ 0.
  - `isLateFinish(endsAt: number, now: number): boolean`: `now - endsAt > 1500`. Fim percebido com atraso (tela voltou) → encerra sem som.
  - `type SavedRest = { sessionId: string; endsAt: number; total: number }`.
  - `saveActiveRest(rest: SavedRest | null): void` e `loadActiveRest(sessionId: string, now: number): SavedRest | null`, na chave `bloomy.rest.active`. O load devolve `null` se for de outra sessão ou se já acabou.
  - `useDescanso(sessionId: string)`. O retorno mantém a forma atual (`resting, left, seconds, auto, start, stop, adjust, setAuto`).
  - `playRestEndTone(): void` e `REST_VIBRATION_PATTERN: number[]` em `@/lib/rest-alert`.
    - O tom é Web Audio: um `AudioContext` reutilizado, dois bipes curtos em ~880 Hz e ~1320 Hz, sem arquivo.
    - Vibração: `[200, 100, 200, 100, 400]`.

- [ ] **Step 1: Testes em `rest.test.ts`.**
  - **`restLeft`:**
    - `restLeft(10_000, 0)` → `10`;
    - `restLeft(10_000, 9_001)` → `1`;
    - `restLeft(10_000, 10_000)` → `null`.
  - **`isLateFinish`:**
    - `isLateFinish(10_000, 11_000)` → `false`;
    - `isLateFinish(10_000, 12_000)` → `true`.
  - **`loadActiveRest`** (com `localStorage` stubado em `globalThis.window`):
    - devolve o salvo quando `sessionId` bate e `endsAt > now`;
    - devolve `null` com outro `sessionId`;
    - devolve `null` quando `endsAt <= now`.
- [ ] **Step 2:** Rodar → FAIL. Remover os testes de `tickRest`.
- [ ] **Step 3: `useDescanso` e `rest.ts`.**
  - **Estado:** `endsAt: number | null` + `total`.
  - **Contagem:** um `setInterval` de 250 ms e um listener de `visibilitychange` recalculam `left` com `restLeft`.
  - **Ao chegar a `null`:**
    - se `!isLateFinish`, chamar `playRestEndTone()` e `navigator.vibrate?.(REST_VIBRATION_PATTERN)`;
    - em qualquer caso, limpar o estado e `saveActiveRest(null)`.
  - **Comandos:**
    - `start` grava `saveActiveRest`;
    - `adjust` move `endsAt` (com o mesmo clamp `REST_MIN..REST_MAX` sobre o restante) e regrava;
    - `stop` limpa.
  - **Restauração:** no mount, `loadActiveRest(sessionId, Date.now())`.
  - **Áudio no Android:** o `AudioContext` só toca se foi criado ou retomado num gesto. Criar ou `resume()` dentro de `start`, que nasce do toque em "concluir série".
- [ ] **Step 4: `SessaoAtiva`.**
  - Passar `sessionId` (de `detail.session.id`) para o `useDescanso`.
  - Chamar `descanso.stop()` antes de `onExit` e antes de `sessao.complete`.
- [ ] **Step 5:** testes de `src` + `bun check-types` → PASS.
- [ ] **Step 6: Verificação no Chrome desktop.** Iniciar sessão, concluir série → overlay contando.
  - Trocar de aba por 20 s e voltar → o tempo desceu ~20 s.
  - Esperar acabar com a aba visível → toca o bipe (pedir para a Larissa confirmar o áudio, se a ferramenta não captar).
  - Recarregar no meio → o overlay volta com o tempo certo.
  - "+15 s" e pular continuam funcionando.
- [ ] **Step 7:** Status. Sem commit.

### Task 5: Toggle "Aviso de fim do descanso" no servidor + regra da inscrição

**Files:**
- Modify: `packages/db/src/schema/profile.ts` + nova migration
- Modify: `apps/web/src/server/profile/service.ts`, `apps/web/src/app/api/profile/route.ts`, `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/server/push/service.ts`, `apps/web/src/server/push/service.test.ts`
- Modify: `apps/web/src/app/(app)/notificacoes/hooks/useNotificacoes.ts`, `apps/web/src/app/(app)/notificacoes/page.tsx` (+ componente de card, se o `LembreteCard` não servir sem horário)
- Modify: `apps/web/src/app/(app)/treino/hooks/useDescanso.ts` (gating)

**Interfaces:**
- Consumes: `useDescanso` da Task 4.
- Produces:
  - coluna `restAlert: integer("rest_alert", { mode: "boolean" }).default(true).notNull()`;
  - `ProfileUpdate.restAlert?: boolean`;
  - `Profile.restAlert: boolean` (api-types);
  - PATCH `/api/profile` aceita `restAlert: z.boolean().optional()`.
  - `wantsPush(db: Db, userId: string): Promise<boolean>` em `server/push/service.ts`: algum lembrete ligado **ou** `profile.restAlert`. Substitui o `reminders.some(enabled)` dentro de `saveSubscription`.

- [ ] **Step 1: Testes em `push/service.test.ts`.**
  - Com todos os lembretes desligados e `restAlert` true (default), `saveSubscription` grava e devolve a linha.
  - Com todos desligados e `restAlert` false, devolve `null` e não grava.
- [ ] **Step 2:** Rodar → FAIL (o primeiro caso devolve `null` hoje).
- [ ] **Step 3:** Coluna + `bun db:generate` (só `ADD COLUMN`) + migrate no banco local. Depois `wantsPush` + `ProfileUpdate` + rota. → PASS.
- [ ] **Step 4: Tela Notificações.**
  - Card "Aviso de fim do descanso", tom `pink` e ícone `BarbellIcon` (o mesmo do Treino), subtítulo "Som e notificação quando o descanso acabar". Fica abaixo dos lembretes.
  - **Ao alternar:** PATCH otimista em `restAlert` e, em seguida, `syncPush(anyReminderEnabled || restAlert)`.
  - **Nos toggles de lembrete:** passam a decidir também por `restAlert`.
  - **Permissão:** só aqui; nunca no treino.
- [ ] **Step 5: Gating no treino.** `useDescanso` lê `restAlert` via `GET /api/profile` (ou recebe do pai se a sessão já tiver o profile). Com `false`, sem tom e sem vibração.
- [ ] **Step 6:** testes de `src` + `bun check-types` → PASS.
- [ ] **Step 7: Verificação visual em `/notificacoes`.**
  - O card aparece. Desligar e recarregar → continua desligado.
  - Com ele desligado, um descanso no treino acaba sem bipe.
  - Screenshot.
- [ ] **Step 8:** Status. Sem commit.

### Task 6: Back do alarme de descanso (QStash)

**Files:**
- Modify: `package.json` raiz (catálogo: `@upstash/qstash`, com versão de `npm view @upstash/qstash version`) e `apps/web/package.json` (`"catalog:"`); `bun install`
- Modify: `packages/env/src/server.ts`: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `QSTASH_URL` (para o dev server da CLI), todas `.optional()`, com comentário como o das `VAPID_*`
- Modify: `packages/db/src/schema/workout.ts` (tabela `rest_alarm`) + nova migration
- Create: `apps/web/src/server/rest-alarm/service.ts`, `service.test.ts`, `qstash.ts`
- Create: `apps/web/src/app/api/rest-alarm/route.ts` (POST, DELETE), `apps/web/src/app/api/rest-alarm/fire/route.ts` (POST)

**Interfaces:**
- Consumes:
  - `wantsPush`/`profile.restAlert` (Task 5);
  - `pushSubscription` (`@bloomy/db/schema/reminder`);
  - `dropDeadSubscription` (`server/push/service.ts`).
- Produces:
  - **Tabela `restAlarm`:**
    - `userId` (pk, fk `user` cascade);
    - `messageId: text` notNull;
    - `endpoint: text` notNull;
    - `endsAt: integer timestamp_ms` notNull;
    - `createdAt`/`updatedAt` (`timestampMs`).
  - **Portas** (injetadas para teste):
    - `type RestScheduler = { publish(input: { userId: string; endsAt: Date }): Promise<string>; cancel(messageId: string): Promise<void> }`
    - `type RestPushSender = (sub: PushSubscription) => Promise<"sent" | "gone" | "failed">`
  - **Funções de `service.ts`:**
    - `scheduleRestAlarm(db, scheduler, userId, input: { endsAt: Date; endpoint: string }): Promise<"scheduled" | "disabled" | "no_subscription">`
    - `cancelRestAlarm(db, scheduler, userId): Promise<void>`
    - `fireRestAlarm(db, send, input: { userId: string; messageId: string }): Promise<"sent" | "stale" | "gone">`
  - **`qstash.ts`:**
    - `qstashScheduler(): RestScheduler | null`: `null` sem `QSTASH_TOKEN`. Usa `Client.publishJSON({ url: \`${BETTER_AUTH_URL}/api/rest-alarm/fire\`, body: { userId }, notBefore: Math.floor(endsAt / 1000) })` e `client.messages.cancel(id)`.
    - `verifyQstash(request: Request, rawBody: string): Promise<boolean>`: `Receiver` com as duas signing keys.
  - **`webPushRestSender`:** payload `{ title: "Descanso acabou", body: "Bora para a próxima série.", url: "/treino", tag: "rest", vibrate: [200, 100, 200, 100, 400] }`, opções `{ urgency: "high", TTL: 60, timeout: 10_000 }`. Push de descanso que chega depois de 1 min é pior que nenhum.

- [ ] **Step 1: Testes em `service.test.ts`**, com `createTestDb`, um scheduler fake que registra as chamadas e devolve `msg-1`, `msg-2`… e um sender fake.
  - Descanso agendado com subscription do próprio usuário → `"scheduled"`; a linha tem `messageId: "msg-1"` e o `endpoint`.
  - Reagendar → `cancel("msg-1")` chamado e linha com `"msg-2"`.
  - `cancel` que rejeita ao reagendar não impede o publish novo.
  - `restAlert` false → `"disabled"` e nenhum publish.
  - Endpoint de outro usuário ou inexistente → `"no_subscription"` e nenhum publish.
  - `fireRestAlarm` com `messageId` antigo (`"msg-1"` após reagendar) → `"stale"` e o sender não é chamado (Review Focus 3).
  - `fireRestAlarm` com o atual → `"sent"` e a linha apagada.
  - Sender devolvendo `"gone"` → a subscription é removida via `dropDeadSubscription`.
  - `cancelRestAlarm` → `cancel` chamado e a linha apagada; sem linha, não chama `cancel`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Tabela + `bun db:generate` (só `CREATE TABLE`) + migrate local. Depois implementar o serviço. → PASS.
- [ ] **Step 4: Rotas.**
  - **`POST /api/rest-alarm`**, body `{ endsAt: number (epoch ms), endpoint: string }`:
    - zod exige `0 < endsAt - Date.now() <= 15 * 60_000`;
    - sem scheduler (env ausente) → `204`, sem fazer nada;
    - senão `scheduleRestAlarm` → `200 { status }`.
  - **`DELETE /api/rest-alarm`** → `cancelRestAlarm` → `204`.
  - **`POST /api/rest-alarm/fire`:**
    - lê o corpo cru e `verifyQstash` → `401` se inválido (Review Focus 5);
    - `messageId` do header `Upstash-Message-Id`;
    - `fireRestAlarm` → sempre `200` quando a assinatura vale, mesmo `stale`, para o QStash não reentregar.
- [ ] **Step 5: Teste da rota de fire.** Request sem header `Upstash-Signature` → 401. Ver FAIL antes de implementar a checagem.
- [ ] **Step 6:** testes de `src` + `bun check-types` → PASS.
- [ ] **Step 7: Ponta a ponta local.**
  - Subir o servidor de dev do QStash (`npx @upstash/qstash-cli dev`; conferir o comando com `find-docs`). Exportar `QSTASH_URL`, `QSTASH_TOKEN` e as signing keys que ele imprime, junto do override do banco.
  - Com o dev server e um navegador desktop com push ativo: concluir uma série com descanso de 15 s e minimizar a janela → a notificação "Descanso acabou" chega em ~15 s.
  - Pular um descanso → nada chega.
- [ ] **Step 8:** Status. Sem commit.

### Task 7: Front do alarme + service worker

**Files:**
- Create: `apps/web/src/lib/rest-alarm.ts`
- Modify: `apps/web/src/app/(app)/treino/hooks/useDescanso.ts`, `apps/web/public/sw.js`

**Interfaces:**
- Consumes: as rotas da Task 6; `SW_PATH` de `@/lib/push` (exportar se ainda não for); `restAlert` (Task 5).
- Produces:
  - `scheduleRestAlarm(endsAt: number): Promise<void>`: pega a subscription via `navigator.serviceWorker.getRegistration(SW_PATH)` → `pushManager.getSubscription()`. Sem subscription, não faz nada.
  - `cancelRestAlarm(): Promise<void>`.
  - As duas engolem erro com `console.warn`. **Workaround declarado:** falha de rede não pode quebrar o descanso; o aviso no app continua valendo.

- [ ] **Step 1: Ligar no `useDescanso`.**
  - `start` e `adjust` chamam `scheduleRestAlarm(endsAt)` quando `restAlert` está ligado.
  - `stop` (pular, sair, concluir) chama `cancelRestAlarm()`.
  - O fim natural no app **não** cancela: o push do mesmo instante é barrado pelo service worker.
- [ ] **Step 2: `sw.js`.** No handler de `push`:
  - quando `data.tag === "rest"` e `clients.matchAll({ type: "window" })` tiver algum client com `visibilityState === "visible"`, não mostrar a notificação;
  - repassar `vibrate: data.vibrate` ao `showNotification`.
  - O Chrome pode exibir o aviso genérico "site atualizado em segundo plano" quando um push não mostra notificação. Anotar no Status se acontecer no teste local; quem decide o contorno é a Larissa.
- [ ] **Step 3:** `bun check-types` → PASS.
- [ ] **Step 4: Ponta a ponta local** (mesmo setup da Task 6, Step 7):
  - com a janela visível no fim → só o bipe, sem notificação;
  - minimizada → só a notificação, que ao ser clicada abre `/treino`;
  - "+15 s" duas vezes rápido → uma notificação só, no fim certo (Review Focus 3).
- [ ] **Step 5:** Status. Sem commit.

### Task 8: Provisionamento e teste em produção (Larissa, depois do merge)

Para aqui e entrega para a Larissa. Nada nesta task roda sem ela pedir.

- [ ] **Step 1:** A Larissa cria a conta no Upstash e copia `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY`. Em produção, `QSTASH_URL` fica vazio.
- [ ] **Step 2:** As variáveis entram no `.env` e na Vercel (`bun env:production`).
- [ ] **Step 3:** Migrations em produção (`bun db:migrate` com o `.env` de produção). São só aditivas (`ADD COLUMN` ×3, `CREATE TABLE`), então podem rodar antes do deploy.
- [ ] **Step 4:** Merge e deploy.
- [ ] **Step 5: Checklist no Android**, com o app instalado e o push ativo:
  - tela apagada no descanso → notificação no fim certo (anotar o atraso real);
  - Spotify tocando → o bipe do app não pausa a música (anti-objetivo);
  - pular → nenhum push;
  - app aberto → só bipe e vibração, sem notificação dupla;
  - onboarding novo com peso → meta da água recomendada.
- [ ] **Step 6:** Se o bipe pausar a música, abrir fix: alternativa só vibração quando houver mídia tocando, ou outra estratégia de áudio. Decidir com a Larissa.
