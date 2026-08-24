# Onboarding de 3 passos — design

Branch: `feat/criar-onboarding`
Data: 2026-08-24
Design de referência: `docs/Diario App.dc.html` (artboards `Onboarding água`, `Onboarding
refeições`, `Onboarding treino`, linhas 556–637) · `docs/README.md:117-121`

## Problema

O back-end do onboarding existe desde a fase 2 e nunca teve tela. `profile.onboardingCompletedAt`
está no banco desde a migration `0002`, `PATCH /api/profile { completeOnboarding: true }`
funciona, e o roadmap (`2026-07-07-front-roadmap.md`, F10) previa "primeiro acesso passa pelo
onboarding e cai na Home". Nada disso acontece: `(app)/layout.tsx` só checa sessão, e
`onboardingCompletedAt` é `null` para todos os usuários.

Na prática, quem entra pela primeira vez cai direto na Home com metas que nunca escolheu —
2000 ml de água, 3 refeições, 4 dias de treino, porção de 500 ml — criadas em silêncio pelo
`ensureGoals` no primeiro `GET /api/goals`. Os valores são razoáveis, mas ninguém foi perguntado.

## Enquadramento

O onboarding **não cria domínio novo**: ele é a primeira escrita nos dois lugares que já
guardam configuração — `goal.target` (3 linhas) e `profile.waterPortionMl`. Nenhuma tabela nova,
nenhuma migration.

Disso decorre o critério que resolve a maior parte das dúvidas de escopo: **o onboarding só
pergunta o que alguma tela do app já consome.** Água, porção, refeições e dias de treino passam.
Peso, altura, objetivo, horário de acordar — qualquer coisa sem consumidor — fica fora, senão o
fluxo coleta dado morto.

A segunda decisão de enquadramento: **"primeiro acesso" é um estado, não um evento.** O sinal é
`onboardingCompletedAt == null`, não "a conta acabou de ser criada". Quem autenticou com o Google
ontem e fechou o app no passo 2 tem conta existente e onboarding pendente — com o critério de
evento, essa pessoa nunca mais veria o fluxo.

## Decisões

1. **Gate por `onboardingCompletedAt`, no `(app)/layout.tsx`.** Mesmo lugar do auth-gate que já
   existe: sem sessão → `/login`; com sessão e onboarding pendente → `/onboarding`. Detectar
   "conta nova" no callback do Google foi descartado (ver Enquadramento). O custo é um `SELECT`
   por navegação dentro de `(app)`, no mesmo componente que já paga a leitura de sessão.

2. **A leitura do gate não escreve.** `ensureProfile` faz `INSERT … onConflictDoNothing`; usá-lo
   no layout viraria uma escrita em toda navegação do app. O gate usa
   `isOnboarded(db, userId)`, um `SELECT` de uma coluna. **Linha de `profile` ausente conta como
   pendente** — é o mesmo estado semântico de `onboardingCompletedAt` nulo, e o `profile` só
   nasce quando alguém toca `/api/profile`.

3. **`/onboarding` fora do grupo `(app)`.** Sem tab bar (o fluxo é linear, não navegável),
   com gate próprio: sem sessão → `/login`; **já concluído → `/home`**. Sem esse segundo
   redirect, quem digitasse a URL depois teria uma segunda chance de sobrescrever as próprias
   metas sem querer. É o mesmo desenho que a spec do app shell já previa
   (`2026-07-07-front-design.md:73`).

4. **Uma rota, `step` no state.** `app/onboarding/page.tsx` (server, só o gate) renderiza um
   fluxo client que guarda `step` e os quatro valores. Três rotas (`/onboarding/agua`, …) daria
   URL por passo e botão-voltar do browser, mas obrigaria os valores a viajar entre rotas por
   query string ou store — complicação real para uma escrita que só acontece no fim. O "Voltar"
   da tela é o caminho de volta; o botão do browser sai do fluxo, e o gate traz de volta.

5. **Três passos, com a porção junto da água.** Você citou quatro valores, mas a porção não é
   uma meta — é preferência de comportamento, do mesmo naipe de `restSeconds`. A tela de Metas
   já resolveu isso: a sheet de hidratação traz *Meta do dia* e *Cada porção* juntos, com hint
   vivo. O onboarding repete esse par no passo 1 e mantém as três telas do protótipo.

