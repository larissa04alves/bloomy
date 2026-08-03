# Front Saúde — aba "Saúde" (design)

> **Contexto:** back 100% pronto e testado (schema `appointment`/`exam` em
> `packages/db/src/schema/health.ts`, serviço `apps/web/src/server/health/service.ts`,
> `medications` em `apps/web/src/server/medications/service.ts`, rotas REST em
> `apps/web/src/app/api/{appointments,exams,medications}/**`). Front da aba Saúde é skeleton
> (`app/(app)/saude/page.tsx` → `<ScreenSkeleton label="Saúde" />`). Esta fase entrega a aba
> Saúde de ponta a ponta contra a API existente, seguindo o padrão provado em Corpo/Treino/Mente.
>
> Autoridade visual: `DESIGN.md` + `docs/README.md` (§6 Saúde) + protótipo
> `docs/Diario App (standalone).html`/`.dc.html` (tela `data-screen-label="Saúde"`, linhas 386–429
> do `.dc.html`). Autoridade de produto: `PRODUCT.md`. Convenções: `apps/web/CLAUDE.md`,
> `packages/db/CLAUDE.md`.

## Objetivo

Aba Saúde funcional como **tela de gestão médica** (o "de vez em quando" do PRODUCT.md §1):
gerir **consultas**, **exames** e a **agenda de remédios** — criar, editar, apagar, concluir (com
retorno) e ver histórico. Recriação fiel do hifi. Domínio visual **lilás** (geral/saúde) para
consultas e exames; **coral** só para remédios (Regra da Cor por Domínio, DESIGN.md).

Ao final, a tela deve estar **100% funcional e conectada ao back**.

## Escopo (decidido no brainstorming + grilling)

- **"+" nas 3 seções** (Consultas, Exames, Remédios), cada uma abrindo seu bottom sheet.
- **Swipe Editar/Apagar nas 3 seções** (reusa `SwipeableRow`, igual Corpo/Treino). Delete
  **imediato/otimista, sem confirmação** (convenção de `useRefeicoes`/`useTreinos`).
- **Concluir via check no card** (consultas e exames): tap no círculo → conclui → abre
  `RetornoSheet`. Remédios **não** têm check (não "concluem").
- **Check no exame conclui em qualquer status**; mudança entre status (a agendar/agendada/
  resultado disponível) é feita pelo Editar.
- **Listas ativas escondem `completed`**; mostram `scheduled`/`to_schedule` (incl. o retorno
  recém-criado).
- **"Ver histórico"** (link no header) em **consultas e exames** → `HistorySheet` read-only
  listando os `completed`.
- **Card-resumo "Próxima consulta"** considera consultas marcadas **e** retornos a agendar
  (regra do `nextAppointment`), via `GET /api/appointments/next`.
- **Chips de ícone:** lilás/`stethoscope` (consultas), lilás/`test-tube` (exames),
  coral/`pill` (remédios), lilás/`calendar-heart` (card-resumo). Ícone único por seção — sem
  mapa por especialidade (texto livre, mapeamento frágil).
- **Refactor Corpo:** remédios lá viram **só leitura + marcar tomado** — remover "+ Cadastrar",
  `MedicationModal` e `addMedication` de `RemediosSection`/`useRemedios`.

**Fora de escopo:** Lembretes/Notificações (§10) e Minhas metas (§11) — telas separadas.
A notificação real de "Lembrar 1 dia antes" (só persiste o flag agora).

