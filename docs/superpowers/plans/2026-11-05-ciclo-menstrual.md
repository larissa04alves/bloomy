# Ciclo menstrual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Não commitar** — entregar como mudanças não-commitadas (CLAUDE.md do repo).

**Goal:** Aba "Ciclo" opcional para acompanhar menstruação, sintomas e método anticoncepcional (com a pílula integrada a Hoje/Corpo e lembretes).

**Architecture:** Fatos em tabelas novas (`cycle_settings`, `cycle_method`, `cycle_anchor`, `cycle_day`, `cycle_pill_intake`); menstruações, médias, posição na cartela e previsão derivadas na leitura por funções puras em `server/cycle/calc.ts`; serviço `server/cycle/service.ts` + rotas finas `/api/cycle/*`; telas em `(app)/ciclo`.

**Tech Stack:** Next.js 16 App Router, Drizzle + libsql (migrations), Tailwind 4, Phosphor, `bun test`.

**Spec:** seção "Design aprovado" abaixo · mockup `docs/Ciclo (mockup).html`.

## Global Constraints

- Telas em PT, só renderizam; lógica em `hooks/`; código EN; texto só na escala nomeada do Tailwind (`apps/web/CLAUDE.md`).
- **Comentário em código só onde o porquê não é óbvio** — nada de JSDoc que repete a função nem comentário narrando o código.
- Rota = zod → `requireUserId` → serviço; erros `{ error }` 400/401/404/422 (ADR-0001). Registro diário com coluna `day` via `dayFor()` (ADR-0002). Migrations sempre (`bun db:generate` + `bun db:migrate` da raiz; nunca `push`).
- Cor do domínio **pêssego**: `peach #E8916F`, `peach-deep #B35C3D`, `peach-tint #FDEEE7`, `peach-soft #F7D3C3`, sombra `0 8px 20px rgba(232,145,111,.35)`; tom `peach` em `lib/tone.ts`. Aba ativa continua `lilac-deep`.
- Previsão sempre em faixa, nunca data exata; atraso nunca vermelho nem push extra.
- Datas: aritmética de `day` (`YYYY-MM-DD`) em UTC, como `previousDay` em `server/shared/day.ts`.
- `apps/web/.env` aponta para produção: rota/UI só verificadas com `DATABASE_URL=file:<scratch>/x.db DATABASE_AUTH_TOKEN=local BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001`.
- Testes: `bun run test` (apps/web) e `bun check-types` (raiz). Nada de commit.

## Review Focus

1. Menstruação que atravessa virada de mês/ano e registro de dia passado que junta duas sequências (falha de 1 dia) → menstruação única. (Task 1: testes de `deducePeriods` e `addDays`.)
2. Troca de método no meio: médias ignoram ciclos de antes; pílula → natural pede última menstruação de novo. (Task 1 e Task 2.)
3. Pílula: esquecer de marcar não desloca a cartela; "comecei a pausa" e "emendar" reancoram. (Task 1: testes de `pillPosition`.)
4. Ciclo desativado: aba some, pílula não conta no Hoje/Corpo, lembretes do ciclo não disparam; dados ficam. (Tasks 4 e 6.)
5. Apagar dados do ciclo remove só as linhas da pessoa e desativa. (Task 2.)

---

## Design aprovado

### Intenção

Uma aba para **acompanhar a menstruação**: registrar sangramento e sintomas, ver em que ponto do ciclo
se está e quando o próximo sangramento deve vir. O motivo de partida é o uso real da dona do produto
(pílula com pausa a cada 4 cartelas) e o fato de que muita gente usa algum método anticoncepcional —
então o **método** muda a previsão. Não é app de fertilidade nem de gravidez.

### Metas

1. Registrar sangramento (nada, escape, leve, médio, intenso) e sintomas de um dia, em um toque cada.
2. Mostrar dia do ciclo / posição na cartela e a previsão do próximo sangramento, como **faixa**, nunca data exata.
3. Calendário mensal com dias registrados, previstos, escapes e dias com sintoma.
4. Histórico: médias (ciclo e menstruação) e lista de ciclos, com a troca de método marcada.
5. Lembretes: pílula no horário, "ciclo chegando", "ainda menstruada?".
6. Método anticoncepcional como configuração que muda a previsão.

### Não-metas (fora deste trabalho)

Janela fértil / ovulação, gravidez, amamentação, perimenopausa, alertas de irregularidade, cruzamento
com o humor da Mente, PDF para consulta, compartilhar com parceiro, temperatura basal, "cycle syncing"
de treino/dieta, migração automática de uma pílula já cadastrada em Remédios (a pessoa apaga lá e
cadastra no Ciclo).

### Anti-metas

- Tom clínico ou alarme: atraso nunca é vermelho nem cobrança (Regra do Sem-Vermelho, DESIGN.md).
- Confiança falsa: previsão sempre em faixa e com a origem clara ("estimativa", "sem previsão com DIU hormonal").
- Dado de ciclo saindo da conta da pessoa (analytics de terceiros, logs com conteúdo).

### Restrições

- **LGPD**: dado de saúde é sensível (art. 5º II); base legal = consentimento específico (art. 11). A
  ativação é o consentimento; desativar e apagar tudo precisam existir.
- ADR-0001 (REST fino + serviço em `server/`), ADR-0002 (coluna `day` com fuso BR), telas em PT sem
  lógica no `.tsx` (hooks), código em EN, migrations sempre.
