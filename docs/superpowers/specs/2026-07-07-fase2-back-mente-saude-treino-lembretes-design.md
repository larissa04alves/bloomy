# Fase 2 — Back-end de Perfil, Mente, Saúde, Treino e Lembretes — Design

**Goal:** Completar o backend dos domínios que faltam para o frontend inteiro poder ser
construído em seguida: Perfil (gate de onboarding + prefs do treino), Mente (check-in),
Saúde (consultas/exames com ciclo de retorno), Treino (fluxo completo) e Lembretes
(config). Cada domínio entrega schema Drizzle + migration, serviço em `server/`, rotas
REST autenticadas e testes dos pontos críticos.

**Contexto:** A Fase 1 entregou Corpo (água, refeições, remédios) + Metas
(`docs/superpowers/plans/2026-07-06-fase1-back-corpo.md`). Decisão da usuária: **completar
todo o back antes do frontend**. Esta fase fecha essa lacuna. **Metas não precisa de
schema novo** — os 4 goals (water/meals/workout/mind) já existem; o que falta lá é só
exibição (ver §6).

**Arquitetura (segue Fase 1, ADR-0001/0002):** rotas REST finas (`zod` → `requireUserId`
→ serviço); regras em `apps/web/src/server/<domínio>/service.ts` recebendo `db: Db` por
parâmetro (testável com libsql em arquivo temp); registros diários gravam coluna `day`
via `dayFor()` (fuso `America/Sao_Paulo`). Serviços com `import "server-only"`.

**Tech stack:** Next.js 16 (route handlers), Drizzle ORM + libsql/Turso, better-auth,
zod v4, bun test.

## Global Constraints (idênticas à Fase 1)

- Identificadores em EN; UI/copy em PT (fase futura). Glossário: `apps/web/CONTEXT.md`.
- Migrations sempre (`bun db:generate` + `bun db:migrate`); **nunca** `db:push`.
- Toda rota `/api` exige sessão → 401 `{ "error": "unauthorized" }`; zod inválido → 400.
- Schema segue o padrão de `auth.ts` (ids `text` UUID, timestamps
  `integer { mode: "timestamp_ms" }` com default `unixepoch('subsecond')`).
- Tabelas de registro diário têm coluna `day` (`text`, `YYYY-MM-DD`) e índice
  `(user_id, day)`.
- Testes depois, só críticos. Conventional Commits em PT (≤50 chars).
- `bun check-types` passa antes de cada commit. Sem UI nesta fase.

## Decisões travadas (do brainstorming)

- **Treino:** fluxo completo (templates + sessão em andamento + log de séries + histórico
  "último treino" + streak).
- **Mente:** 1 check-in por dia (humor + ansiedade + nota, upsert).
- **Lembretes:** só CRUD de `reminder` (config); disparo de push adiado → issue #5.
- **Google auth:** adiado; e-mail/senha por ora → issue #4.
- **Saúde:** consulta/exame concluído pode gerar um **retorno** como novo item pendente.
- **Retorno** copia profissional/especialidade da origem; aparece no card "próxima
  consulta" do Hoje **só quando `suggestedAt` ≤ 30 dias** (senão, só na aba Saúde).
- **Metas × Remédios:** remédios NÃO viram um 5º goal — exibidos como adesão derivada.
- **"Nova meta" custom:** fora do MVP (metas são as 4 fixas do produto).
- **Ansiedade:** guardada como inteiro 0–100 (posição do slider).

## Trabalho adiado (issues já criadas)

- **#4** — Configurar login com Google (OAuth): precisa de credenciais do Google Cloud.
- **#5** — Entrega real de push (VAPID + service worker + agendador): fase de PWA.

---

## 1. Perfil — `profile`

Destrava o gate de onboarding (frontend decide onboarding vs abas) e guarda as prefs do
timer de descanso do Treino. Relação 1:1 com `user` (que é gerido pelo better-auth — não
alteramos a tabela `user`; criamos `profile` à parte).

**Schema (`packages/db/src/schema/profile.ts`):**

