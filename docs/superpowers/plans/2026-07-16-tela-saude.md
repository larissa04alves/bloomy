# Tela Saúde Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba Saúde (`/saude`) 100% funcional e conectada ao back — gestão de consultas, exames e agenda de remédios (criar, editar, apagar, concluir com retorno, ver histórico) — e refatorar Corpo para remédios serem só leitura + marcar tomado.

**Architecture:** REST fino já existente + 3 hooks por domínio (`useConsultas`/`useExames`/`useAgendaRemedios`) no padrão `useResource` (otimista + rollback); `page.tsx` só renderiza; bottom sheets (vaul) para criar/editar; helpers puros testados em `format.ts`. Fidelidade visual ao hifi (`DESIGN.md` + protótipo tela `Saúde`).

**Tech Stack:** Next.js 16 (App Router, RSC + client components), TypeScript, Tailwind 4 (tokens `@bloomy/ui`), `@tanstack/react-form` + zod, vaul (BottomSheet), `@phosphor-icons/react`, `bun test`.

**Spec:** `docs/superpowers/specs/2026-07-16-tela-saude-design.md`

## Global Constraints

- **Commits:** No bloomy **quem commita é a usuária** (`CLAUDE.md` do projeto). **NÃO commitar automaticamente.** Ao fim de cada task, rodar as verificações e **deixar as mudanças prontas e não-commitadas**; reportar o que foi feito. Onde este plano diz "Checkpoint", é isso — nunca `git commit`.
- **Disciplina de edição (colar no prompt de cada implementer):** Read cada arquivo antes de Edit (`cat`/`sed`/`head` NÃO contam p/ o harness); se Edit falhar com `string not found`, re-Read antes de re-tentar — nunca editar de memória; rodar `bun check-types` (da raiz) antes de reportar DONE.
- **Tamanho de fonte:** sempre escala nomeada do Tailwind (`text-xs`/`text-sm`/`text-base`/`text-lg`/`text-2xl`) — nunca arbitrário (`text-[13px]`). Cor arbitrária (`text-[#...]`) é permitida. (`apps/web/CLAUDE.md`)
- **Cor por domínio:** consultas e exames = **lilás** (`tone="lilac"`); remédios = **coral** (`tone="coral"`). Sem cinza sobre tint. Sem vermelho (erro usa coral). (`DESIGN.md`)
- **Telas em PT, código em EN.** Tela só renderiza; lógica nos hooks (`apps/web/CLAUDE.md`).
- **Testes:** rodar de `apps/web` com `bun test`. `bun check-types` roda da raiz.
- **Datas de consulta/exame são instantes** (ISO), não coluna `day` — sem lógica de fuso BR aqui.

---

## File Structure

**Criar:**
- `apps/web/src/app/(app)/saude/hooks/format.ts` — helpers puros de formatação/ordenação
- `apps/web/src/app/(app)/saude/hooks/format.test.ts` — testes dos helpers
- `apps/web/src/app/(app)/saude/hooks/useConsultas.ts`
- `apps/web/src/app/(app)/saude/hooks/useExames.ts`
- `apps/web/src/app/(app)/saude/hooks/useAgendaRemedios.ts`
- `apps/web/src/app/(app)/saude/components/AppointmentModal.tsx`
- `apps/web/src/app/(app)/saude/components/ExamModal.tsx`
- `apps/web/src/app/(app)/saude/components/RetornoSheet.tsx`
- `apps/web/src/app/(app)/saude/components/HistorySheet.tsx`
- `apps/web/src/app/(app)/saude/components/ProximaConsultaCard.tsx`
- `apps/web/src/app/(app)/saude/components/ConsultasSection.tsx`
- `apps/web/src/app/(app)/saude/components/ExamesSection.tsx`
- `apps/web/src/app/(app)/saude/components/AgendaRemediosSection.tsx`

**Mover:** `apps/web/src/app/(app)/corpo/components/MedicationModal.tsx` → `apps/web/src/app/(app)/saude/components/MedicationModal.tsx` (+ estender p/ editar).

**Modificar:**
- `apps/web/src/lib/api-types.ts` — DTOs `Appointment`/`Exam` + status/labels + input types
- `apps/web/src/app/(app)/saude/page.tsx` — trocar skeleton pela tela
- `apps/web/src/app/(app)/corpo/page.tsx` — remover uso do MedicationModal
- `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts` — remover `addMedication`
- `apps/web/src/app/(app)/corpo/components/RemediosSection.tsx` — remover "+ Cadastrar"

---

## Task 1: DTOs de Saúde em `api-types.ts`

**Files:**
- Modify: `apps/web/src/lib/api-types.ts` (append ao fim)

**Interfaces:**
- Produces: `Appointment`, `AppointmentStatus`, `AppointmentInput`, `Exam`, `ExamStatus`, `EXAM_STATUS_LABELS`, `ExamInput`, `MedicationInput`.

- [ ] **Step 1: Adicionar os tipos ao fim de `api-types.ts`**

```ts
// ── Saúde ─────────────────────────────────────────────────────────────────

export type AppointmentStatus = "scheduled" | "completed" | "to_schedule";

/** Consulta (instante, não coluna `day`). Datas ISO string. */
export type Appointment = {
  id: string;
  professional: string;
  specialty: string | null;
  status: AppointmentStatus;
  scheduledAt: string | null;
  suggestedAt: string | null; // retorno sugerido
  completedAt: string | null;
  location: string | null;
  remindDayBefore: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentInput = {
  professional: string;
  specialty?: string;
  scheduledAt: string; // ISO
  location?: string;
  remindDayBefore?: boolean;
};

export type ExamStatus = "to_schedule" | "scheduled" | "result_available" | "completed";

/** Rótulos PT-BR dos status de exame. */
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

export type ExamInput = {
  name: string;
  status?: ExamStatus;
  scheduledAt?: string; // ISO
};

/** Cadastro de remédio (input dos modais/hook de agenda). */
export type MedicationInput = {
  name: string;
  dose?: string;
  stock?: number;
  times: string[];
};
```

- [ ] **Step 2: Verificar tipos**

Run (da raiz): `bun check-types`
Expected: PASS (sem erros; tipos novos ainda sem consumidor).

- [ ] **Step 3: Checkpoint**