- **Depende da página `/perfil`**, feita numa branch anterior com plano próprio: a branch do ciclo só
  começa com ela mergeada e adiciona a seção Ciclo a ela. O formato do `/perfil` vem desse plano.

### Abordagens consideradas

- **A · Registro por dia + cálculo na hora — escolhida.** Tabelas de fato (dia, método, âncoras, tomas);
  menstruações, médias, posição na cartela e previsão derivadas em funções puras. Mesmo padrão das tomas
  de remédio, que derivam do cadastro. Testável com datas fixas.
- B · Tabela de menstruações com início/fim — exigiria "fim da menstruação" e resolver conflito ao editar
  dia no meio; descartada.
- C · Previsão materializada por job — job novo e estado que fica velho; o cálculo na hora é barato
  (poucos dias por mês por pessoa); descartada.

### Decisões de produto e UX

**Referência visual**: `docs/Ciclo (mockup).html` (abrir no navegador). É hifi no mesmo sentido do
`docs/README.md`: classes copiadas dos componentes reais; recriar fielmente.

**Cor do domínio Ciclo: pêssego** — tokens novos em `packages/ui/src/styles/globals.css`:
`peach #E8916F` (cheio: botões, chip selecionado), `peach-deep #B35C3D` (texto/ícone sobre tint),
`peach-tint #FDEEE7` (fundos), `peach-soft #F7D3C3` (trilho/estado parcial), e uma sombra de botão
pêssego `0 8px 20px rgba(232,145,111,.35)`. Entra como tom `peach` em `lib/tone.ts`.

**Onde mora**: **6ª aba "Ciclo"** (ícone Phosphor `flower-lotus`), visível só para quem ativou. Item
ativo segue `lilac-deep` como as demais abas.

**Aba Ciclo** — `Screen` com título "Ciclo" e subtítulo do método; abaixo:
1. Card-resumo (tint pêssego), que muda por método:
   - **Pílula (com pausa)**: "Cartela X de N", "comprimido K de A", bolinhas da cartela, barra das
     cartelas da sequência + pausa, "Próxima pausa em ~4 semanas · 3 a 9/dez". Na pausa: "Pausa · dia
     D de P" e quando a cartela volta.
   - **Sem método hormonal** (inclui DIU de cobre e "Outro"): anel com "dia N do ciclo" e "Próxima
     menstruação entre 24 e 28/nov".
   - **Contínuo** (DIU hormonal, implante, injeção, pílula sem pausa): "Último sangramento há N dias",
     sem previsão, com a frase explicando por quê.
   - **Atraso** (passou do fim da faixa sem início de sangramento): "Passou da previsão há N dias ·
     registre quando vier", em tinta neutra. Sem push extra.
2. **Pílula de hoje** (só pílula): linha com check, igual a "Remédios de hoje". Na pausa vira linha
   tracejada neutra "Sem pílula na pausa".
3. **Ações de âncora** (só pílula): "Comecei a pausa hoje" (sempre disponível) e "Emendar mais uma
   cartela" (visível quando a pausa planejada está a ≤ 3 dias ou em curso). Ambas reancoram a contagem.
4. **Como você está hoje**: vazio = card tracejado "Registrar…"; preenchido = card com o fluxo e chips
   dos sintomas + "Editar".
5. Link "Calendário e histórico". Engrenagem no header → ajustes do ciclo (seção da página de perfil).

**Registro do dia** (`BottomSheet`, tom pêssego): sangramento em `ChoiceChip` de escolha única
(Nada, Escape, Leve, Médio, Intenso — tocar no selecionado desmarca) + sintomas em `ChoiceChip`
múltiplo. Lista fixa de 12: cólica, inchaço, dor de cabeça, seios sensíveis, acne, cansaço, desejo de
doce, náusea, dor nas costas, libido alta, libido baixa, corrimento. "Editar lista" esconde/mostra
sintomas (preferência por pessoa). Abre para hoje ou para o dia tocado no calendário (dias passados ok,
futuros não).

**Calendário e histórico** (rota interna da aba, header de voltar igual à Notificações, uma tela
rolando): mês navegável; menstruação = círculo cheio pêssego; prevista = tracejado; escape = tint;
sintoma = ponto lilás; hoje = anel lilás-profundo. Para pílula, a pausa prevista aparece tracejada.
Abaixo: resumo de 2 colunas (ciclo médio, menstruação média) — só para quem tem ciclo natural; lista
"Seus ciclos" (intervalo, duração, dias de menstruação); linha tracejada marcando troca de método.

**Ativação** (consentimento): tela com flor, texto curto, card "São dados de saúde. Ficam só na sua
conta, não vão pra ninguém, e você apaga tudo quando quiser pelo seu perfil.", botões "Ativar ciclo" /
"Agora não". Depois de ativar: escolher método e, conforme o método, os dados iniciais (abaixo).
Entradas: **passo opcional no onboarding** (só cria algo se a pessoa ativar; "Pular" não cria nada) e
**seção Ciclo da página `/perfil`** (ativar, mudar método, desativar, apagar dados do ciclo).

**Desativar × apagar**: desativar esconde a aba, para os lembretes e mantém os dados (reativar
recupera). Apagar remove todos os dados do ciclo da pessoa, com confirmação, e desativa.

**Fora da aba**:
- **Hoje**: a pílula conta no ritual Remédios ("2 de 3 tomados"); nos dias de pausa não conta.
- **Corpo › Remédios de hoje**: a pílula aparece como linha com IconChip pêssego `flower-lotus`; o
  toggle marca a toma do ciclo. Some na pausa.