## Contratos do back (já existentes)

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/appointments` | `{ appointments: Appointment[] }` (asc por `scheduledAt`) |
| `POST` | `/api/appointments` | cria (`scheduled`); body `{ professional, specialty?, scheduledAt, location?, remindDayBefore? }` → `{ appointment }` (201) |
| `GET` | `/api/appointments/next` | `{ appointment: Appointment \| null }` (próxima marcada futura ∪ retorno ≤30d) |
| `PUT` | `/api/appointments/[id]` | parcial; dar `scheduledAt` a um `to_schedule` promove p/ `scheduled` → `{ appointment }` |
| `DELETE` | `/api/appointments/[id]` | remove → `{ ok }` (404 se não achar) |
| `POST` | `/api/appointments/[id]/complete` | body `{ needsReturn, followUpMonths? }` → `{ appointment, followUp }` (cria retorno `to_schedule` se `needsReturn`) |
| `GET` | `/api/exams` | `{ exams: Exam[] }` |
| `POST` | `/api/exams` | body `{ name, status?, scheduledAt? }` → `{ exam }` (201) |
| `PUT` | `/api/exams/[id]` | parcial `{ name?, status?, scheduledAt? }` → `{ exam }` |
| `DELETE` | `/api/exams/[id]` | remove |
| `POST` | `/api/exams/[id]/complete` | igual consultas → `{ exam, followUp }` |
| `GET` | `/api/medications` | `{ medications: Medication[] }` (só `active`, asc por nome) |
| `POST` | `/api/medications` | body `{ name, dose?, stock?, times[] }` → `{ medication }` (201) |
| `PUT` | `/api/medications/[id]` | parcial → `{ medication }` |
| `DELETE` | `/api/medications/[id]` | soft-delete (`active=false`) |

- `Appointment.status`: `scheduled · completed · to_schedule`. Campos: `scheduledAt`,
  `suggestedAt` (retorno), `completedAt`, `location`, `remindDayBefore`, `parentId`.
- `Exam.status`: `to_schedule · scheduled · result_available · completed`.
- **Datas:** `scheduledAt`/`suggestedAt` são **instantes** (timestamp_ms), não coluna `day` —
  sem lógica de fuso BR aqui (isso é só p/ registro diário, ADR-0002).
- `Medication`: `{ id, name, dose, stock, times[], active }`.

## Camada de dados

### `api-types.ts` (adicionar)

```ts
export type AppointmentStatus = "scheduled" | "completed" | "to_schedule";
export type Appointment = {
  id: string;
  professional: string;
  specialty: string | null;
  status: AppointmentStatus;
  scheduledAt: string | null;   // ISO
  suggestedAt: string | null;   // ISO (retorno)
  completedAt: string | null;   // ISO
  location: string | null;
  remindDayBefore: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExamStatus = "to_schedule" | "scheduled" | "result_available" | "completed";
export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  to_schedule: "a agendar",
  scheduled: "agendada",
  result_available: "resultado disponível",
  completed: "concluído",
};
export type Exam = {
  id: string;
  name: string;
  status: ExamStatus;
  scheduledAt: string | null;
  suggestedAt: string | null;
  completedAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};