Reportar DONE. **Não commitar** (a usuária commita).

---

## Task 2: Helpers puros `format.ts` (TDD)

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/format.ts`
- Test: `apps/web/src/app/(app)/saude/hooks/format.test.ts`

**Interfaces:**
- Consumes: `Appointment`, `Exam`, `ExamStatus` de `@/lib/api-types`.
- Produces: `relativeDays(iso, now?)`, `monthShort(iso)`, `weekdayDay(iso)`, `hourLabel(iso)`, `dayMonth(iso)`, `frequencyLabel(times)`, `examStatusTone(status)`, `sortByWhen(items)`, `byCompletedDesc(items)`.

- [ ] **Step 1: Escrever o teste que falha**

`apps/web/src/app/(app)/saude/hooks/format.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import {
  byCompletedDesc,
  dayMonth,
  examStatusTone,
  frequencyLabel,
  hourLabel,
  monthShort,
  relativeDays,
  sortByWhen,
  weekdayDay,
} from "./format";

const NOW = new Date("2026-07-16T12:00:00");

describe("relativeDays", () => {
  test("hoje", () => {
    expect(relativeDays("2026-07-16T20:00:00", NOW)).toBe("hoje");
  });
  test("passado vira hoje (não negativo)", () => {
    expect(relativeDays("2026-07-10T20:00:00", NOW)).toBe("hoje");
  });
  test("amanhã", () => {
    expect(relativeDays("2026-07-17T09:00:00", NOW)).toBe("amanhã");
  });
  test("em N dias", () => {
    expect(relativeDays("2026-07-19T09:00:00", NOW)).toBe("em 3 dias");
  });
  test("em N semanas a partir de 14 dias", () => {
    expect(relativeDays("2026-08-06T09:00:00", NOW)).toBe("em 3 semanas");
  });
});

test("monthShort", () => {
  expect(monthShort("2026-07-16T00:00:00")).toBe("jul");
  expect(monthShort("2026-01-02T00:00:00")).toBe("jan");
});

test("weekdayDay", () => {
  // 2026-07-16 é quinta
  expect(weekdayDay("2026-07-16T00:00:00")).toBe("qui, 16");
});

test("hourLabel", () => {
  expect(hourLabel("2026-07-16T14:00:00")).toBe("14h");
  expect(hourLabel("2026-07-16T14:30:00")).toBe("14h30");
});

test("dayMonth", () => {
  expect(dayMonth("2026-07-05T00:00:00")).toBe("05/07");
});

test("frequencyLabel", () => {
  expect(frequencyLabel(["09:00"])).toBe("1x ao dia · 09:00");
  expect(frequencyLabel(["08:00", "20:00"])).toBe("2x ao dia · 08:00, 20:00");
});

test("examStatusTone", () => {
  expect(examStatusTone("to_schedule")).toBe("text-coral");
  expect(examStatusTone("scheduled")).toBe("text-lilac-deep");
  expect(examStatusTone("result_available")).toBe("text-green-deep");
  expect(examStatusTone("completed")).toBe("text-ink-read");
});

test("sortByWhen: to_schedule (null scheduledAt) vai pro fim, usa suggestedAt", () => {
  const items = [
    { id: "a", scheduledAt: null, suggestedAt: "2026-08-01T00:00:00" },
    { id: "b", scheduledAt: "2026-07-20T00:00:00", suggestedAt: null },
    { id: "c", scheduledAt: "2026-07-18T00:00:00", suggestedAt: null },
  ];
  expect(sortByWhen(items).map((x) => x.id)).toEqual(["c", "b", "a"]);
});