- **Notificações**: três linhas novas (tom pêssego) — Pílula (horário editável, descansa na pausa),
  Ciclo chegando (2 dias antes da pausa/menstruação prevista), Ainda menstruada? (a partir do 5º dia de
  sangramento sem registro hoje; **desligado por padrão**). As duas primeiras ligadas por padrão.

### Regras de cálculo

Terminologia: **sangramento** = dia com fluxo leve, médio ou intenso; escape não conta como sangramento.

- **Menstruação (deduzida)**: sequência de dias com sangramento, tolerando 1 dia sem registro no meio.
  Um novo **ciclo** começa no primeiro dia de uma menstruação.
- **Ciclo natural** (sem método, DIU de cobre, Outro):
  - Dados iniciais na ativação: data de início da última menstruação + duração habitual do ciclo
    (stepper, padrão 28).
  - Média = ciclos completos do método atual (até os 6 mais recentes). Com < 2 ciclos completos,
    usa a duração informada na ativação.
  - Faixa prevista = início do ciclo atual + média, ± max(1, desvio padrão arredondado), limitada a ±4
    dias. Com o chute da ativação: ±2.
- **Pílula com pausa** (cartela 21 ou 24+4):
  - Configuração: cartela (21 → A=21 ativos; 24+4 → A=24 ativos), pausa a cada N cartelas, pausa dura
    P dias (padrão 7 para 21, 4 para 24+4), horário, data em que a cartela atual começou, qual cartela
    da sequência ela é.
  - Sequência = N cartelas de A dias seguidas de P dias de pausa; a posição de hoje sai do calendário,
    nunca dos checks (esquecer de marcar não desloca a conta).
  - "Comecei a pausa hoje" encerra a sequência hoje e inicia a pausa; "Emendar mais uma cartela" adia a
    pausa em A dias. Cada um grava uma âncora; a próxima sequência conta a partir do fim da pausa.
  - Previsão = intervalo da próxima pausa (sangramento de privação costuma vir nela).
- **Anel e adesivo**: mesmo modelo da pílula com A=21 (3 semanas de uso): "pausa a cada N", duração
  da pausa, data de início do atual e qual da sequência ele é; card "semana 2 de 3 · pausa em ~10
  dias"; previsão da pausa; ações de âncora iguais. Sem check diário, sem lembrete diário, não entra em
  Remédios/Hoje/Corpo. Lembrete de tirar/trocar fica fora do MVP.
- **Contínuo** (DIU hormonal, implante, injeção, pílula 28 contínua): sem previsão; mostra o último
  sangramento **ou escape** (com o rótulo de qual foi — nesses métodos o escape costuma ser o único
  sangramento) e a contagem desses eventos nos últimos 6 meses. *(chamada minha)*
- **Pílula 28 contínua** tem check diário, lembrete `pill` e conta no ritual Remédios/Corpo como
  qualquer pílula — só não tem pausa nem previsão. "Pílula de hoje", lembrete e contagem valem para
  **toda pílula**, com ou sem pausa. *(chamada minha)*
- **Atraso** só existe no ciclo natural. Na pílula, não sangrar na pausa é comum: o card segue a
  contagem da cartela, sem estado de atraso. *(chamada minha)*
- **"Seus ciclos" para pílula**: cada linha é uma sequência (cartelas + pausa), vinda das âncoras e da
  configuração, com o sangramento registrado nela se houve ("pausa 6 a 12/ago · sangrou 8 a 11/ago",
  ou "sem sangramento"). Sem médias de ciclo. *(chamada minha)*
- **Troca de método**: fecha o método anterior (data fim) e abre o novo; médias e previsão só usam
  ciclos iniciados no método atual.

### Modelo de dados (direção; nomes finais a cargo do plano)

- `cycle_settings` (1 por usuário): ativado em, sintomas escondidos, duração habitual informada,
  início da última menstruação informado.
- `cycle_method` (N por usuário, com `started_on`/`ended_on`): tipo + configuração da cartela/horário.
- `cycle_anchor`: eventos `pause_started` / `pack_extended` com `day`.
- `cycle_day` (único por usuário+`day`): fluxo + sintomas (json).
- `cycle_pill_intake` (único por usuário+`day`): a toma da pílula.
- `reminder.type` ganha `pill`, `cycle_soon`, `period_check`; os slots derivam do ciclo como `meds`
  deriva de `medication.times`.

### Deixado para quem constrói

Nomes de tabela, colunas e rotas; forma exata dos endpoints; o lugar do passo do ciclo dentro do
onboarding (antes do passo de Lembretes faz sentido para já ligar o lembrete da pílula); como a tab
bar recebe a flag de ativação; textos de microcopy além dos citados; as mensagens de push.

## Decisões do plano (chamadas minhas, sobre o que o design deixou ao construtor)

- **Onboarding:** passo "Ciclo" (pergunta Ativar/Pular) antes de Lembretes. "Ativar" só marca a intenção; ao concluir o onboarding a pessoa vai para `/ciclo/ativar` em vez de `/home`. Assim o fluxo de ativação (consentimento + método + dados iniciais) existe num lugar só.
- **Ajustes do ciclo moram na seção Ciclo do `/perfil`** (método, desativar, apagar). A engrenagem da aba leva a `/perfil#ciclo`. O sheet de método é componente global (`components/cycle-method-sheet.tsx`), usado por `/ciclo/ativar` e `/perfil`.
- **Horário da pílula** é editado só no método; a linha "Pílula" da Notificações mostra o horário e não abre sheet de horário.
- **Lembretes do ciclo** nascem no seed como os outros (`pill` e `cycle_soon` ligados, `period_check` desligado); com o ciclo desativado, a Notificações esconde essas linhas e o dispatch não gera slots delas.
- **"Ciclo chegando"** dispara às 09:00, 2 dias antes do início da faixa prevista (natural) ou do início da pausa (com pausa). **"Ainda menstruada?"** dispara às 20:00 quando há menstruação em curso com ≥ 4 dias e nada registrado hoje.
- **Calendário** é uma grade própria (como o mockup), não o `calendar.tsx` do shadcn.

