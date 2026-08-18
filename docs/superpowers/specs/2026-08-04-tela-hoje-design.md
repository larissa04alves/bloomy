# Tela Hoje (home) — design

Branch: `feat/criar-home`
Data: 2026-08-04
Design de referência: `docs/Diario App.dc.html:53-131` (variação `1a`, "Grid de rituais")

## Problema

`app/(app)/home/page.tsx` ainda é `ScreenSkeleton`. É a última das cinco abas sem implementação
e, segundo `docs/README.md:7`, a tela aberta ~90% das vezes. Todo o back-end de que ela precisa
já existe; o que falta é a tela e a agregação de leitura.

## Enquadramento

Hoje **não é um domínio** — só consome os outros (`apps/web/CONTEXT.md:17-19`). Não cria dado
novo: a única mutação que nasce nela é o humor do check-in, e é o mesmo registro da Mente
(`unique(user_id, day)`, upsert). Todo o resto é leitura + navegação para a aba dona da ação.

Isso define o escopo: **uma rota de leitura agregada + uma tela**. Zero migration, zero regra
de negócio nova, zero modal.

## Decisões

1. **Rota agregadora `/api/today`.** A tela lê de 6 domínios + metas. Um payload num request só,
   em vez de 6 `useResource` com 6 skeletons — e a regra "o que a Hoje mostra" fica testada num
   lugar. Mutações continuam nas rotas de domínio (ADR-0001 segue valendo: serviço é dono da
   regra, handler é wrapper fino).
2. **Cards de ritual navegam para a aba do domínio.** O card inteiro é `Link`; a ação
   ("＋ Adicionar", "▶ Iniciar", "✓ Marcar") é afordância visual, não um segundo alvo. Nenhum
   modal é duplicado na Hoje.
3. **Treino do dia = sorteio determinístico.** Não existe agendamento por dia da semana no
   modelo, e criá-lo é feature própria. O card sorteia entre os treinos ativos com semente
   `${userId}:${day}` — estável durante o dia, muda sozinho amanhã, sem schema novo.
4. **Card de Treino tem 3 estados.** Sessão aberta → "em andamento · ▶ Continuar"; sessão
   concluída hoje → "✓ Treino concluído" (não sugere outro para quem já treinou); nada ainda →
   sorteado + "▶ Iniciar". Sem treino cadastrado → convite "Crie seu primeiro treino".
5. **Água em garrafas de 500 ml, não copos.** O protótipo diz "5 de 8 copos", mas a Corpo já
   entregue conta em `garrafas` (`GARRAFA_ML = 500`). Manter "copos" na Hoje faria o mesmo dado
   aparecer como 8 na Hoje e 4 na Corpo. Consistência intra-app vence fidelidade literal;
   reusa `garrafas()`, já testada.
6. **Alimentação = contagem + barra, sem pendência.** O protótipo escreve "2 refeições · faltou
   o jantar", mas "faltou" é cobrança — o glossário exige pendência neutra
   (`apps/web/CONTEXT.md:25-27`). O card espelha Hidratação: "2 de 3 refeições" + barra verde,
   sem a linha "＋ Adicionar" (redundante, o card já é link).