6. **Tudo em ml, dois steppers no passo 1.** O protótipo diz "8 copos · ≈ 2 litros", mas "copo"
   *é* a porção — perguntar copos e porção seria perguntar duas vezes a mesma coisa, com a
   agravante de a meta virar produto de dois steppers e discordar do stepper de ml da tela de
   Metas. Isso mantém a decisão 4 da spec de Metas ("toda a hidratação fala em ml"): ml é a única
   unidade que continua verdadeira em qualquer configuração. A fileira de gotas do protótipo
   sobrevive como ilustração das porções.

7. **Passo 3: seletor visual dos 7 dias, salvando só a contagem.** O protótipo mostra
   `S T Q Q S S D` com alguns marcados, e a escolha visual é boa demais para virar stepper. Mas
   `goal.workout` só guarda um número, e nenhuma tela do app consome dia-da-semana hoje — então
   *quais* dias não é persistido. Trade-off consciente: a tela promete uma granularidade que o
   dado não tem. Aceito porque o seletor comunica melhor "quantos dias" do que um `−/+`, e
   persistir os dias é uma feature própria (ver Fora de escopo).

8. **Zero dias marcados cai no default, anunciado na tela.** `GOAL_LIMITS.workout.min` é 1;
   zero não é alvo válido. O seletor abre **sem nenhum dia marcado** (convida a escolher) e o
   hint, que normalmente diz "4 dias por semana", passa a dizer *"Sem dias escolhidos — vamos
   usar 4 dias por semana"*. O default continua acontecendo, mas deixa de ser silencioso.

9. **Steppers abrem nas constantes de default, sem request no mount.** A tela renderiza
   instantânea, sem estado de loading no passo 1. Consequência aceita: quem já tem metas
   ajustadas e atravessa o fluxo confirmando os defaults volta para 2000/3/4 — situação que só
   existe para as contas atuais, todas em desenvolvimento (ver decisão 12).

10. **`DEFAULT_GOAL_TARGETS` passa a morar em `lib/api-types.ts`.** O client precisa de 2000/3/4
    para pré-popular, e `DEFAULT_GOALS` é `"server-only"`. `api-types.ts` já é a casa desse tipo
    de constante compartilhada — `server/shared/units.ts` importa `DEFAULT_PORTION_ML` de lá. Com
    isso o literal `2000` deixa de existir em quatro lugares: `DEFAULT_GOALS` deriva da constante
    e os três fallbacks de tela (`corpo/useGoals.ts:21`, `metas/useMetas.ts:85`,
    `today/service.ts:49`) passam a lê-la.

11. **Os defaults seguem 2000 ml / 3 refeições / 4 dias / porção 500 ml.** A conversa levantou
    1 L e 3 dias como alternativa; ficou decidido manter os números atuais, que são os do
    protótipo e do `README`. Registrado aqui porque é a decisão que define o que o "Pular" grava.

12. **Sem backfill.** Nenhuma migration marca os usuários existentes como concluídos — todos
    passam pelo fluxo uma vez, incluindo as contas de desenvolvimento, o que serve como teste
    real. Quem quiser preservar metas já ajustadas ou ajusta no próprio fluxo, ou preenche
    `onboarding_completed_at` no `bun db:studio` antes de abrir o app.

13. **`POST /api/onboarding` único, dentro de uma transação.** As alternativas eram
    `GET /api/goals` + até 3 `PUT` + 1 `PATCH` (quatro requests, estado parcial se o terceiro
    falhar) ou salvar a cada passo. Uma rota só grava as três metas, a porção e a conclusão de
    uma vez, com `db.transaction` — o precedente do repo para escrita composta
    (`health/service.ts`, `workout/session.ts`).

14. **A rota é idempotente e sobrescreve.** Duplo clique, reload ou aba antiga reenviando o POST
    devolve 200 e regrava os mesmos valores, em vez de 409 na cara de quem só tocou duas vezes.
    O upsert usa o `UNIQUE(user_id, domain)` que a tabela `goal` já tem. Um 409 protegeria contra
    sobrescrita, mas a proteção real é a decisão 3: quem já concluiu nem chega na tela.

15. **"Pular" é o mesmo submit, antecipado.** Em qualquer passo, "Pular" envia o state atual —
    respostas já dadas mais os defaults do que não foi visitado — e conclui. Um caminho de
    escrita só, nada de "pular sem gravar": deixar `onboardingCompletedAt` nulo faria o gate
    perseguir para sempre quem pulou de propósito.