test("byCompletedDesc: mais recente primeiro", () => {
  const items = [
    { id: "a", completedAt: "2026-07-01T00:00:00" },
    { id: "b", completedAt: "2026-07-10T00:00:00" },
    { id: "c", completedAt: null },
  ];
  expect(byCompletedDesc(items).map((x) => x.id)).toEqual(["b", "a", "c"]);
});
```

- [ ] **Step 2: Rodar o teste (deve falhar)**

Run (de `apps/web`): `bun test src/app/\(app\)/saude/hooks/format.test.ts`
Expected: FAIL ("Cannot find module './format'" ou export ausente).

- [ ] **Step 3: Implementar `format.ts`**

`apps/web/src/app/(app)/saude/hooks/format.ts`:

```ts
import type { ExamStatus } from "@/lib/api-types";

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const WEEKDAYS_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "hoje" | "amanhã" | "em N dias" | "em N semanas" (nunca no passado → "hoje"). */
export function relativeDays(iso: string, now: Date = new Date()): string {
  const diff = Math.round(
    (startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (diff <= 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff < 14) return `em ${diff} dias`;
  return `em ${Math.round(diff / 7)} semanas`;
}

/** "jul" */
export function monthShort(iso: string): string {
  return MONTHS_PT[new Date(iso).getMonth()];
}

/** "qui, 16" */
export function weekdayDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS_PT[d.getDay()]}, ${d.getDate()}`;
}

/** "14h" ou "14h30" */
export function hourLabel(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "05/07" (histórico) */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2x ao dia · 08:00, 20:00" */
export function frequencyLabel(times: string[]): string {
  return `${times.length}x ao dia · ${times.join(", ")}`;
}

/** Classe de cor do texto de status do exame (Regra do Sem-Vermelho). */
export function examStatusTone(status: ExamStatus): string {
  switch (status) {
    case "to_schedule":
      return "text-coral";
    case "scheduled":
      return "text-lilac-deep";
    case "result_available":
      return "text-green-deep";
    case "completed":
      return "text-ink-read";
  }
}

type Datable = { scheduledAt: string | null; suggestedAt: string | null };

function whenMs(x: Datable): number {
  const iso = x.scheduledAt ?? x.suggestedAt;
  return iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;
}

/** Ordena ativos asc por scheduledAt ?? suggestedAt (null vai pro fim). */
export function sortByWhen<T extends Datable>(items: T[]): T[] {
  return [...items].sort((a, b) => whenMs(a) - whenMs(b));
}

/** Ordena concluídos desc por completedAt (null por último). */
export function byCompletedDesc<T extends { completedAt: string | null }>(items: T[]): T[] {
  const ms = (x: { completedAt: string | null }) =>
    x.completedAt ? new Date(x.completedAt).getTime() : 0;
  return [...items].sort((a, b) => ms(b) - ms(a));
}
```

- [ ] **Step 4: Rodar o teste (deve passar)**

Run (de `apps/web`): `bun test src/app/\(app\)/saude/hooks/format.test.ts`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Checkpoint**

`bun check-types` (raiz) → PASS. Reportar DONE. **Não commitar.**

---

## Task 3: Refactor Corpo — remédios só leitura + marcar

Depois desta task, Corpo não cria/edita/apaga remédio; só lista e marca tomado. Deixa `MedicationModal.tsx` órfão em `corpo/components/` (movido na Task 4).

**Files:**
- Modify: `apps/web/src/app/(app)/corpo/hooks/useRemedios.ts` (remover `addMedication`)
- Modify: `apps/web/src/app/(app)/corpo/components/RemediosSection.tsx` (remover "+ Cadastrar")
- Modify: `apps/web/src/app/(app)/corpo/page.tsx` (remover MedicationModal + estado)

**Interfaces:**
- Produces: `useRemedios()` sem `addMedication`; `RemediosSection` sem prop `onOpenModal`.

- [ ] **Step 1: `useRemedios.ts` — remover `addMedication`**

Substituir o conteúdo por (sem `addMedication` e sem `Medication` no import):

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { IntakeSlot } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useRemedios() {
  const { data, loading, reload, setData } = useResource<{
    intakes: IntakeSlot[];
  }>(useCallback(() => api.get<{ intakes: IntakeSlot[] }>("/api/intakes"), []));

  const intakes = data?.intakes ?? [];

  const toggle = useCallback(
    async (slot: IntakeSlot) => {
      const prev = data;
      const next = intakes.map((s) =>
        s.medicationId === slot.medicationId && s.time === slot.time
          ? { ...s, taken: !s.taken }
          : s,
      );
      setData({ intakes: next });
      try {
        if (slot.taken) {
          await api.del(
            `/api/intakes?medicationId=${encodeURIComponent(slot.medicationId)}&time=${encodeURIComponent(slot.time)}`,
          );
        } else {
          await api.post("/api/intakes", {
            medicationId: slot.medicationId,
            time: slot.time,
          });
        }
        reload();
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível atualizar o remédio");
      }
    },
    [data, intakes, setData, reload],
  );

  const taken = intakes.filter((s) => s.taken).length;

  return { intakes, taken, total: intakes.length, loading, toggle, reload };
}
```

(Removeu-se a guarda `tmp-` do `toggle`, que só existia por causa do cadastro otimista agora ausente.)

- [ ] **Step 2: `RemediosSection.tsx` — remover botão "+ Cadastrar"**

Substituir o conteúdo por (sem `PlusIcon`, sem prop `onOpenModal`):

```tsx
"use client";

import { CheckCircleIcon, CircleIcon, PillIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { IntakeSlot } from "@/lib/api-types";

export function RemediosSection({
  intakes,
  onToggle,
}: {
  intakes: IntakeSlot[];
  onToggle: (slot: IntakeSlot) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Remédios de hoje</h2>

      {intakes.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum remédio para hoje.
        </p>
      ) : (
        intakes.map((s) => (
          <button
            key={`${s.medicationId}|${s.time}`}
            type="button"
            onClick={() => onToggle(s)}
            className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
          >
            <IconChip tone="coral" icon={<PillIcon size={22} weight="fill" />} />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-bold text-ink">{s.name}</span>
              <span className="text-xs font-semibold text-ink-read">
                {s.time}
                {s.dose ? ` · ${s.dose}` : ""}
              </span>
            </div>
            {s.taken ? (
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            ) : (
              <CircleIcon size={24} className="text-control-off" />
            )}
          </button>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 3: `corpo/page.tsx` — remover MedicationModal + estado `medOpen`**

Fazer 3 edições:
1. Remover a linha `import { MedicationModal } from "./components/MedicationModal";` (linha ~10).
2. Remover a linha `const [medOpen, setMedOpen] = useState(false);` (linha ~30).
3. Trocar a linha do `RemediosSection` (linha ~63) e remover o `<MedicationModal ... />` (linha ~76):

De:
```tsx
      <RemediosSection intakes={rem.intakes} onToggle={rem.toggle} onOpenModal={() => setMedOpen(true)} />
```
Para:
```tsx
      <RemediosSection intakes={rem.intakes} onToggle={rem.toggle} />
```

E apagar o bloco:
```tsx
      <MedicationModal open={medOpen} onOpenChange={setMedOpen} onSubmit={rem.addMedication} />
```

- [ ] **Step 4: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS. (Se acusar `MedicationModal` não usado, confirme que os 3 pontos foram removidos.)

- [ ] **Step 5: Verificação visual rápida**

Subir o dev (`/dev-up 3001`) e abrir `/corpo`: seção "Remédios de hoje" lista e marca/desmarca; **não** há botão "+ Cadastrar" nem modal. (Se não houver remédios cadastrados, aparece o card tracejado "Nenhum remédio para hoje." — esperado.)

- [ ] **Step 6: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 4: Mover + estender `MedicationModal` para Saúde (criar/editar)

**Files:**
- Move: `apps/web/src/app/(app)/corpo/components/MedicationModal.tsx` → `apps/web/src/app/(app)/saude/components/MedicationModal.tsx`
- Modify (o arquivo movido): suportar edição via prop `initial`.

**Interfaces:**
- Consumes: `MedicationInput`, `Medication` de `@/lib/api-types`.
- Produces: `<MedicationModal open onOpenChange initial? onSubmit />` onde `onSubmit: (input: MedicationInput) => void` e `initial?: Medication`.

- [ ] **Step 1: Mover o arquivo (preserva histórico)**

Run (raiz): `git mv "apps/web/src/app/(app)/corpo/components/MedicationModal.tsx" "apps/web/src/app/(app)/saude/components/MedicationModal.tsx"`

- [ ] **Step 2: Reescrever o arquivo movido para suportar edição**

`apps/web/src/app/(app)/saude/components/MedicationModal.tsx`:

```tsx
"use client";

import { PillIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import type { Medication, MedicationInput } from "@/lib/api-types";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao remédio"),
  dose: z.string(),
  stock: z.string(),
});

const FREQ_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
};

export function MedicationModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Medication;
  onSubmit: (input: MedicationInput) => void;
}) {
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [newTime, setNewTime] = useState("12:00");

  const form = useForm({
    defaultValues: { name: "", dose: "", stock: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        dose: value.dose?.trim() || undefined,
        stock: value.stock ? Number(value.stock) : undefined,
        times,
      });
      onOpenChange(false);
    },
  });

  // Prefill ao abrir: valores do `initial` (editar) ou vazios (criar).
  useEffect(() => {
    if (!open) return;
    form.reset({
      name: initial?.name ?? "",
      dose: initial?.dose ?? "",
      stock: initial?.stock != null ? String(initial.stock) : "",
    });
    setTimes(initial?.times?.length ? initial.times : ["09:00"]);
  }, [open, initial, form]);

  const addTime = () => setTimes((prev) => [...new Set([...prev, newTime])].sort());
  const removeTime = (t: string) => setTimes((prev) => prev.filter((x) => x !== t));

  const isEdit = Boolean(initial);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar remédio" : "Cadastrar remédio"}
      tone="coral"
      icon={<PillIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit || times.length === 0}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Cadastrar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Nome do remédio"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do remédio"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex gap-2">
        <form.Field name="dose">
          {(field) => (
            <input
              value={field.state.value}
              aria-label="Dose"
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Dose (ex.: 1 comp.)"
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
        <form.Field name="stock">
          {(field) => (
            <input
              value={field.state.value}
              aria-label="Estoque"
              inputMode="numeric"
              onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
              placeholder="Estoque"
              className="w-28 rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Frequência</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <ChoiceChip
              key={n}
              tone="coral"
              selected={times.length === n}
              onClick={() => setTimes(FREQ_TIMES[n])}
            >
              {n}x ao dia
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Horários</span>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-coral-tint px-3 py-2 text-sm font-semibold text-coral"
            >
              {t}
              <button type="button" aria-label={`Remover ${t}`} onClick={() => removeTime(t)}>
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
          <input
            type="time"
            aria-label="Novo horário"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-control border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink focus:border-lilac focus:outline-none"
          />
          <button
            type="button"
            aria-label="Adicionar horário"
            onClick={addTime}
            className="grid size-9 place-items-center rounded-full bg-coral-tint text-coral"
          >
            <PlusIcon size={16} weight="bold" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS (nada importa o modal ainda; usado na Task 8).

- [ ] **Step 4: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 5: Hook `useConsultas`

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/useConsultas.ts`

**Interfaces:**
- Consumes: `Appointment`, `AppointmentInput` de `@/lib/api-types`; `sortByWhen`, `byCompletedDesc` de `./format`.
- Produces: `useConsultas()` → `{ ativas: Appointment[]; historico: Appointment[]; proxima: Appointment | null; loading: boolean; create(input): Promise<void>; update(id, input): Promise<void>; remove(id): void; complete(id, opts): Promise<void> }` onde `opts = { needsReturn: boolean; followUpMonths?: number }`.

- [ ] **Step 1: Implementar o hook**

`apps/web/src/app/(app)/saude/hooks/useConsultas.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Appointment, AppointmentInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { byCompletedDesc, sortByWhen } from "./format";

type ListResponse = { appointments: Appointment[] };
type NextResponse = { appointment: Appointment | null };

export function useConsultas() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/appointments"), []),
  );
  const next = useResource<NextResponse>(
    useCallback(() => api.get<NextResponse>("/api/appointments/next"), []),
  );

  const all = list.data?.appointments ?? [];
  const ativas = sortByWhen(all.filter((a) => a.status !== "completed"));
  const historico = byCompletedDesc(all.filter((a) => a.status === "completed"));

  const create = useCallback(
    async (input: AppointmentInput) => {
      try {
        await api.post("/api/appointments", input);
        list.reload();
        next.reload();
      } catch (e) {
        toastError(e, "Não foi possível agendar a consulta");
      }
    },
    [list, next],
  );

  const update = useCallback(
    async (id: string, input: AppointmentInput) => {
      const prev = list.data;
      // Otimista: reflete os campos editados; reload confirma (status pode mudar no back).
      if (list.data) {
        list.setData({
          appointments: all.map((a) => (a.id === id ? { ...a, ...input } : a)),
        });
      }
      try {
        await api.put(`/api/appointments/${id}`, input);
        list.reload();
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar a consulta");
      }
    },
    [list, next, all],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ appointments: all.filter((a) => a.id !== id) });
      try {
        await api.del(`/api/appointments/${id}`);
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir a consulta");
      }
    },
    [list, next, all],
  );

  const complete = useCallback(
    async (id: string, opts: { needsReturn: boolean; followUpMonths?: number }) => {
      const prev = list.data;
      // Otimista: sai da lista ativa na hora (o retorno chega no reload).
      list.setData({
        appointments: all.map((a) =>
          a.id === id ? { ...a, status: "completed" as const } : a,
        ),
      });
      try {
        await api.post(`/api/appointments/${id}/complete`, opts);
        list.reload();
        next.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível concluir a consulta");
      }
    },
    [list, next, all],
  );

  return {
    ativas,
    historico,
    proxima: next.data?.appointment ?? null,
    loading: list.loading,
    create,
    update,
    remove,
    complete,
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 6: Hook `useExames`

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/useExames.ts`

**Interfaces:**
- Consumes: `Exam`, `ExamInput` de `@/lib/api-types`; `sortByWhen`, `byCompletedDesc` de `./format`.
- Produces: `useExames()` → `{ ativos: Exam[]; historico: Exam[]; loading: boolean; create(input): Promise<void>; update(id, input): Promise<void>; remove(id): void; complete(id, opts): Promise<void> }`.

- [ ] **Step 1: Implementar o hook**

`apps/web/src/app/(app)/saude/hooks/useExames.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Exam, ExamInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { byCompletedDesc, sortByWhen } from "./format";

type ListResponse = { exams: Exam[] };

export function useExames() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/exams"), []),
  );

  const all = list.data?.exams ?? [];
  const ativos = sortByWhen(all.filter((e) => e.status !== "completed"));
  const historico = byCompletedDesc(all.filter((e) => e.status === "completed"));

  const create = useCallback(
    async (input: ExamInput) => {
      try {
        await api.post("/api/exams", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível adicionar o exame");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: ExamInput) => {
      const prev = list.data;
      if (list.data) {
        list.setData({ exams: all.map((e) => (e.id === id ? { ...e, ...input } : e)) });
      }
      try {
        await api.put(`/api/exams/${id}`, input);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar o exame");
      }
    },
    [list, all],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ exams: all.filter((e) => e.id !== id) });
      try {
        await api.del(`/api/exams/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o exame");
      }
    },
    [list, all],
  );

  const complete = useCallback(
    async (id: string, opts: { needsReturn: boolean; followUpMonths?: number }) => {
      const prev = list.data;
      list.setData({
        exams: all.map((e) => (e.id === id ? { ...e, status: "completed" as const } : e)),
      });
      try {
        await api.post(`/api/exams/${id}/complete`, opts);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível concluir o exame");
      }
    },
    [list, all],
  );

  return {
    ativos,
    historico,
    loading: list.loading,
    create,
    update,
    remove,
    complete,
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 7: Hook `useAgendaRemedios`

**Files:**
- Create: `apps/web/src/app/(app)/saude/hooks/useAgendaRemedios.ts`

**Interfaces:**
- Consumes: `Medication`, `MedicationInput` de `@/lib/api-types`.
- Produces: `useAgendaRemedios()` → `{ medications: Medication[]; loading: boolean; create(input): Promise<void>; update(id, input): Promise<void>; remove(id): void }`.

- [ ] **Step 1: Implementar o hook**

`apps/web/src/app/(app)/saude/hooks/useAgendaRemedios.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Medication, MedicationInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

type ListResponse = { medications: Medication[] };

export function useAgendaRemedios() {
  const list = useResource<ListResponse>(
    useCallback(() => api.get<ListResponse>("/api/medications"), []),
  );

  const medications = list.data?.medications ?? [];

  const create = useCallback(
    async (input: MedicationInput) => {
      try {
        await api.post("/api/medications", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível cadastrar o remédio");
      }
    },
    [list],
  );

  const update = useCallback(
    async (id: string, input: MedicationInput) => {
      const prev = list.data;
      if (list.data) {
        list.setData({
          medications: medications.map((m) => (m.id === id ? { ...m, ...input } : m)),
        });
      }
      try {
        await api.put(`/api/medications/${id}`, input);
        list.reload();
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível editar o remédio");
      }
    },
    [list, medications],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ medications: medications.filter((m) => m.id !== id) });
      try {
        await api.del(`/api/medications/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o remédio");
      }
    },
    [list, medications],
  );

  return { medications, loading: list.loading, create, update, remove };
}
```

- [ ] **Step 2: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 3: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 8: Sheets compartilhados — `RetornoSheet` + `HistorySheet`

**Files:**
- Create: `apps/web/src/app/(app)/saude/components/RetornoSheet.tsx`
- Create: `apps/web/src/app/(app)/saude/components/HistorySheet.tsx`

**Interfaces:**
- Produces:
  - `<RetornoSheet open onOpenChange title onConfirm />` onde `onConfirm: (opts: { needsReturn: boolean; followUpMonths?: number }) => void`.
  - `<HistorySheet open onOpenChange title items />` onde `items: { id: string; title: string; completedAt: string | null }[]`.

- [ ] **Step 1: `RetornoSheet.tsx`**

```tsx
"use client";

import { CalendarHeartIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";

const MONTH_OPTIONS = [1, 3, 6, 12];

export function RetornoSheet({
  open,
  onOpenChange,
  title,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: (opts: { needsReturn: boolean; followUpMonths?: number }) => void;
}) {
  const [months, setMonths] = useState<number>(1);

  useEffect(() => {
    if (open) setMonths(1);
  }, [open]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      tone="lilac"
      icon={<CalendarHeartIcon size={22} weight="fill" />}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onConfirm({ needsReturn: true, followUpMonths: months });
              onOpenChange(false);
            }}
            className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
          >
            Agendar retorno
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm({ needsReturn: false });
              onOpenChange(false);
            }}
            className="w-full rounded-full bg-lilac-tint py-3.5 font-display font-bold text-lilac-deep"
          >
            Não precisa
          </button>
        </div>
      }
    >
      <p className="text-sm font-semibold text-ink-read">
        Quer agendar um retorno? Criamos um lembrete de "a agendar".
      </p>
      <div className="flex flex-wrap gap-2">
        {MONTH_OPTIONS.map((n) => (
          <ChoiceChip key={n} selected={months === n} onClick={() => setMonths(n)}>
            {n === 1 ? "1 mês" : `${n} meses`}
          </ChoiceChip>
        ))}
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: `HistorySheet.tsx`**