## Tasks

### Task 1: Regras puras do ciclo — ✅ feita (review ok após 1 correção: guarda contra config inválida em pillPosition)

**Files:**
- Modify: `apps/web/src/server/shared/day.ts` + `day.test.ts` (`addDays`, `daysBetween`)
- Create: `apps/web/src/lib/cycle.ts` (constantes compartilhadas client/server)
- Create: `apps/web/src/server/cycle/calc.ts`, `calc.test.ts` (sem `server-only`: puro)

**Interfaces:**
- Produces (`server/shared/day.ts`): `addDays(day: string, n: number): string`; `daysBetween(from: string, to: string): number` (`to - from` em dias).
- Produces (`lib/cycle.ts`):
  - `CYCLE_FLOWS = ["none","spotting","light","medium","heavy"] as const`, `CycleFlow`; rótulos `FLOW_LABELS` = Nada, Escape, Leve, Médio, Intenso.
  - `CYCLE_SYMPTOMS` (ids → rótulo, nesta ordem): `cramps` Cólica, `bloating` Inchaço, `headache` Dor de cabeça, `breast_tenderness` Seios sensíveis, `acne` Acne, `fatigue` Cansaço, `sweet_cravings` Desejo de doce, `nausea` Náusea, `back_pain` Dor nas costas, `high_libido` Libido alta, `low_libido` Libido baixa, `discharge` Corrimento; `CycleSymptom`.
  - `CYCLE_METHODS = ["none","pill","hormonal_iud","copper_iud","implant","injection","ring","patch","other"] as const`, `CycleMethodKind`, `METHOD_LABELS` (Nenhum, Pílula, DIU hormonal, DIU de cobre, Implante, Injeção, Anel, Adesivo, Outro).
  - `PILL_PACKS = ["21","24+4","28"] as const`, `PillPack`.
  - `methodMode(kind, pack): "natural" | "scheduled" | "continuous"` — natural: none, copper_iud, other; scheduled: pill 21 ou 24+4, ring, patch; continuous: hormonal_iud, implant, injection, pill 28.
  - `activeDaysFor(kind, pack): number | null` (pill 21→21, 24+4→24, 28→null; ring/patch→21) e `defaultPauseDays(kind, pack)` (21/ring/patch→7, 24+4→4).
- Produces (`server/cycle/calc.ts`), tipos de entrada simples (sem Drizzle):
  - `type DayLog = { day: string; flow: CycleFlow }`
  - `deducePeriods(days: DayLog[]): { start: string; end: string }[]` — sangramento = light/medium/heavy (escape não conta); dias com sangramento separados por no máximo 1 dia sem sangramento formam a mesma menstruação; ordenado por `start`.
  - `naturalPrediction(input: { starts: string[]; usualLength: number; today: string }): { cycleDay: number; avgLength: number; avgPeriodLength: number | null; window: { from: string; to: string }; lateDays: number }` — `starts` = início informado na ativação + inícios deduzidos depois dele; média dos últimos ≤ 6 ciclos completos (diferença entre inícios consecutivos); com < 2 ciclos completos usa `usualLength` e margem ±2; senão margem `min(4, max(1, round(desvio padrão)))`; `window` em torno de `último início + média`; `lateDays = max(0, today - window.to)`.
  - `type ScheduledMethod = { sequenceStart: string; activeDays: number; pauseEvery: number; pauseDays: number }`, `type Anchor = { day: string; kind: "pause_started" | "pack_extended" }`
  - `pillPosition(method: ScheduledMethod, anchors: Anchor[], today: string): { phase: "active" | "pause"; unit: number; units: number; pill: number; pauseDay: number | null; nextPause: { from: string; to: string } }` — sequência = `pauseEvery` unidades de `activeDays` seguidas de `pauseDays` de pausa, repetindo a partir de `sequenceStart`; posição pelo calendário (nunca pelos checks). `pause_started` no dia d encerra as unidades em d−1 e inicia a pausa em d; `pack_extended` no dia d acrescenta `activeDays` à fase ativa da sequência corrente (se d cai na pausa, a pausa termina em d−1 e uma unidade nova começa em d). A sequência seguinte começa no dia após o fim da pausa.
  - `continuousSummary(days: DayLog[], today: string): { lastBleed: { day: string; flow: CycleFlow } | null; daysSince: number | null; eventsLast180: number }` — aqui escape conta (sangramento ou escape), e "evento" = sequência com no máximo 1 dia de falha.