| Coluna | Tipo | Nota |
|---|---|---|
| `userId` | text PK → `user.id` (cascade) | 1:1 |
| `onboardingCompletedAt` | timestamp_ms nullable | null = mandar pro onboarding |
| `restSeconds` | integer default 45 | timer de descanso do treino |
| `autoRest` | integer(boolean) default true | liga timer automático |
| `createdAt` / `updatedAt` | timestamp_ms | |

**Serviço (`server/profile/service.ts`):**
- `ensureProfile(db, userId): Promise<Profile>` — cria on-demand (onConflictDoNothing) e retorna.
- `updateProfile(db, userId, input: { restSeconds?; autoRest?; completeOnboarding?: boolean }): Promise<Profile>`.

**Rotas:**
- `GET /api/profile` → `{ profile }` (cria na 1ª chamada).
- `PATCH /api/profile` `{ restSeconds?, autoRest?, completeOnboarding? }` → `{ profile }`.

Saudação e avatar do app usam `user.name` / `user.image` (better-auth) — não duplicar.

---

## 2. Mente — `mood_checkin` (1 por dia, upsert)

Um check-in por (usuário, dia): humor + ansiedade + nota opcional. Casa com a meta
`mind` (1/dia) e o tile "registrado ✓" do Hoje. "Seus registros" = dias passados.

**Schema (`packages/db/src/schema/mind.ts`):**

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | text PK UUID | |
| `userId` | text → user (cascade) | |
| `day` | text `YYYY-MM-DD` | unique `(user_id, day)` |
| `mood` | text enum `sad·meh·neutral·good·great` | 5 faces do design |
| `anxiety` | integer nullable | 0–100 (slider Tranquilo→Agitado) |
| `note` | text nullable | mini-diário |
| `createdAt` / `updatedAt` | timestamp_ms | |

**Serviço (`server/mind/service.ts`):**
- `upsertCheckin(db, userId, input: { mood?; anxiety?; note? }): Promise<MoodCheckin>` — dia
  = `dayFor()`; insere ou atualiza (só os campos enviados) via `onConflictDoUpdate` no
  índice `(user_id, day)`.
- `getCheckin(db, userId, day): Promise<MoodCheckin | null>`.
- `listCheckins(db, userId, limit): Promise<MoodCheckin[]>` — desc por `day`.

**Rotas:**
- `GET /api/checkins?day=` → `{ checkin: MoodCheckin | null }` (day opcional = hoje).
- `PUT /api/checkins` `{ mood?, anxiety?, note? }` → `{ checkin }` (upsert de hoje).
- `GET /api/checkins/history?limit=` → `{ checkins: MoodCheckin[] }`.

---

## 3. Saúde — `appointment` + `exam` com ciclo de retorno

Consultas têm **hora cheia** (timestamp_ms), não coluna `day`. Item concluído pode gerar
um **retorno**: um novo item `to_schedule` com data-alvo (`suggestedAt`), que aparece nas
listas de "a agendar" e — perto da data — no Hoje.

### 3.1 `appointment` (`packages/db/src/schema/health.ts`)

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | text PK UUID | |
| `userId` | text → user (cascade) | |
| `professional` | text notNull | |
| `specialty` | text nullable | |
| `status` | text enum `scheduled·completed·to_schedule` | default `scheduled` |
| `scheduledAt` | timestamp_ms **nullable** | null quando `to_schedule` |
| `suggestedAt` | timestamp_ms nullable | alvo do retorno |
| `completedAt` | timestamp_ms nullable | quando foi concluída |
| `location` | text nullable | |
| `remindDayBefore` | integer(boolean) default false | |
| `parentId` | text nullable → `appointment.id` | origem do retorno |
| `createdAt` / `updatedAt` | timestamp_ms | |

Índices: `(user_id, scheduled_at)`, `(user_id, status)`.

### 3.2 `exam`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` / `userId` | — | |
| `name` | text notNull | |
| `status` | text enum `to_schedule·scheduled·result_available·completed` | default `to_schedule` |
| `scheduledAt` | timestamp_ms nullable | |
| `suggestedAt` | timestamp_ms nullable | alvo do retorno |
| `completedAt` | timestamp_ms nullable | |
| `parentId` | text nullable → `exam.id` | origem do retorno |
| `createdAt` / `updatedAt` | timestamp_ms | |