```tsx
"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";

import { dayMonth } from "../hooks/format";

export type HistoryItem = { id: string; title: string; completedAt: string | null };

export function HistorySheet({
  open,
  onOpenChange,
  title,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: HistoryItem[];
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      tone="lilac"
      icon={<ClockCounterClockwiseIcon size={22} weight="fill" />}
    >
      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nada por aqui ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm"
            >
              <span className="text-sm font-bold text-ink">{it.title}</span>
              <span className="text-xs font-semibold text-ink-read">
                {it.completedAt ? `concluído em ${dayMonth(it.completedAt)}` : "concluído"}
              </span>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 4: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 9: Modais de domínio — `AppointmentModal` + `ExamModal`

**Files:**
- Create: `apps/web/src/app/(app)/saude/components/AppointmentModal.tsx`
- Create: `apps/web/src/app/(app)/saude/components/ExamModal.tsx`

**Interfaces:**
- Consumes: `Appointment`, `AppointmentInput`, `Exam`, `ExamInput`, `ExamStatus`, `EXAM_STATUS_LABELS`.
- Produces:
  - `<AppointmentModal open onOpenChange initial? onSubmit />`, `onSubmit: (input: AppointmentInput) => void`, `initial?: Appointment`.
  - `<ExamModal open onOpenChange initial? onSubmit />`, `onSubmit: (input: ExamInput) => void`, `initial?: Exam`.

- [ ] **Step 1: `AppointmentModal.tsx`**

Nota: `<input type="datetime-local">` dá "YYYY-MM-DDTHH:mm" (hora local); convertemos p/ ISO com `new Date(value).toISOString()`. Para prefill, o inverso: cortar o ISO em hora local.

```tsx
"use client";

import { StethoscopeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { Appointment, AppointmentInput } from "@/lib/api-types";

const schema = z.object({
  professional: z.string().trim().min(1, "Quem é o profissional?"),
  specialty: z.string(),
  scheduledAt: z.string().min(1, "Escolha data e hora"),
  location: z.string(),
  remindDayBefore: z.boolean(),
});

/** ISO → valor de datetime-local (hora local, sem timezone). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Appointment;
  onSubmit: (input: AppointmentInput) => void;
}) {
  const form = useForm({
    defaultValues: {
      professional: "",
      specialty: "",
      scheduledAt: "",
      location: "",
      remindDayBefore: false,
    },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        professional: value.professional.trim(),
        specialty: value.specialty.trim() || undefined,
        scheduledAt: new Date(value.scheduledAt).toISOString(),
        location: value.location.trim() || undefined,
        remindDayBefore: value.remindDayBefore,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      professional: initial?.professional ?? "",
      specialty: initial?.specialty ?? "",
      scheduledAt: isoToLocalInput(initial?.scheduledAt ?? initial?.suggestedAt ?? null),
      location: initial?.location ?? "",
      remindDayBefore: initial?.remindDayBefore ?? false,
    });
  }, [open, initial, form]);

  const isEdit = Boolean(initial);
  const inputCls =
    "rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar consulta" : "Agendar consulta"}
      tone="lilac"
      icon={<StethoscopeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Agendar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="professional">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Profissional"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Profissional (ex.: Dra. Marina)"
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="specialty">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Especialidade"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Especialidade (ex.: Nutricionista)"
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="scheduledAt">
        {(field) => (
          <input
            type="datetime-local"
            value={field.state.value}
            aria-label="Data e hora"
            onChange={(e) => field.handleChange(e.target.value)}
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="location">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Local"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Local (opcional)"
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="remindDayBefore">
        {(field) => (
          <div className="flex items-center justify-between rounded-control bg-lilac-tint-soft px-4 py-3">
            <span className="text-sm font-bold text-ink">Lembrar 1 dia antes</span>
            <ToggleSwitch
              checked={field.state.value}
              onCheckedChange={(v) => field.handleChange(v)}
              label="Lembrar 1 dia antes"
            />
          </div>
        )}
      </form.Field>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: `ExamModal.tsx`**

```tsx
"use client";

import { TestTubeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import {
  EXAM_STATUS_LABELS,
  type Exam,
  type ExamInput,
  type ExamStatus,
} from "@/lib/api-types";

const schema = z.object({ name: z.string().trim().min(1, "Dê um nome ao exame") });

/** Status escolhíveis no modal (completed só via check no card). */
const STATUS_OPTIONS: ExamStatus[] = ["to_schedule", "scheduled", "result_available"];

export function ExamModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Exam;
  onSubmit: (input: ExamInput) => void;
}) {
  const [status, setStatus] = useState<ExamStatus>("to_schedule");

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({ name: value.name.trim(), status });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ name: initial?.name ?? "" });
    setStatus(
      initial && initial.status !== "completed" ? initial.status : "to_schedule",
    );
  }, [open, initial, form]);

  const isEdit = Boolean(initial);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar exame" : "Adicionar exame"}
      tone="lilac"
      icon={<TestTubeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Adicionar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Nome do exame"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do exame (ex.: Hemograma)"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <ChoiceChip key={s} selected={status === s} onClick={() => setStatus(s)}>
              {EXAM_STATUS_LABELS[s]}
            </ChoiceChip>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 4: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 10: Componentes de seção + card-resumo

**Files:**
- Create: `apps/web/src/app/(app)/saude/components/ProximaConsultaCard.tsx`
- Create: `apps/web/src/app/(app)/saude/components/ConsultasSection.tsx`
- Create: `apps/web/src/app/(app)/saude/components/ExamesSection.tsx`
- Create: `apps/web/src/app/(app)/saude/components/AgendaRemediosSection.tsx`

**Interfaces:**
- Consumes: `Appointment`, `Exam`, `Medication`, `EXAM_STATUS_LABELS`; `IconChip`, `SwipeableRow`; helpers de `../hooks/format`.
- Produces (props consumidas pela page na Task 11):
  - `<ProximaConsultaCard proxima={Appointment | null} />`
  - `<ConsultasSection ativas onAdd onEdit onDelete onComplete onHistory />`
  - `<ExamesSection ativos onAdd onEdit onDelete onComplete onHistory />`
  - `<AgendaRemediosSection medications onAdd onEdit onDelete />`

- [ ] **Step 1: `ProximaConsultaCard.tsx`**

```tsx
"use client";

import { CalendarHeartIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { Appointment } from "@/lib/api-types";

import { hourLabel, monthShort, relativeDays, weekdayDay } from "../hooks/format";

export function ProximaConsultaCard({ proxima }: { proxima: Appointment | null }) {
  const title = (() => {
    if (!proxima) return "Nenhuma consulta marcada";
    if (proxima.status === "to_schedule") return "Retorno a agendar";
    return `Próxima consulta ${relativeDays(proxima.scheduledAt ?? "")}`;
  })();

  const subtitle = (() => {
    if (!proxima) return "Agende quando precisar 💜";
    const who = proxima.professional;
    if (proxima.status === "to_schedule") {
      const when = proxima.suggestedAt ? ` · sugerido em ${monthShort(proxima.suggestedAt)}` : "";
      return `${who}${when}`;
    }
    const at = proxima.scheduledAt;
    return at ? `${who} · ${weekdayDay(at)} às ${hourLabel(at)}` : who;
  })();

  return (
    <div className="mb-2 flex items-center gap-3 rounded-card bg-lilac-tint p-4">
      <IconChip
        tone="lilac"
        variant="white"
        icon={<CalendarHeartIcon size={22} weight="fill" />}
        className="size-11.5"
      />
      <div className="flex flex-col">
        <span className="font-display text-base font-bold text-ink">{title}</span>
        <span className="text-xs font-semibold text-ink-read">{subtitle}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `ConsultasSection.tsx`**

```tsx
"use client";

import { CircleIcon, PlusIcon, StethoscopeIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { Appointment } from "@/lib/api-types";

import { hourLabel, weekdayDay } from "../hooks/format";

export function ConsultasSection({
  ativas,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onHistory,
}: {
  ativas: Appointment[];
  onAdd: () => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
  onComplete: (a: Appointment) => void;
  onHistory: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Consultas</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onHistory} className="text-sm font-bold text-lilac-deep">
            Ver histórico
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-sm font-bold text-lilac-deep"
          >
            <PlusIcon size={16} weight="bold" /> Agendar
          </button>
        </div>
      </div>

      {ativas.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhuma consulta agendada.
        </p>
      ) : (
        ativas.map((a) => (
          <SwipeableRow key={a.id} onEdit={() => onEdit(a)} onDelete={() => onDelete(a.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="lilac" icon={<StethoscopeIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{a.professional}</span>
                {a.specialty ? (
                  <span className="text-xs font-semibold text-ink-read">{a.specialty}</span>
                ) : null}
              </div>
              {a.status === "scheduled" && a.scheduledAt ? (
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-lilac-deep">{weekdayDay(a.scheduledAt)}</span>
                  <span className="text-xs font-semibold text-ink-read">{hourLabel(a.scheduledAt)}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-coral">a agendar</span>
              )}
              <button
                type="button"
                aria-label={`Concluir consulta ${a.professional}`}
                onClick={() => onComplete(a)}
              >
                <CircleIcon size={24} className="text-control-off" />
              </button>
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 3: `ExamesSection.tsx`**

```tsx
"use client";

import { CircleIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import { EXAM_STATUS_LABELS, type Exam } from "@/lib/api-types";

import { examStatusTone } from "../hooks/format";

export function ExamesSection({
  ativos,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  onHistory,
}: {
  ativos: Exam[];
  onAdd: () => void;
  onEdit: (e: Exam) => void;
  onDelete: (id: string) => void;
  onComplete: (e: Exam) => void;
  onHistory: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Exames</h2>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onHistory} className="text-sm font-bold text-lilac-deep">
            Ver histórico
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-sm font-bold text-lilac-deep"
          >
            <PlusIcon size={16} weight="bold" /> Adicionar
          </button>
        </div>
      </div>

      {ativos.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum exame por aqui.
        </p>
      ) : (
        ativos.map((e) => (
          <SwipeableRow key={e.id} onEdit={() => onEdit(e)} onDelete={() => onDelete(e.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="lilac" icon={<TestTubeIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{e.name}</span>
                <span className={`text-xs font-semibold ${examStatusTone(e.status)}`}>
                  {EXAM_STATUS_LABELS[e.status]}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Concluir exame ${e.name}`}
                onClick={() => onComplete(e)}
              >
                <CircleIcon size={24} className="text-control-off" />
              </button>
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 4: `AgendaRemediosSection.tsx`**

```tsx
"use client";

import { PillIcon, PlusIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import type { Medication } from "@/lib/api-types";

import { frequencyLabel } from "../hooks/format";

export function AgendaRemediosSection({
  medications,
  onAdd,
  onEdit,
  onDelete,
}: {
  medications: Medication[];
  onAdd: () => void;
  onEdit: (m: Medication) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Agenda de remédios</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-sm font-bold text-coral"
        >
          <PlusIcon size={16} weight="bold" /> Cadastrar
        </button>
      </div>

      {medications.length === 0 ? (
        <p className="rounded-card border border-dashed border-hairline p-4 text-center text-sm font-semibold text-ink-read">
          Nenhum remédio cadastrado.
        </p>
      ) : (
        medications.map((m) => (
          <SwipeableRow key={m.id} onEdit={() => onEdit(m)} onDelete={() => onDelete(m.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="coral" icon={<PillIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{m.name}</span>
                <span className="text-xs font-semibold text-ink-read">
                  {frequencyLabel(m.times)}
                  {m.dose ? ` · ${m.dose}` : ""}
                </span>
              </div>
            </div>
          </SwipeableRow>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 5: Verificar tipos**

Run (raiz): `bun check-types`
Expected: PASS.

- [ ] **Step 6: Checkpoint**

Reportar DONE. **Não commitar.**

---

## Task 11: Montar a página + verificação end-to-end

**Files:**
- Modify: `apps/web/src/app/(app)/saude/page.tsx` (trocar skeleton pela tela completa)

**Interfaces:**
- Consumes: todos os hooks (Tasks 5–7), sheets (Task 8), modais (Tasks 4, 9) e seções (Task 10).

- [ ] **Step 1: Reescrever `saude/page.tsx`**

```tsx
"use client";

import { useState } from "react";

import { Screen } from "@/components/screen";
import type { Appointment, Exam, Medication } from "@/lib/api-types";

import { AgendaRemediosSection } from "./components/AgendaRemediosSection";
import { AppointmentModal } from "./components/AppointmentModal";
import { ConsultasSection } from "./components/ConsultasSection";
import { ExamModal } from "./components/ExamModal";
import { ExamesSection } from "./components/ExamesSection";
import { HistorySheet, type HistoryItem } from "./components/HistorySheet";
import { MedicationModal } from "./components/MedicationModal";
import { ProximaConsultaCard } from "./components/ProximaConsultaCard";
import { RetornoSheet } from "./components/RetornoSheet";
import { useAgendaRemedios } from "./hooks/useAgendaRemedios";
import { useConsultas } from "./hooks/useConsultas";
import { useExames } from "./hooks/useExames";

type RetornoTarget = { kind: "consulta" | "exame"; id: string };

export default function SaudePage() {
  const consultas = useConsultas();
  const exames = useExames();
  const agenda = useAgendaRemedios();

  // Modais de consulta / exame / remédio (undefined = criar; objeto = editar).
  const [apptModal, setApptModal] = useState<{ open: boolean; initial?: Appointment }>({ open: false });
  const [examModal, setExamModal] = useState<{ open: boolean; initial?: Exam }>({ open: false });
  const [medModal, setMedModal] = useState<{ open: boolean; initial?: Medication }>({ open: false });

  // Sheet de retorno (após concluir) e sheet de histórico.
  const [retorno, setRetorno] = useState<{ open: boolean; target?: RetornoTarget }>({ open: false });
  const [history, setHistory] = useState<{ open: boolean; title: string; items: HistoryItem[] }>({
    open: false,
    title: "",
    items: [],
  });

  return (
    <Screen title="Saúde" subtitle="Consultas, exames e agenda de remédios">
      <ProximaConsultaCard proxima={consultas.proxima} />

      <ConsultasSection
        ativas={consultas.ativas}
        onAdd={() => setApptModal({ open: true })}
        onEdit={(a) => setApptModal({ open: true, initial: a })}
        onDelete={consultas.remove}
        onComplete={(a) => setRetorno({ open: true, target: { kind: "consulta", id: a.id } })}
        onHistory={() =>
          setHistory({
            open: true,
            title: "Histórico de consultas",
            items: consultas.historico.map((a) => ({
              id: a.id,
              title: a.specialty ? `${a.professional} · ${a.specialty}` : a.professional,
              completedAt: a.completedAt,
            })),
          })
        }
      />

      <ExamesSection
        ativos={exames.ativos}
        onAdd={() => setExamModal({ open: true })}
        onEdit={(e) => setExamModal({ open: true, initial: e })}
        onDelete={exames.remove}
        onComplete={(e) => setRetorno({ open: true, target: { kind: "exame", id: e.id } })}
        onHistory={() =>
          setHistory({
            open: true,
            title: "Histórico de exames",
            items: exames.historico.map((e) => ({
              id: e.id,
              title: e.name,
              completedAt: e.completedAt,
            })),
          })
        }
      />

      <AgendaRemediosSection
        medications={agenda.medications}
        onAdd={() => setMedModal({ open: true })}
        onEdit={(m) => setMedModal({ open: true, initial: m })}
        onDelete={agenda.remove}
      />

      <AppointmentModal
        open={apptModal.open}
        onOpenChange={(open) => setApptModal((s) => ({ ...s, open }))}
        initial={apptModal.initial}
        onSubmit={(input) =>
          apptModal.initial
            ? consultas.update(apptModal.initial.id, input)
            : consultas.create(input)
        }
      />

      <ExamModal
        open={examModal.open}
        onOpenChange={(open) => setExamModal((s) => ({ ...s, open }))}
        initial={examModal.initial}
        onSubmit={(input) =>
          examModal.initial ? exames.update(examModal.initial.id, input) : exames.create(input)
        }
      />

      <MedicationModal
        open={medModal.open}
        onOpenChange={(open) => setMedModal((s) => ({ ...s, open }))}
        initial={medModal.initial}
        onSubmit={(input) =>
          medModal.initial ? agenda.update(medModal.initial.id, input) : agenda.create(input)
        }
      />

      <RetornoSheet
        open={retorno.open}
        onOpenChange={(open) => setRetorno((s) => ({ ...s, open }))}
        title={retorno.target?.kind === "exame" ? "Concluir exame" : "Concluir consulta"}
        onConfirm={(opts) => {
          const t = retorno.target;
          if (!t) return;
          if (t.kind === "consulta") consultas.complete(t.id, opts);
          else exames.complete(t.id, opts);
        }}
      />

      <HistorySheet
        open={history.open}
        onOpenChange={(open) => setHistory((s) => ({ ...s, open }))}
        title={history.title}
        items={history.items}
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Verificar tipos e testes**

Run (raiz): `bun check-types` → PASS
Run (de `apps/web`): `bun test src/app/\(app\)/saude/hooks/format.test.ts` → PASS

- [ ] **Step 3: Verificação visual end-to-end (obrigatória)**

Subir o dev (`/dev-up 3001`) e, em `/saude`, exercitar **cada** fluxo (usar o browser real; conferir que a mudança persiste após recarregar):

Consultas:
- "+ Agendar" → preencher profissional/especialidade/data-hora/local/toggle → **Agendar** → card aparece na lista, e o card-resumo do topo atualiza.
- Swipe → **Editar** → alterar → **Salvar** → reflete.
- Tap no **check** → RetornoSheet → "Agendar retorno" (3 meses) → consulta some da ativa e surge um item "a agendar"; testar também "Não precisa" (só some).
- "Ver histórico" → sheet lista a concluída com "concluído em DD/MM".
- Swipe → **Excluir** → some.

Exames: repetir criar (com status) / editar (mudar status) / concluir (check → retorno) / histórico / excluir. Conferir cor do status (a agendar=coral, agendada=lilás, resultado disponível=verde).

Remédios: "+ Cadastrar" → nome/dose/estoque/frequência/horários → **Cadastrar** → aparece "Nx ao dia · HH:MM". Swipe Editar (prefill correto) / Excluir.

Empty states: numa conta sem dados, cada seção mostra o card tracejado e o resumo mostra "Nenhuma consulta marcada".

Regressão Corpo: em `/corpo`, remédios continuam listando + marcando tomado, **sem** botão de cadastrar.

- [ ] **Step 4: Checkpoint final**

Reportar DONE com o resultado da verificação visual (o que foi exercitado e confirmado). **Não commitar** — a usuária revisa e commita.

---

## Self-Review (preenchido)

**Cobertura do spec:**
- DTOs → Task 1. Helpers → Task 2. Refactor Corpo → Task 3. MedicationModal mover+editar → Task 4. Hooks (3) → Tasks 5–7. RetornoSheet/HistorySheet → Task 8. AppointmentModal/ExamModal → Task 9. Card-resumo + 3 seções → Task 10. Página + verificação → Task 11.
- Concluir com retorno (check → sheet) → Tasks 8/10/11. Histórico (consultas+exames) → Tasks 8/11. Card inclui retorno a agendar (`/next`) → Tasks 5/10. Chips lilás/coral → Task 10. Esconde `completed` + ordena → Tasks 2/5/6. Delete sem confirmação → Tasks 5–7/10. Empty states → Tasks 3/10. Fora de escopo (Lembretes/Metas; toggle só persiste) → respeitado.

**Placeholders:** nenhum — todos os passos com código/comando completos.

**Consistência de tipos:** `AppointmentInput`/`ExamInput`/`MedicationInput` definidos na Task 1 e usados idênticos nos hooks (5–7) e modais (4/9). `complete(id, { needsReturn, followUpMonths })` idêntico em hooks e `RetornoSheet.onConfirm`. `HistoryItem` definido na Task 8 e montado na Task 11. Seções (Task 10) expõem exatamente as props consumidas na Task 11.