```

`Reminder` **não** entra agora (Lembretes é §10, fora de escopo — evita DTO morto).

`Medication`/`IntakeSlot` já existem em `api-types.ts`.

### Hooks (3, padrão `useResource` — otimista + rollback)

- **`useConsultas`** (`saude/hooks/useConsultas.ts`)
  - fetch: `GET /api/appointments` (lista) + `GET /api/appointments/next` (card).
  - derivados: `ativas` = lista sem `completed`; `historico` = só `completed` (desc `completedAt`).
  - ações: `create(input)`, `update(id, input)`, `remove(id)`, `complete(id, { needsReturn, followUpMonths })`.
  - após `create`/`complete` → recarrega `next` (o card pode mudar).
- **`useExames`** (`saude/hooks/useExames.ts`) — análogo, sem card `next`.
  - derivados: `ativos` (sem `completed`) e `historico`.
  - ações: `create`, `update` (incl. `status`), `remove`, `complete`.
- **`useAgendaRemedios`** (`saude/hooks/useAgendaRemedios.ts`)
  - fetch: `GET /api/medications` → `Medication[]`.
  - ações: `create`, `update`, `remove` (DELETE = soft-delete no back).
  - **≠ `useRemedios` de Corpo** (aquele lista `IntakeSlot` derivado p/ marcar tomado; este
    lista o **cadastro** `Medication`).

## Composição da tela (`saude/page.tsx` — só renderiza)

`Screen` title "Saúde" subtitle "Consultas, exames e agenda de remédios" contém, na ordem:

1. **`ProximaConsultaCard`** — card tint lilás (`rounded-card` 24px), chip branco 46px
   `calendar-heart` lilás-deep. Copy conforme a próxima (`GET /next`):
   - `scheduled`: título "Próxima consulta em {N} dias" (N via helper de dias relativos;
     "hoje"/"amanhã"/"em N dias"), sub "{professional} · {dia} às {hora}".
   - `to_schedule`: título "Retorno a agendar", sub "{professional} · sugerido em {MMM}".
   - `null`: card gentil "Nenhuma consulta marcada" (tint lilás suave), sem chip de data.
2. **`ConsultasSection`** — header "Consultas" + link "Ver histórico" + "+ Agendar".
   Cada item: `SwipeableRow` (Editar/Apagar) envolvendo card branco `rounded-[18px]`
   `shadow-card-sm`: chip lilás `stethoscope` + nome (Quicksand 14/700) + especialidade
   (Nunito 12/600 ink-read) + à direita data/hora (lilás-deep) **+ check** (`CircleIcon`
   control-off → tap conclui). Retorno `to_schedule`: mostra "a agendar" (coral) no lugar da data.
3. **`ExamesSection`** — header "Exames" + "Ver histórico" + "+ Adicionar". Item igual, chip
   lilás `test-tube`, subtítulo = `EXAM_STATUS_LABELS[status]` com tom por status
   (to_schedule→coral, scheduled→lilás-deep, result_available→green-deep) + **check**.
4. **`AgendaRemediosSection`** — header "Agenda de remédios" + "+ Cadastrar" (coral). Item:
   `SwipeableRow` (Editar/Apagar) + card branco chip coral `pill` + nome + "{N}x ao dia ·
   {HH:MM[, HH:MM]}". **Sem check.**

**Empty states:** card tracejado gentil (`border-dashed border-hairline`, ink-read) por seção
("Nenhuma consulta agendada", "Nenhum exame por aqui", "Nenhum remédio cadastrado").

## Componentes de interação (bottom sheets)

Todos via `BottomSheet` (vaul) + `@tanstack/react-form` + zod (padrão `MedicationModal`).

- **`AppointmentModal`** (tone lilás) — cria/edita. Campos: **Profissional** (text, obrigatório),
  **Especialidade** (text, opcional — alimenta o subtítulo do card), **Data/Hora**
  (`<input type="datetime-local">` → ISO), **Local** (text, opcional), **toggle "Lembrar 1 dia
  antes"** (`ToggleSwitch` → `remindDayBefore`; só persiste). Botão "Agendar"/"Salvar" lilás.
  - Editar um retorno `to_schedule`: preencher Data/Hora promove p/ `scheduled` (back faz).
- **`ExamModal`** (tone lilás) — Nome (obrigatório) + **status** (`ChoiceChip`: a agendar/
  agendada/resultado disponível — `completed` só via check) + Data opcional. Botão lilás.
- **`MedicationModal`** — **mover** de `corpo/components/` p/ `saude/components/` (consumidor
  único agora) e **estender p/ editar**: aceitar `initial?: Medication`; título/botão trocam
  ("Cadastrar" vs "Salvar"); prefill de nome/dose/estoque/times; submit → POST ou PUT.
- **`RetornoSheet`** (compartilhado, tone lilás) — pós-check. Título "Agendar retorno?",
  chips **1 / 3 / 6 / 12 meses** + botão "Não precisa". "Não precisa" → `complete(needsReturn:false)`;
  chip + confirmar → `complete(needsReturn:true, followUpMonths)`. Reusado por consultas e exames.
- **`HistorySheet`** (compartilhado, read-only, tone lilás) — recebe título + itens concluídos;
  lista nome + "concluído em {DD/MM}", desc por `completedAt`. Empty: "Nada por aqui ainda."

## Helpers puros (com teste unitário)

`saude/hooks/format.ts` (ou similar):
- `relativeDays(iso, now)` → "hoje" | "amanhã" | "em N dias" | "em N semanas".
- `monthShort(iso)` → "jul", "ago"… (retorno sugerido).
- `frequencyLabel(times)` → "{N}x ao dia · {HH:MM[, ...]}".
- filtros `ativos`/`historico` por status (se extraídos p/ pura).

## Refactor Corpo (remédios → só leitura + marcar)

- `corpo/components/RemediosSection.tsx`: remover botão "+ Cadastrar" e prop `onOpenModal`;
  manter lista + `onToggle`.
- `corpo/hooks/useRemedios.ts`: remover `addMedication` (e o estado otimista de criação); manter
  `intakes`/`toggle`/`taken`/`total`/`reload`.
- `corpo/page.tsx`: remover uso do `MedicationModal` + estado do modal.
- `corpo/components/MedicationModal.tsx`: **mover** p/ `saude/components/MedicationModal.tsx`.

## Testes / verificação

- **Unit** (`bun test` de `apps/web`): helpers puros (`relativeDays`, `monthShort`,
  `frequencyLabel`, filtros de status). Serviços do back já testados.
- **`bun check-types`** antes de finalizar.
- **Verificação visual real** (obrigatória, `apps/web/CLAUDE.md`): subir dev (`/dev-up 3001`) e
  exercitar em `/saude` o ciclo completo nos 3 domínios: criar → editar (swipe) → concluir
  (check → retorno) → ver histórico → apagar (swipe); conferir card-resumo e empty states; e em
  `/corpo` confirmar que remédios ficou só leitura + marcar.

## Riscos / notas

- `MedicationModal` hoje é create-only com `form.reset()` no `open`; ao estender p/ editar,
  garantir prefill correto (reset com `defaultValues` derivados de `initial`).
- `complete` do back é idempotente (guarda `ne(status,'completed')`); double-tap no check não
  recria retorno — o front deve refletir isso (após concluir, item sai da lista ativa na hora).
- Ordem de exibição das listas: back devolve asc por `scheduledAt`, mas `to_schedule` tem
  `scheduledAt=null` (ficaria no topo). **Decisão:** ordenar client-side asc por
  `scheduledAt ?? suggestedAt` (ativos); histórico desc por `completedAt`.