16. **Estado em `useState`; falha mantém a pessoa na tela.** Erro no POST mostra `toastError`
    (padrão do app) e preserva os valores para tentar de novo. Fechar o app no meio perde o
    progresso — são três perguntas com default, e espelhar em `sessionStorage` traria um modo de
    falha novo (dado velho depois de deploy) sem precedente no repo.

17. **Fade curto entre passos.** Token novo `--animate-fade-in` (~150 ms) no
    `packages/ui/src/styles/globals.css`, registrado no bloco `prefers-reduced-motion: reduce`
    que já existe, mais `transition` na barra de progresso. Só CSS, sem lib — mesmo desenho da
    animação do login.

## Servidor

### Constantes

```ts
// lib/api-types.ts  (compartilhado client/server, como DEFAULT_PORTION_ML)
export const DEFAULT_GOAL_TARGETS = {
  water: 2000,
  meals: 3,
  workout: 4,
} as const satisfies Record<GoalDomain, number>;
```

`server/goals/service.ts` deriva os defaults dela em vez de repetir os números:

```ts
export const DEFAULT_GOALS = [
  { domain: "water",   target: DEFAULT_GOAL_TARGETS.water,   unit: "ml",    period: "day"  },
  { domain: "meals",   target: DEFAULT_GOAL_TARGETS.meals,   unit: "count", period: "day"  },
  { domain: "workout", target: DEFAULT_GOAL_TARGETS.workout, unit: "days",  period: "week" },
] as const;
```

`GOAL_LIMITS` e `PORTION_LIMITS` não mudam: continuam donos da regra de faixa, agora consumidos
também pelo zod da rota nova.

### `server/onboarding/service.ts`

```ts
export type OnboardingInput = {
  waterMl: number;
  portionMl: number;
  meals: number;
  workoutDays: number;
};

/** Estado do gate. Só lê — `ensureProfile` escreveria a cada navegação. */
export async function isOnboarded(db: Db, userId: string): Promise<boolean>;

/** Grava as 3 metas + a porção + a conclusão numa transação. Idempotente. */
export async function completeOnboarding(
  db: Db,
  userId: string,
  input: OnboardingInput,
): Promise<{ goals: Goal[]; profile: Profile }>;
```

`isOnboarded` faz um `SELECT onboarding_completed_at FROM profile WHERE user_id = ?`; linha
ausente ou coluna nula → `false`.

`completeOnboarding`, dentro de `db.transaction`:

1. Três `INSERT … ON CONFLICT (user_id, domain) DO UPDATE SET target, updated_at` — o upsert que
   torna a rota idempotente e cobre tanto quem já tem metas (criadas pelo `ensureGoals`) quanto
   quem não tem.
2. `INSERT INTO profile … ON CONFLICT DO NOTHING` seguido de `UPDATE` de `water_portion_ml` e
   `onboarding_completed_at`. **Escrito inline com `tx`, não chamando `ensureProfile`**: o helper
   recebe `Db`, e o `tx` do drizzle não é assinável a esse tipo. É o mesmo padrão das transações
   que já existem (`health/service.ts`, `workout/session.ts`), onde nenhuma query dentro do
   bloco passa por helper externo.
3. Devolve as metas e o profile resultantes, para o client não precisar de um GET depois.

As faixas não são revalidadas aqui: o zod da rota já barra com os mesmos `GOAL_LIMITS`/
`PORTION_LIMITS`, e diferente do `PUT /api/goals/[id]` o handler **sabe** qual domínio é cada
número — não há o problema que obrigou `updateGoal` a validar por dentro.

### Contrato

| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/api/onboarding` | `{ waterMl, portionMl, meals, workoutDays }` | `{ goals, profile }` |

```ts
const BODY_SCHEMA = z.object({
  waterMl:     z.number().int().min(GOAL_LIMITS.water.min).max(GOAL_LIMITS.water.max),
  portionMl:   z.number().int().min(PORTION_LIMITS.min).max(PORTION_LIMITS.max),
  meals:       z.number().int().min(GOAL_LIMITS.meals.min).max(GOAL_LIMITS.meals.max),
  workoutDays: z.number().int().min(GOAL_LIMITS.workout.min).max(GOAL_LIMITS.workout.max),
});
```

Todos os campos são obrigatórios: o client sempre tem os quatro valores em mãos (default ou
escolhido), então campo opcional só criaria um segundo lugar onde o default é decidido. 401 sem
sessão, 400 em body inválido — `server/shared/api.ts`, como as outras rotas.

### Gate

```ts
// app/(app)/layout.tsx
const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect("/login");
if (!(await isOnboarded(db, session.user.id))) redirect("/onboarding");
```

## Front

```
app/onboarding/
  page.tsx                        # server: gate (sem sessão → /login; concluído → /home)
  components/FluxoOnboarding.tsx  # client: renderiza o passo atual + transição
  components/PassoLayout.tsx      # progresso 3 segmentos + "Passo N de 3" + Pular + hero + CTA
  components/PassoAgua.tsx        # 2 steppers em ml + hint de porções + gotas
  components/PassoRefeicoes.tsx   # stepper 1–8 + chips Café/Almoço/Jantar
  components/PassoTreino.tsx      # SeletorDias + hint
  components/SeletorDias.tsx      # 7 círculos S T Q Q S S D
  hooks/useOnboarding.ts          # step, valores, submit, skip
  hooks/format.ts                 # hints em PT + payload  (puro, testável)
```

Segue a convenção do repo: `.tsx` sem lógica, hook com o estado, helpers puros em `format.ts`
com teste ao lado.

### `useOnboarding`

```ts
type OnboardingState = {
  step: 1 | 2 | 3;
  waterMl: number;      // DEFAULT_GOAL_TARGETS.water
  portionMl: number;    // DEFAULT_PORTION_ML
  meals: number;        // DEFAULT_GOAL_TARGETS.meals
  workoutDays: Set<number>;  // vazio no início — 0..6, seg→dom
};
```

Expõe `next()`, `back()`, `skip()`, `submit()`, `pending` e os setters. `skip()` e `submit()`
chamam o mesmo `POST /api/onboarding`; a única diferença é que `skip()` não espera o passo 3.
Sucesso → `router.replace("/home")` (`replace`, não `push`: o fluxo não deve voltar pelo
histórico). Falha → `toastError(e, "Não foi possível salvar suas metas. Tente de novo.")` e a
pessoa fica onde está.

### `format.ts`

```ts
/** "≈ 4 porções por dia" — reusa portions() para arredondar igual à Corpo e à Metas. */
export function porcoesHint(goalMl: number, portionMl: number): string;

/** 0 → "Sem dias escolhidos — vamos usar 4 dias por semana"; 1 → "1 dia por semana"; … */
export function diasHint(count: number): string;