- [x] **Step 1: Testes** (`day.test.ts`, `calc.test.ts`) com estes casos, nomes descritivos em PT:
  - `addDays("2026-12-30", 3) === "2027-01-02"`; `addDays("2026-03-01", -1) === "2026-02-28"`; `daysBetween("2026-10-28", "2026-11-05") === 8`.
  - `deducePeriods`: [28/out médio, 29/out leve, 31/out leve] → uma menstruação 28/out–31/out; [1/nov leve, 4/nov leve] → duas; [escape 2/nov] → nenhuma; 30/dez–02/jan → uma, cruzando o ano.
  - `naturalPrediction` com `starts: ["2026-10-28"]`, `usualLength: 28`, `today: "2026-11-05"` → `cycleDay 9`, `window 2026-11-23..2026-11-27`, `lateDays 0`; com inícios 3/ago, 1/set, 29/set, 28/out (ciclos 29, 28, 29) → `avgLength 29` (arredondado), janela `2026-11-25..2026-11-27` (margem 1); com `today 2026-11-30` e a mesma entrada → `lateDays 3`.
  - `pillPosition` caso dela: `{ sequenceStart: "2026-09-10", activeDays: 21, pauseEvery: 4, pauseDays: 7 }`, sem âncoras, `today 2026-11-05` → `{ phase: "active", unit: 3, units: 4, pill: 15, pauseDay: null, nextPause: { from: "2026-12-03", to: "2026-12-09" } }`; `today 2026-12-05` → `phase "pause", pauseDay 3`; âncora `pause_started` em `2026-11-20` → `today 2026-11-22` em `pause`, `pauseDay 3`, próxima sequência começa `2026-11-27`; âncora `pack_extended` em `2026-12-01` → `units 5`, `nextPause.from 2026-12-24`.
  - `continuousSummary`: último escape 13/out com `today 5/nov` → `daysSince 23`, `lastBleed.flow "spotting"`.
- [x] **Step 2:** `bun test --conditions react-server src/server/cycle src/server/shared/day.test.ts` (de apps/web) → FAIL (módulos/exports inexistentes).
- [x] **Step 3:** Implementar `lib/cycle.ts`, `addDays`/`daysBetween` (aritmética UTC como `previousDay`) e `calc.ts`.
- [x] **Step 4:** Mesmo comando → PASS. `bun check-types` → ok.

### Task 2: Banco, serviço e API do ciclo — ✅ feita (2 rounds: menstruação que atravessa a troca de método; datas futuras; transação na ativação)

**Files:**
- Create: `packages/db/src/schema/cycle.ts` (+ export em `schema/index.ts`); migration gerada `0029_*.sql`
- Create: `apps/web/src/server/cycle/service.ts`, `service.test.ts`
- Create: `apps/web/src/app/api/cycle/route.ts` (GET estado, POST ativar, DELETE apagar), `api/cycle/settings/route.ts` (PATCH), `api/cycle/method/route.ts` (PUT), `api/cycle/days/[day]/route.ts` (PUT), `api/cycle/anchors/route.ts` (POST), `api/cycle/pill/route.ts` (POST/DELETE)
- Modify: `apps/web/src/lib/api-types.ts` (tipos do payload)

**Interfaces:**
- Consumes: Task 1 (`lib/cycle.ts`, `calc.ts`, `addDays`).
- Produces (schema, todas com `user_id` FK `onDelete: "cascade"` e `timestampMs`):
  - `cycle_settings` (PK `user_id`): `enabled_at` timestamp_ms nulo (nulo = desativado), `hidden_symptoms` json `string[]` default `'[]'`.
  - `cycle_method`: `id`, `user_id`, `kind` (`CycleMethodKind`), `pill_pack` (`PillPack` nulo), `pause_every` int nulo, `pause_days` int nulo, `pill_time` text nulo (HH:MM), `sequence_start` text nulo, `last_period_start` text nulo, `usual_length` int nulo, `started_on` text, `ended_on` text nulo; índice `(user_id, started_on)`.
  - `cycle_anchor`: `id`, `user_id`, `day`, `kind` (`"pause_started" | "pack_extended"`); índice `(user_id, day)`.
  - `cycle_day`: `id`, `user_id`, `day`, `flow` (`CycleFlow`), `symptoms` json `CycleSymptom[]` default `'[]'`; único `(user_id, day)`.
  - `cycle_pill_intake`: `id`, `user_id`, `day`; único `(user_id, day)`.
- Produces (serviço, `db: Db` por parâmetro):
  - `type MethodInput` = `{ kind: "none" | "copper_iud" | "other"; lastPeriodStart: string; usualLength: number }` | `{ kind: "pill"; pack: PillPack; pauseEvery?: number; pauseDays?: number; pillTime: string; currentUnitStart?: string; currentUnit?: number }` | `{ kind: "ring" | "patch"; pauseEvery: number; pauseDays: number; currentUnitStart: string; currentUnit: number }` | `{ kind: "hormonal_iud" | "implant" | "injection" }`. Para pílula 21/24+4 e anel/adesivo, `currentUnitStart`/`currentUnit` são obrigatórios e `sequence_start = addDays(currentUnitStart, -(currentUnit-1) * activeDays)`.
  - `getCycleState(db, userId, today): Promise<CycleState | null>` (null = desativado). `CycleState = { enabled: true; method: { kind; pack: PillPack | null; pillTime: string | null; startedOn: string; pauseEvery; pauseDays }; mode: "natural" | "scheduled" | "continuous"; natural?: ReturnType<naturalPrediction>; scheduled?: ReturnType<pillPosition>; continuous?: ReturnType<continuousSummary>; today: { flow: CycleFlow | null; symptoms: CycleSymptom[] }; pill: { due: boolean; taken: boolean; time: string } | null; hiddenSymptoms: CycleSymptom[]; methodHistory: { kind; startedOn; endedOn }[] }`. Médias e previsão usam só dias ≥ `started_on` do método atual; `pill.due` = pílula e (modo contínuo ou fase `active`).
  - `activateCycle(db, userId, method: MethodInput, today)`, `setMethod(db, userId, method, today)` (fecha o anterior com `ended_on = today`, abre o novo com `started_on = today`), `setCycleEnabled(db, userId, enabled: boolean)` (desativar mantém dados), `deleteCycleData(db, userId)` (apaga as 5 tabelas da pessoa), `saveDay(db, userId, day, { flow, symptoms })` (upsert; `flow "none"` sem sintomas apaga a linha; dia futuro → `{ ok: false, reason: "future_day" }`), `addAnchor(db, userId, kind, today)`, `setPillTaken(db, userId, today, taken: boolean)`, `setHiddenSymptoms(db, userId, ids)`, `isCycleEnabled(db, userId): Promise<boolean>`, `listDays(db, userId, from, to): Promise<DayEntry[]>`.
  - Rotas: `GET /api/cycle` → `{ cycle: CycleState | null }`; `POST /api/cycle` body `MethodInput` → `{ cycle }`; `DELETE /api/cycle` → 204; `PATCH /api/cycle/settings` `{ enabled?: boolean; hiddenSymptoms?: CycleSymptom[] }`; `PUT /api/cycle/method` `MethodInput`; `PUT /api/cycle/days/[day]` `{ flow, symptoms }` (dia futuro → 422); `GET /api/cycle/days?from&to` → `{ days }`; `POST /api/cycle/anchors` `{ kind }`; `POST`/`DELETE /api/cycle/pill`. Com o ciclo desativado, mutações (exceto `POST /api/cycle` e `DELETE`) → 409.