### 3.3 Serviço (`server/health/service.ts`)

- `listAppointments(db, userId): Promise<Appointment[]>` — ordenado por `scheduledAt`/`suggestedAt`.
- `nextAppointment(db, userId, opts?: { withinDays?: number }): Promise<Appointment | null>` —
  próxima `scheduled` com `scheduledAt ≥ agora`; para o Hoje, também considera retornos
  `to_schedule` com `suggestedAt ≤ agora + 30 dias`. `withinDays` filtra a janela.
- `createAppointment` / `updateAppointment` / `deleteAppointment`.
- `completeAppointment(db, userId, id, input: { needsReturn: boolean; followUpMonths?: number }):
  Promise<{ completed: Appointment; followUp: Appointment | null }>` — em transação: marca
  `status=completed`, `completedAt=agora`; se `needsReturn`, insere novo `appointment`
  `{ status: to_schedule, suggestedAt: agora + followUpMonths (meses), professional/specialty
  copiados, parentId: id }`.
- Exames: `listExams` / `createExam` / `updateExam` / `deleteExam` /
  `completeExam(... { needsReturn, followUpMonths })` (mesma lógica de retorno, gerando `exam`).

`followUpMonths` → `suggestedAt` absoluto calculado no serviço (soma de meses).

### 3.4 Rotas

- `GET /api/appointments` → `{ appointments }`.
- `GET /api/appointments/next` → `{ appointment: Appointment | null }` (Hoje; janela 30d p/ retornos).
- `POST /api/appointments` `{ professional, specialty?, scheduledAt, location?, remindDayBefore? }` → `{ appointment }` (201).
- `PUT /api/appointments/:id` (parcial; usado também para dar data a um retorno `to_schedule` → vira `scheduled`).
- `POST /api/appointments/:id/complete` `{ needsReturn, followUpMonths? }` → `{ appointment, followUp }`.
- `DELETE /api/appointments/:id`.
- `GET /api/exams` · `POST /api/exams` · `PUT /api/exams/:id` · `DELETE /api/exams/:id`.
- `POST /api/exams/:id/complete` `{ needsReturn, followUpMonths? }` → `{ exam, followUp }`.

Agenda de remédios reusa `/api/medications` (Fase 1) — sem rota nova.

---

## 4. Treino — fluxo completo (4 tabelas)

Templates de treino com exercícios; sessão em andamento (máquina de estados do handoff);
log de séries com reps/carga; "último treino" derivado; streak semanal.

### 4.1 Schema (`packages/db/src/schema/workout.ts`)

**`workout`** (template): `id`, `userId`, `name` (notNull), `focus` enum
`chest·back·legs·cardio`, `active` (boolean default true), `createdAt`, `updatedAt`.
Índice `(user_id)`.

**`exercise`** (exercício do template): `id`, `workoutId` (→ workout, cascade), `userId`,
`name` (notNull), `targetSets` (integer notNull), `position` (integer, ordenação),
`createdAt`. Índice `(workout_id)`.

**`workout_session`**: `id`, `userId`, `workoutId` (→ workout), `day` (`YYYY-MM-DD`),
`startedAt` (timestamp_ms), `completedAt` (timestamp_ms nullable), `createdAt`. Índice
`(user_id, day)`. Status derivado de `completedAt` (null = em andamento).

**`set_log`**: `id`, `sessionId` (→ session, cascade), `exerciseId` (→ exercise), `userId`,
`setIndex` (integer, 1..N), `reps` (integer nullable), `load` (real nullable, kg), `done`
(boolean default false), `doneAt` (timestamp_ms nullable), `createdAt`. Índice `(session_id)`.

### 4.2 Convenções de comportamento