7. **Estados vazios são convite, não ausência.** Card sempre renderiza, com convite em vez de
   número ("Nenhuma consulta marcada · Agendar", "Crie seu primeiro treino", "Nenhum remédio
   cadastrado · ＋ Cadastrar"). Layout estável e banco vazio não parece tela quebrada.
8. **Remédios navega conforme o estado:** com remédio → `/corpo` (onde se marca a toma); sem
   nenhum → `/saude` (onde se cadastra). Cada estado leva ao lugar onde a ação existe.
9. **Rota continua `/home`, label da tab passa a "Hoje".** A UI fala a língua do design e do
   glossário; a rota fica como está para não mexer em links, manifest e redirect.
10. **Avatar abre dropdown: Metas · Notificações · Sair.** As duas primeiras ficam desabilitadas
    ("em breve") — as telas não existem e cada uma merece sua própria rodada. **Sair** é o
    primeiro logout do app: `authClient.signOut()` → `/login`.
11. **Saudação calculada no servidor.** O payload manda `period`
    (`morning`/`afternoon`/`evening`) resolvido no fuso BR, não a frase — fuso no back
    (ADR-0002), cópia PT na tela (`apps/web/CLAUDE.md`).
12. **Revalida no mount e ao voltar o foco.** Mount cobre a navegação entre abas; `visibilitychange`
    cobre app em segundo plano atravessando a meia-noite e registro feito em outro dispositivo.

## Contrato da API

`GET /api/today` (aceita `?day=YYYY-MM-DD`, default hoje, via `resolveDay`):

```ts
type TodayPayload = {
  name: string | null;                            // primeiro nome vem da sessão
  day: string;                                    // YYYY-MM-DD, fuso BR
  period: "morning" | "afternoon" | "evening";
  checkin: { mood: Mood | null };
  water: { done: number; target: number };        // garrafas
  meals: { done: number; target: number };
  meds: { taken: number; total: number };         // total 0 = nenhum remédio cadastrado
  workout:
    | { state: "none" }
    | { state: "suggested"; id: string; name: string }
    | { state: "active"; id: string; name: string }
    | { state: "done"; name: string };
  nextAppointment: Appointment | null;
};
```

Erros: `401` sem sessão (`unauthorized()`), `400` em `day` inválido — padrão de
`server/shared/api.ts`.

## Arquitetura

### Back-end

| Arquivo | Papel |
| ------- | ----- |
| `server/today/service.ts` | `getToday(db, userId, day, now)` — compõe `getWaterDay`, `getMealsDay`, `getIntakesDay`, `getCheckin`, `nextAppointment`, `listWorkouts`, `getActiveSession`, `ensureGoals`. `import "server-only"`. |
| `server/today/rotation.ts` | Módulo puro: `pickWorkoutOfDay(workouts, userId, day)` — hash FNV-1a de `${userId}:${day}` sobre a lista ordenada por `createdAt`. Sem React, sem banco. |
| `server/workout/session.ts` | + `hasCompletedSessionOn(db, userId, day)` — única função nova em domínio existente. |
| `app/api/today/route.ts` | Wrapper fino: `requireUserId` → `resolveDay` → serviço. |
| `lib/api-types.ts` | + `TodayPayload` e os tipos do card de treino. |

O serviço de `today` só **compõe**; nenhuma regra nova mora nele além do sorteio (que é o
`rotation.ts` puro) e da montagem do estado do card de treino.

### Front-end

`app/(app)/home/page.tsx` só renderiza. Lógica em `hooks/`, componentes na pasta da tela:

| Arquivo | Papel |
| ------- | ----- |
| `hooks/useHome.ts` | `useResource("/api/today")`, `reload` no `visibilitychange`, `setMood` otimista (`PUT /api/checkins`, rollback + `toastError`). |
| `hooks/format.ts` | Puro: `greetingLabel(period, name)`, `dateLabel(day)` → "Segunda, 6 de julho", `consultaLabel(at)` → "qui, 9" / "14h". |
| `components/SaudacaoHeader.tsx` | Saudação + data + `PerfilMenu`. |
| `components/PerfilMenu.tsx` | Avatar 46px + `DropdownMenu` (`@bloomy/ui`): Metas/Notificações desabilitados, Sair. |
| `components/HumorCard.tsx` | "Como você está?" + "registrado ✓" + `MoodTiles` (já existe). |
| `components/RituaisGrid.tsx` | Grid 2×2. |
| `components/RitualCard.tsx` | Card genérico: `tone`, ícone, título, subtítulo, slot (barra ou linha de ação), `href`. |
| `components/ConsultaCard.tsx` | Próxima consulta ou convite "Agendar". |

Reuso sem código novo: `MoodTiles`, `ProgressBar`, `IconChip`, `TONE`, `garrafas()`,
`nextAppointment()`, tokens do `@bloomy/ui`. Nenhuma cor solta, nenhum `text-[13px]`
(escala nomeada do Tailwind, conforme `apps/web/CLAUDE.md`).

### Os quatro rituais

| Card | Tint / ícone | Conteúdo | Destino |
| ---- | ------------ | -------- | ------- |
| Hidratação | `lilac-tint` · `drop` | "2 de 4 garrafas" + barra | `/corpo` |
| Alimentação | `green-tint` · `fork-knife` | "2 de 3 refeições" + barra | `/corpo` |
| Treino | `pink-tint` · `barbell` | nome + Continuar / ✓ Concluído / ▶ Iniciar / convite | `/treino` |
| Remédios | `coral-tint` · `pill` | "1 de 3 tomados · ✓ Marcar" ou "Nenhum cadastrado · ＋ Cadastrar" | `/corpo` ou `/saude` |

## Estados

- **Loading:** skeleton no formato da própria tela (header + grid 2×2 pulsando), não o
  `ScreenSkeleton` genérico.
- **Erro de leitura:** mensagem gentil + "Tentar de novo" (`reload`). A tela nunca fica branca.
- **Check-in que falha:** rollback do otimista + `toastError`, igual ao `useMente`.
- **Sem sessão:** `401`. Em produção o `(app)/layout.tsx` já redireciona para `/login`; em dev
  (gate desligado) a tela cai no estado de erro.

## Testes

`bun test` roda de `apps/web` (sem infra de DOM — só módulos puros e serviços):

- `server/today/rotation.test.ts` — mesmo `userId`+`day` dá o mesmo treino; dias diferentes
  variam; lista vazia → `null`; um treino só → sempre ele.
- `server/today/service.test.ts` (`test-db.ts`) — agregação de água/refeições/tomas; os quatro
  estados do card de treino; `meds.total: 0` sem cadastro; `nextAppointment: null`.
- `app/(app)/home/hooks/format.test.ts` — períodos da saudação, "Segunda, 6 de julho",
  "qui, 9" / "14h".

## Verificação

1. `bun test` (de `apps/web`) e `bun check-types` (da raiz) verdes.
2. `bun dev:web` + navegar `/home` no Chrome com sessão real: conferir layout contra o
   protótipo, tocar nas 5 carinhas, nos 4 cards e no avatar.

## Fora de escopo

Telas de Metas e Lembretes (só entram no dropdown, desabilitadas) · modais dentro da Hoje ·
status bar falsa do protótipo · agendamento de treino por dia da semana · migrar a Corpo para
copos de 250 ml.