/** State → body do POST. Zero dias cai em DEFAULT_GOAL_TARGETS.workout. */
export function onboardingPayload(state: OnboardingState): OnboardingInput;
```

`porcoesHint` chama a mesma `portions()` de `server/shared/units.ts` que a tela de Metas usa —
Corpo, Metas e onboarding nunca podem discordar sobre quantas porções cabem na meta. É um wrapper
de duas linhas quase idêntico ao `portionHint` de `metas/hooks/format.ts`, duplicado de propósito:
importar helper de uma pasta de rota para outra acopla duas telas que não têm relação, e o
arredondamento — a parte que precisa ser única — mora em `portions()`.

### Passos

| Passo | Hero | Pergunta | Controle | Rodapé |
|---|---|---|---|---|
| 1 · Água | círculo lilás, `Drop` | "Quanto de água por dia?" | `Stepper` 500–5000 (100) `ml` + `Stepper` 100–2000 (50) `ml` + `porcoesHint` + fileira de gotas | "Continuar" |
| 2 · Refeições | círculo verde, `ForkKnife` | "Quantas refeições por dia?" | `Stepper` 1–8 + chips Café/Almoço/Jantar (decorativos) | "Continuar" · "Voltar" |
| 3 · Treino | círculo rosa, `Barbell` | "Quantos dias de treino?" | `SeletorDias` + `diasHint` | "Começar a usar" · "Voltar" |

Componentes reusados: `Stepper` (já suporta `unit`, `min`, `max`, `step` e digitação por
`parse`), `TONE` de `lib/tone.ts` para os três tons, e os tokens do `DESIGN.md`. Nada de
`Screen` — o onboarding não tem header de tela.

`SeletorDias`: sete botões redondos rotulados `S T Q Q S S D` (segunda→domingo), cada um com
`aria-pressed` e `aria-label` completo ("Segunda-feira"); marcado usa `bg-pink-bright` + texto
branco, desmarcado `bg-pink-tint` + `text-ink-faint`. Só a contagem sai do componente.

`PassoLayout` recebe `step`, `tone`, ícone, título, subtítulo, rótulo do CTA e os callbacks. A
barra de progresso é `step` segmentos preenchidos de 3, com `transition-colors`; "Pular" fica
no canto direito em todos os passos, e "Voltar" só aparece com `step > 1`.

## Estados

- **Enviando** — CTA desabilitado com rótulo inalterado; o fluxo é curto o bastante para não
  precisar de overlay (`loading-overlay.tsx` fica de fora).
- **Erro ao salvar** — toast em PT, valores preservados, pessoa segue no passo 3 (ou onde tocou
  "Pular").
- **Fora de faixa** — o `Stepper` já desabilita `−`/`+` nos extremos e recusa digitação inválida;
  o 400 da rota é rede de segurança, não fluxo.
- **Carregando** — não existe: os steppers abrem nas constantes (decisão 9).
- **Já concluído** — não existe na tela: o gate da `page.tsx` redireciona antes de renderizar.

## Testes

| Arquivo | Cobre |
|---|---|
| `server/onboarding/service.test.ts` *(novo)* | `isOnboarded`: sem linha de profile → false; com `onboardingCompletedAt` nulo → false; preenchido → true. `completeOnboarding`: cria as 3 metas + porção + timestamp para usuário zerado; **sobrescreve** metas já criadas pelo `ensureGoals` (idempotência, sem violar o `UNIQUE`); segunda chamada é no-op de valor; não vaza para outro usuário |
| `onboarding/hooks/format.test.ts` *(novo)* | `porcoesHint` com porção 250/500; `diasHint` em 0, 1 e N; `onboardingPayload` convertendo `Set` vazio no default e `Set` de 5 em `5` |
| `server/goals/service.test.ts` | segue passando com `DEFAULT_GOALS` derivado de `DEFAULT_GOAL_TARGETS` |

Sem teste de componente — a convenção do repo é testar helpers e hooks puros.

## Verificação

1. `bun check-types` e `bun test` limpos.
2. **Nenhuma migration**: `onboarding_completed_at` veio na `0002` e `water_portion_ml` na
   `0017`. `bun db:generate` não deve gerar arquivo novo — se gerar, algo mudou no schema sem
   intenção.
3. **Visual real, com o dev server rodando** (`check-types` verde não prova UI):
   - conta com `onboarding_completed_at` nulo abrindo `/home` → cai em `/onboarding`
   - os três passos: steppers respondendo, hint de porções mudando com os dois valores, chips e
     gotas no lugar, "Voltar" preservando o que foi escolhido
   - passo 3 sem marcar nada → hint "Sem dias escolhidos — vamos usar 4 dias por semana"; marcar
     5 dias → "5 dias por semana"
   - "Começar a usar" → `/home`, e `bun db:studio` mostrando as 3 metas, a porção e o timestamp
   - "Pular" no passo 1 → Home com 2000/3/4 e porção 500
   - reabrir `/onboarding` depois de concluir → redirect para `/home`
   - `/metas` e `/corpo` refletindo o que foi escolhido no fluxo (a prova de que "as telas se
     adequam" não exigiu mudar tela nenhuma)
   - transição entre passos com fade, e sem animação com `prefers-reduced-motion: reduce`

## Fora de escopo

- **Persistir *quais* dias a pessoa treina** — exige coluna nova e um consumidor (lembrete por
  dia, ou a rotação de treino da Hoje). Vira issue; a decisão 7 registra a dívida.
- **Backfill dos usuários existentes** (decisão 12) — inclusive a conta de desenvolvimento.
- **Trocar os defaults para 1 L / 3 dias** — avaliado e descartado (decisão 11).
- **Perguntas sem consumidor na UI** — peso, altura, objetivo, horário de acordar.
- **Tela de boas-vindas / valores do produto** antes do passo 1: o login já faz esse papel.
- **Editar as metas no fluxo depois de concluído** — é a tela `/metas`, que já existe.
- **`sessionStorage` para retomar o fluxo** (decisão 16).