- **Iniciar sessão** gera as `set_log` de cada exercício (× `targetSets`), pré-preenchidas
  com `reps`/`load` do último treino concluído do mesmo exercício ("Último treino: 40 kg ·
  10 reps"). `done=false`.
- **Uma sessão em andamento por vez** por usuário — `POST /sessions` retorna 409 se já
  houver uma sem `completedAt`. `GET /api/sessions/active` retoma.
- **Streak** = nº de semanas consecutivas **fechadas** (semana ISO, seg–dom, fuso BR) em
  que sessões concluídas ≥ meta semanal (goal `workout`, default 4). A semana corrente
  mostra progresso e **não quebra** o streak até fechar.

### 4.3 Serviço (`server/workout/service.ts`)

- `listWorkouts(db, userId): Promise<WorkoutWithExercises[]>` — templates ativos + exercícios (ordenados por `position`) + contagem.
- `createWorkout(db, userId, input: { name; focus; exercises: {name; targetSets; position}[] }): Promise<WorkoutWithExercises>`.
- `updateWorkout(db, userId, id, input): Promise<...>` — edita template; exercícios via replace-all (add/remove/reorder).
- `deactivateWorkout(db, userId, id): Promise<boolean>` — soft delete (`active=false`).
- `lastPerformance(db, userId, exerciseName): Promise<{ reps: number | null; load: number | null } | null>` — última sessão concluída com esse nome de exercício (por `exerciseName`, para o histórico sobreviver a edições de template).
- `startSession(db, userId, workoutId): Promise<SessionDetail | "already_active" | "not_found">` — cria sessão + `set_log` pré-preenchidos.
- `getActiveSession(db, userId): Promise<SessionDetail | null>`.
- `updateSet(db, userId, sessionId, setId, input: { reps?; load?; done? }): Promise<SetLog | null>` — marca Feito / edita.
- `completeSession(db, userId, sessionId): Promise<{ completedAt; durationSec; exerciseCount } | null>`.
- `workoutSummary(db, userId): Promise<{ weekCount: number; weekTarget: number; streak: number; weekDays: boolean[] }>` — Hoje/Treino/Metas.

`SessionDetail` = sessão + exercícios com suas séries (`set_log`) + `lastPerformance` por exercício.

### 4.4 Rotas

- `GET /api/workouts` · `POST /api/workouts` · `PUT /api/workouts/:id` · `DELETE /api/workouts/:id` (soft).
- `POST /api/workouts/:id/sessions` → inicia (201; 409 se já ativa; 404 se template não existe).
- `GET /api/sessions/active` → `{ session: SessionDetail | null }`.
- `PUT /api/sessions/:id/sets/:setId` `{ reps?, load?, done? }` → `{ set }`.
- `POST /api/sessions/:id/complete` → `{ completedAt, durationSec, exerciseCount }`.
- `GET /api/workouts/summary` → `{ weekCount, weekTarget, streak, weekDays }`.

---

## 5. Lembretes — `reminder` (só config)

Persiste horários e toggles por domínio. O disparo real (push) é a issue #5.

**Schema (`packages/db/src/schema/reminder.ts`):** `id`, `userId`, `type` enum
`water·meds·workout·mind`, `time` (text `HH:MM`), `enabled` (boolean default true),
`createdAt`, `updatedAt`. Índice `(user_id)`.

**Serviço (`server/reminders/service.ts`):** `listReminders` / `createReminder` /
`updateReminder` (toggle/hora) / `deleteReminder`.

**Rotas:** `GET /api/reminders` · `POST /api/reminders` `{ type, time }` ·
`PUT /api/reminders/:id` `{ time?, enabled? }` · `DELETE /api/reminders/:id`.

---

## 6. Metas — sem back novo (só decisões de exibição)

Nenhuma tabela/rota nova. Documentar para a fase de frontend:
- Metas configuráveis = os 4 goals existentes (water/meals/workout/mind).
- **Remédios** aparece na tela Metas como **adesão derivada** (tomadas ÷ esperadas do dia,
  via `/api/intakes`), sem target editável e sem virar goal.
- **"Nova meta"** custom: fora do MVP.
- Onboarding grava metas reusando `GET /api/goals` (cria defaults) + `PUT /api/goals/:id`
  por domínio alterado; marca conclusão via `PATCH /api/profile { completeOnboarding: true }`.

---

## Contrato REST — novas rotas desta fase

| Método | Rota | Body/Query | Retorno |
|---|---|---|---|
| GET | `/api/profile` | — | `{ profile }` (cria na 1ª) |
| PATCH | `/api/profile` | `{ restSeconds?, autoRest?, completeOnboarding? }` | `{ profile }` |
| GET | `/api/checkins?day=` | day opcional | `{ checkin \| null }` |
| PUT | `/api/checkins` | `{ mood?, anxiety?, note? }` | `{ checkin }` |
| GET | `/api/checkins/history?limit=` | — | `{ checkins }` |
| GET | `/api/appointments` | — | `{ appointments }` |
| GET | `/api/appointments/next` | — | `{ appointment \| null }` |
| POST | `/api/appointments` | `{ professional, specialty?, scheduledAt, location?, remindDayBefore? }` | `{ appointment }` (201) |
| PUT | `/api/appointments/:id` | parcial | `{ appointment }` |
| POST | `/api/appointments/:id/complete` | `{ needsReturn, followUpMonths? }` | `{ appointment, followUp }` |
| DELETE | `/api/appointments/:id` | — | `{ ok: true }` |
| GET | `/api/exams` | — | `{ exams }` |
| POST | `/api/exams` | `{ name, status?, scheduledAt? }` | `{ exam }` (201) |
| PUT | `/api/exams/:id` | parcial | `{ exam }` |
| POST | `/api/exams/:id/complete` | `{ needsReturn, followUpMonths? }` | `{ exam, followUp }` |
| DELETE | `/api/exams/:id` | — | `{ ok: true }` |
| GET | `/api/workouts` | — | `{ workouts }` (ativos + exercícios) |
| POST | `/api/workouts` | `{ name, focus, exercises[] }` | `{ workout }` (201) |
| PUT | `/api/workouts/:id` | `{ name?, focus?, exercises? }` | `{ workout }` |
| DELETE | `/api/workouts/:id` | — | `{ ok: true }` (soft) |
| POST | `/api/workouts/:id/sessions` | — | `{ session }` (201; 409 se ativa) |
| GET | `/api/sessions/active` | — | `{ session \| null }` |
| PUT | `/api/sessions/:id/sets/:setId` | `{ reps?, load?, done? }` | `{ set }` |
| POST | `/api/sessions/:id/complete` | — | `{ completedAt, durationSec, exerciseCount }` |
| GET | `/api/workouts/summary` | — | `{ weekCount, weekTarget, streak, weekDays }` |
| GET | `/api/reminders` | — | `{ reminders }` |
| POST | `/api/reminders` | `{ type, time }` | `{ reminder }` (201) |
| PUT | `/api/reminders/:id` | `{ time?, enabled? }` | `{ reminder }` |
| DELETE | `/api/reminders/:id` | — | `{ ok: true }` |

---

## Testes críticos (só os pontos de risco)

- **Mente:** upsert não duplica no mesmo dia; atualização parcial preserva campos não enviados.
- **Saúde:** `completeAppointment` com `needsReturn` cria retorno `to_schedule` com
  `suggestedAt` correto, profissional/especialidade copiados e `parentId`; sem retorno
  quando `needsReturn=false`. `nextAppointment` inclui retorno só dentro da janela de 30d.
- **Treino:** `startSession` pré-preenche séries com o último treino; 409 quando já há sessão
  ativa; `completeSession` calcula duração; **`workoutSummary` calcula streak** (semanas
  consecutivas ≥ meta; semana corrente não quebra); `lastPerformance` pega a última concluída.
- **Lembretes:** toggle `enabled` persiste; `time` valida `HH:MM`.
- Funções puras de derivação testadas isoladas (streak, próxima consulta, prefill).

## Decomposição sugerida (para o writing-plans)

1. **Perfil** — schema + migration + serviço + rotas.
2. **Mente** — schema + migration + serviço + rotas.
3. **Saúde** — schema (appointment+exam) + migration + serviço (com retorno) + rotas.
4. **Treino** — schema (4 tabelas) + migration + serviço (templates + sessão + streak) + rotas.
   *Candidato a subdividir: 4a templates/CRUD, 4b sessão/séries/streak.*
5. **Lembretes** — schema + migration + serviço + rotas.
6. **Testes críticos** — os listados acima.
7. **Verificação final** — `check-types`, `build`, smoke 401 + fluxo autenticado.

Migrations podem ser geradas uma por task ou consolidadas numa só no fim — decidir no plano.