- [x] **Step 1: Testes do serviço** (`createTestDb`/`createTestUser`): ativar natural e ler estado (`cycleDay`, `window`); ativar pílula da ficha dela (`currentUnitStart "2026-10-22"`, `currentUnit 3`, `pack "21"`, `pauseEvery 4`) → `scheduled.pill 15` em `2026-11-05`; `saveDay` cria/atualiza/apaga e recusa dia futuro; troca de método fecha o anterior e as médias só usam dias ≥ `started_on` novo; desativar → `getCycleState` null, dados intactos, reativar devolve; `deleteCycleData` apaga só as linhas desta pessoa (segundo usuário intacto); `setPillTaken` idempotente; `pill.due` falso na pausa.
- [x] **Step 2:** `bun test --conditions react-server src/server/cycle/service.test.ts` → FAIL.
- [x] **Step 3:** Schema em `packages/db/src/schema/cycle.ts` (padrões de `body.ts`/`mind.ts`), `bun db:generate` da raiz e conferir que o SQL gerado cria só as 5 tabelas; serviço; rotas no padrão de `api/medications/[id]/route.ts` (zod com `z.enum(...)` das constantes de `lib/cycle.ts`, `TIME_SCHEMA`, `DAY_SCHEMA`).
- [x] **Step 4:** Mesmo comando → PASS; `bun run test` e `bun check-types` → ok. Migration testada só em banco local: `DATABASE_URL=file:<scratch>/c.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate`.

### Task 3: Tokens, aba e tela principal do Ciclo — ✅ feita (1 round: confirmação antes de pausa/emenda; card de hoje após salvar)

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (tokens pêssego + sombra), `apps/web/src/lib/tone.ts` (tom `peach`)
- Modify: `apps/web/src/components/tab-bar.tsx` (prop `showCycle`), `apps/web/src/app/(app)/layout.tsx` (passa `isCycleEnabled`)
- Create: `apps/web/src/app/(app)/ciclo/page.tsx`, `hooks/useCiclo.ts`, `hooks/format.ts` + `format.test.ts`, `components/{ResumoCiclo,PilulaHoje,HojeCiclo,RegistroSheet,CicloSkeleton,CicloError}.tsx`

**Interfaces:**
- Consumes: Task 2 (`GET /api/cycle`, `PUT /api/cycle/days/[day]`, `POST/DELETE /api/cycle/pill`, `POST /api/cycle/anchors`, `PATCH /api/cycle/settings`), `isCycleEnabled`.
- Produces: `TabBar({ showCycle }: { showCycle: boolean })` — aba "Ciclo" (`FlowerLotusIcon`, `/ciclo`) entre Mente e Saúde; `useCiclo()` com `{ ready, error, reload, cycle, saveDay(day, entry), openRegistro(day?), togglePill(), startPause(), extendPack(), ... }`; helpers `summaryLabel(state)`, `windowLabel({from,to})` ("entre 24 e 28/nov"), `pillLabel(position)` ("Cartela 3 de 4", "comprimido 15 de 21"), `pauseLabel(position)`.

- [x] **Step 1: Testes dos helpers** (`ciclo/hooks/format.test.ts`): `windowLabel({from:"2026-11-24",to:"2026-11-28"}) === "entre 24 e 28/nov"`; faixa que cruza mês → `"entre 30/nov e 2/dez"`; `pillLabel` do caso dela → `"Cartela 3 de 4"` e `"comprimido 15 de 21"`; `lateLabel(3) === "Passou da previsão há 3 dias · registre quando vier"`; `showExtend(position)` verdadeiro só com pausa a ≤ 3 dias ou em curso. FAIL → implementar → PASS.
- [x] **Step 2: UI** conforme `docs/Ciclo (mockup).html` blocos 2 e 3 (estados A pílula, B pausa, C natural com anel, D contínuo, e atraso neutro do design), com `Screen` ("Ciclo" + subtítulo do método), engrenagem no header → `/perfil#ciclo`, `RegistroSheet` (`BottomSheet` tom peach, `ChoiceChip` de fluxo único e sintomas múltiplos, sintomas escondidos fora; "editar lista" grava `hiddenSymptoms`), botões "Comecei a pausa hoje" (sempre na pílula com pausa/anel/adesivo) e "Emendar mais uma cartela" (`showExtend`). "Menstruei hoje" no natural abre o `RegistroSheet` com `medium` pré-selecionado. Sem ciclo ativo, `/ciclo` redireciona para `/ciclo/ativar`.
- [x] **Step 3:** Tokens + tom `peach` (`tint: "bg-peach-tint", solid: "bg-peach", deep: "text-peach-deep"`); tab bar com `showCycle` vindo do layout.
- [x] **Step 4:** `bun run test` + `bun check-types` → ok.

### Task 4: Pílula no Hoje e na Corpo — ✅ feita (review limpa)

**Files:**
- Modify: `apps/web/src/server/today/service.ts` (+ teste), `apps/web/src/app/api/intakes/route.ts` (GET devolve `pill`), `apps/web/src/lib/api-types.ts`
- Modify: `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts`, `corpo/components/RemediosSection.tsx`

**Interfaces:**
- Consumes: Task 2 `getCycleState` (ou um `getPillToday(db, userId, day): Promise<{ time: string; taken: boolean; label: string } | null>` exportado do serviço do ciclo — criar aqui se ainda não existir).
- Produces: `GET /api/intakes` → `{ intakes, pill: { time; taken; label } | null }`; `TodayData.meds` soma a pílula devida (taken/total).

- [x] **Step 1: Testes** em `server/today/service.test.ts`: com pílula ativa e não tomada → `meds { taken: 0, total: 1 }` (sem remédios); tomada → `{ 1, 1 }`; na pausa → `{ 0, 0 }`; ciclo desativado → `{ 0, 0 }`. FAIL → implementar → PASS.
- [x] **Step 2: Corpo:** linha "Pílula" em "Remédios de hoje" com `IconChip` tom peach e `FlowerLotusIcon`, subtítulo `"21:00 · comprimido 15 de 21"`; tocar alterna via `POST`/`DELETE /api/cycle/pill` (otimista, rollback + toast "Não foi possível salvar a pílula").
- [x] **Step 3:** `bun run test` + `bun check-types` → ok.

### Task 5: Ativação, método e seção Ciclo no perfil — ✅ feita (1 round: editar sem trocar tipo atualiza no lugar; reativar recupera o método)

**Files:**
- Create: `apps/web/src/components/cycle-method-sheet.tsx` (+ helpers puros e teste em `apps/web/src/lib/cycle-method-form.ts`)
- Create: `apps/web/src/app/(app)/ciclo/ativar/page.tsx`, `ciclo/ativar/hooks/useAtivarCiclo.ts`
- Modify: `apps/web/src/app/(app)/perfil/page.tsx`, `perfil/hooks/usePerfil.ts`, create `perfil/components/CicloSection.tsx` (`id="ciclo"`) e `ApagarCicloSheet.tsx`

**Interfaces:**
- Consumes: Task 2 (`POST /api/cycle`, `PUT /api/cycle/method`, `PATCH /api/cycle/settings`, `DELETE /api/cycle`), `lib/cycle.ts`.
- Produces: `CycleMethodSheet({ open, onOpenChange, initial?, onSubmit(input: MethodInput) })`; `methodFormValid(form): boolean` e `toMethodInput(form): MethodInput`.

- [x] **Step 1: Testes** de `lib/cycle-method-form.ts`: pílula 21 sem `currentUnitStart` → inválido; pílula 21 completa → `MethodInput` com `pauseDays 7` default; 24+4 → `pauseDays 4`; natural exige `lastPeriodStart` ≤ hoje e `usualLength` 21–45; DIU hormonal não pede mais nada. FAIL → implementar → PASS.
- [x] **Step 2: Ativação** (`/ciclo/ativar`): tela do mockup bloco 4 (flor, texto, card de dados de saúde, "Ativar ciclo"/"Agora não" → `/home`); "Ativar ciclo" abre `CycleMethodSheet`; ao salvar, `POST /api/cycle`, `router.refresh()` (para a aba aparecer) e `router.replace("/ciclo")`.
- [x] **Step 3: Perfil:** `CicloSection` entre Treino e Conta: inativo → linha "Acompanhar ciclo" → `/ciclo/ativar`; ativo → linha "Método" (pill com `METHOD_LABELS`, abre o sheet com `initial`), toggle "Ciclo ativo" (`PATCH settings`, `router.refresh()`), "Apagar dados do ciclo" → `ApagarCicloSheet` (texto "Apaga menstruações, sintomas, pílula e método. Não dá pra desfazer." + botão coral) → `DELETE /api/cycle` + `router.refresh()`.
- [x] **Step 4:** `bun run test` + `bun check-types` → ok.

### Task 6: Lembretes do ciclo — ✅ feita (1 round: registrar "Nada" guarda a linha e silencia "Ainda menstruada?"; push só conta lembretes do ciclo com ciclo ativo; pausa mínima 1 dia)

**Files:**
- Modify: `apps/web/src/server/reminders/{slots,service,dispatch,messages}.ts` (+ testes), `packages/db/src/schema/reminder.ts` (união do `$type`), `apps/web/src/lib/api-types.ts` (`ReminderType`)
- Modify: `apps/web/src/app/(app)/notificacoes/page.tsx` (`META`), `notificacoes/hooks/{format.ts,useNotificacoes.ts}`

**Interfaces:**
- Consumes: Task 2 `getCycleState`.
- Produces: `ReminderType` += `"pill" | "cycle_soon" | "period_check"`; `UserState.cycle: { pill: { time: string; taken: boolean; label: string } | null; soonDay: string | null; soonKind: "period" | "pause" | null; periodCheck: boolean } | null`.

- [x] **Step 1: Testes** em `slots.test.ts`: pílula devida 21:00 não tomada → slot `send` às 21:00; tomada → nenhum; `cycle: null` → nenhum slot dos 3 tipos; `soonDay` = hoje → slot às 09:00; `periodCheck` → slot às 20:00; `service.test.ts`: seed cria `pill` e `cycle_soon` ligados, `period_check` desligado; `messages` para os 3 tipos (`pill`: "Hora da pílula", corpo `label`, url `/ciclo`; `cycle_soon`: "Sua menstruação deve vir em ~2 dias" ou "Sua pausa começa em 2 dias", url `/ciclo`; `period_check`: "Ainda menstruada?", corpo "Registre como está hoje", url `/ciclo`). FAIL → implementar → PASS.
- [x] **Step 2:** `dispatch.loadUserState` monta `cycle` a partir de `getCycleState` (null se desativado). Notificações: `META` com tom peach (`pill` PillIcon "Pílula", `cycle_soon` CalendarDotsIcon "Ciclo chegando", `period_check` DropHalfBottomIcon "Ainda menstruada?"), `reminderSubtitle` ("21:00 · descansa na pausa", "2 dias antes da pausa ou menstruação", "a partir do 5º dia, pra fechar o registro"); linhas do ciclo escondidas quando o ciclo está desativado (o hook lê `GET /api/cycle`).
- [x] **Step 3:** `bun run test` + `bun check-types` → ok.

### Task 7: Calendário e histórico + passo no onboarding — ✅ feita (1 round: dia só abre com o mês carregado; pausa em curso "em andamento"; GET /api/cycle/history)

**Files:**
- Create: `apps/web/src/app/(app)/ciclo/calendario/page.tsx`, `hooks/useCalendario.ts`, `hooks/format.ts` + `format.test.ts`, `components/{MesGrid,ResumoMedias,ListaCiclos}.tsx`
- Modify: `apps/web/src/app/onboarding/hooks/{format.ts,format.test.ts,useOnboarding.ts}`, `onboarding/components/FluxoOnboarding.tsx`, create `onboarding/components/PassoCiclo.tsx`

**Interfaces:**
- Consumes: Task 2 (`GET /api/cycle`, `GET /api/cycle/days`), Task 3 (`RegistroSheet`, `useCiclo().saveDay`) — o toque num dia do calendário abre o mesmo `RegistroSheet`.
- Produces: `monthGrid(month: string /* YYYY-MM */, days: DayEntry[], predicted: {from,to} | null, today: string): GridCell[]`; `OnboardingStep` passa a `1 | 2 | 3 | 4 | 5 | 6` (5 = Ciclo, 6 = Lembretes).

- [x] **Step 1: Testes:** `monthGrid("2026-11", …)` começa no domingo (1/nov/2026 é domingo → sem células vazias antes) e marca menstruação/prevista/escape/sintoma/hoje como no mockup; `nextStep(4, true) === 5`, `nextStep(5, true) === 6`, `nextStep(5, false) === "finish"`, `skipTarget` coerente; com "Ativar" escolhido no passo 5, o destino ao concluir é `/ciclo/ativar`. FAIL → implementar → PASS.
- [x] **Step 2:** Tela `/ciclo/calendario` conforme mockup bloco 4 (header de voltar, mês navegável, legenda, resumo de 2 colunas só no natural, "Seus ciclos" com troca de método tracejada; na pílula, linhas por sequência "pausa 6 a 12/ago · sangrou 8 a 11/ago" ou "sem sangramento"). Dia futuro não abre o sheet.
- [x] **Step 3:** `PassoCiclo` (círculo peach com `FlowerLotusIcon`, "Quer acompanhar seu ciclo?", "Ativar"/"Pular"; texto curto sobre dados de saúde).
- [x] **Step 4:** `bun run test` + `bun check-types` → ok.

### Task 8: Verificação real — em andamento (revisão final + onda de correção feitas; falta navegador)

- [ ] **Step 1:** Banco local migrado (`DATABASE_URL=file:<scratch>/ciclo.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate`), dev server com os overrides, login no Brave dela via `agent-browser --auto-connect` (aba própria, `tab new`).
- [ ] **Step 2:** Ativar pelo perfil com a ficha dela (pílula 21, pausa a cada 4, cartela 3 iniciada 22/out) → aba aparece; card mostra "Cartela 3 de 4 · comprimido 15 de 21" e pausa 3 a 9/dez; marcar pílula reflete no Hoje ("x de y tomados") e na Corpo.
- [ ] **Step 3:** Registrar sangramento + sintomas hoje e num dia passado pelo calendário; trocar para "Nenhum" (pede última menstruação) → anel com dia do ciclo e faixa.
- [ ] **Step 4:** Notificações mostra as 3 linhas do ciclo; desativar no perfil → aba some, linhas somem, Hoje não conta a pílula; reativar → dados voltam; apagar dados → tudo some.
- [ ] **Step 5:** Onboarding com conta nova: passo Ciclo → "Ativar" → cai em `/ciclo/ativar`.
- [ ] **Step 6:** Reportar o que não foi possível confirmar (push real).
