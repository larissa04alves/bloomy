# Front Mente — Implementation Plan

> **Snapshot da fase v1 (histórico).** Este plano descreve a aba Mente original
> (nota única/dia via `PUT /api/checkins`, `records: Checkin[]`). O contrato **atual**
> evoluiu depois: múltiplos relatos/dia (`mind_note`, `POST/GET /api/checkins/notes`)
> e análise da semana (`GET /api/checkins/week`). Fonte da verdade do contrato vigente:
> `docs/superpowers/specs/2026-07-15-front-mente-design.md` (seções "Revisão v2" e "Revisão v3").
> Planos são registros pontuais, não reescritos retroativamente.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba Mente ("Seu espaço") de ponta a ponta contra a API `/api/checkins` existente: check-in de humor + ansiedade (salvo na hora) e mini-diário com histórico ("Seus registros").

**Architecture:** Molde provado de Corpo/Treino — `page.tsx` só renderiza; lógica em `mente/hooks/useMente.ts` (fetch via `useResource`, mutações otimistas via `api` + merge da resposta do PUT); visual em `mente/components/*`. Helpers puros (mapa de humor, data relativa, filtro, merge) isolados e testados via `bun test`. Sem bottom sheet — tudo inline na aba.

**Tech Stack:** Next.js 16 (App Router, client components), React 19, Tailwind 4 (tokens `@theme` em `@bloomy/ui`), Phosphor Icons (`@phosphor-icons/react`, weight `fill`), `bun test`.

## Global Constraints

- **Commits gated (regra do projeto `CLAUDE.md`):** NUNCA commitar sem ordem explícita da Larissa. Os passos "Commit" abaixo trazem a mensagem pronta, mas por padrão **entregar como mudanças não-commitadas** — só rodar o `git commit` sob ordem explícita.
- **Fuso `day` (ADR-0002):** dia é `YYYY-MM-DD` em `America/Sao_Paulo`; o back já computa. No front, comparar strings `day`; nunca recalcular fuso.
- **Tamanho de fonte: só escala nomeada do Tailwind** (`text-xs`/`text-sm`/`text-base`/`text-2xl`...) — nunca arbitrário (`text-[13px]`). Cor arbitrária (`text-[#...]`) é permitida. (`apps/web/CLAUDE.md`)
- **Regra Sem-Vermelho:** pendência/erro neutros; erro de API cai no `toastError` (coral, nunca vermelho).
- **`anxiety = 0` é valor válido** (Tranquilo total): usar `?? ` (nunca `||`) ao ler `anxiety`, senão `0` vira `50`/null.
- **Componentes client:** todo arquivo com hook/handler começa com `"use client";`.
- **Ícones:** Phosphor `weight="fill"`; import nomeado `XIcon` de `@phosphor-icons/react`. `cn` de `@bloomy/ui/lib/utils`.
- **Teste:** `bun test` rodado de `apps/web`. Só helpers puros têm teste unitário (convenção do codebase — hooks/componentes são verificados por `bun check-types` + verificação visual).
- **Aceitação final:** `bun check-types` verde **e** verificação visual real na porta 3001. `check-types` verde ≠ UI funcionando.

---

### Task 1: DTOs + helpers puros de Mente

**Files:**
- Modify: `apps/web/src/lib/api-types.ts` (append)
- Create: `apps/web/src/app/(app)/mente/hooks/mente-helpers.ts`
- Test: `apps/web/src/app/(app)/mente/hooks/mente-helpers.test.ts`

**Interfaces:**
- Produces:
  - `type Mood = "sad" | "meh" | "neutral" | "good" | "great"` e `type Checkin` (em `api-types.ts`).
  - `MOOD_ORDER: readonly Mood[]` (worst→best).
  - `MOOD_RECORD_COLOR: Record<Mood, string>` (hex do ícone na lista de registros).
  - `relativeDay(day: string, today: string): string`.
  - `notesOnly(checkins: Checkin[]): Checkin[]`.
  - `mergeCheckin(list: Checkin[], checkin: Checkin): Checkin[]` (upsert por `day`, mantém ordem desc).

- [ ] **Step 1: Adicionar DTOs em `api-types.ts`**

Append ao fim de `apps/web/src/lib/api-types.ts`:

```ts
// ── Mente ─────────────────────────────────────────────────────────────────

export type Mood = "sad" | "meh" | "neutral" | "good" | "great";

/** Check-in do dia (1 por dia, upsert). Datas ISO string. */
export type Checkin = {
  id: string;
  day: string; // YYYY-MM-DD
  mood: Mood | null;
  anxiety: number | null; // 0–100
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Escrever o teste que falha (`mente-helpers.test.ts`)**

```ts
import { describe, expect, it } from "bun:test";

import type { Checkin } from "@/lib/api-types";

import { MOOD_ORDER, mergeCheckin, notesOnly, relativeDay } from "./mente-helpers";

function mk(day: string, over: Partial<Checkin> = {}): Checkin {
  return {
    id: day,
    day,
    mood: "good",
    anxiety: 30,
    note: "nota",
    createdAt: `${day}T12:00:00.000Z`,
    updatedAt: `${day}T12:00:00.000Z`,
    ...over,
  };
}

describe("MOOD_ORDER", () => {
  it("vai do pior ao melhor humor, 5 valores", () => {
    expect(MOOD_ORDER).toEqual(["sad", "meh", "neutral", "good", "great"]);
  });
});

describe("relativeDay", () => {
  it("hoje → 'Hoje'", () => {
    expect(relativeDay("2026-07-15", "2026-07-15")).toBe("Hoje");
  });
  it("ontem → 'Ontem'", () => {
    expect(relativeDay("2026-07-14", "2026-07-15")).toBe("Ontem");
  });
  it("2–6 dias atrás → dia da semana capitalizado", () => {
    // 2026-07-11 é um sábado
    expect(relativeDay("2026-07-11", "2026-07-15")).toBe("Sábado");
  });
  it("≥7 dias atrás → data curta 'dd mês'", () => {
    expect(relativeDay("2026-07-02", "2026-07-15")).toBe("2 jul");
  });
});

describe("notesOnly", () => {
  it("mantém só entradas com nota não-vazia (trim)", () => {
    const list = [mk("2026-07-15"), mk("2026-07-14", { note: "   " }), mk("2026-07-13", { note: null })];
    expect(notesOnly(list).map((c) => c.day)).toEqual(["2026-07-15"]);
  });
});

describe("mergeCheckin", () => {
  it("substitui a entrada do mesmo dia", () => {
    const list = [mk("2026-07-15", { note: "antiga" })];
    const merged = mergeCheckin(list, mk("2026-07-15", { note: "nova" }));
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe("nova");
  });
  it("insere no topo (desc) quando o dia é novo", () => {
    const list = [mk("2026-07-14")];
    const merged = mergeCheckin(list, mk("2026-07-15"));
    expect(merged.map((c) => c.day)).toEqual(["2026-07-15", "2026-07-14"]);
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun test mente-helpers`
Expected: FAIL — `Cannot find module './mente-helpers'`.

- [ ] **Step 4: Implementar `mente-helpers.ts`**

```ts
import type { Checkin, Mood } from "@/lib/api-types";

/** Humor do pior ao melhor — casa com a posição dos tiles na tela. */
export const MOOD_ORDER: readonly Mood[] = ["sad", "meh", "neutral", "good", "great"];

/** Cor do ícone de humor na lista de registros (valência; do protótipo). */
export const MOOD_RECORD_COLOR: Record<Mood, string> = {
  sad: "#c76e9e",
  meh: "#d6a96b",
  neutral: "#d6a96b",
  good: "#7fc4a0",
  great: "#4e9c74",
};

const WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const SHORT_FMT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

/** Parse "YYYY-MM-DD" como data local (evita shift de UTC). */
function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffInDays(day: string, today: string): number {
  const ms = parseDay(today).getTime() - parseDay(day).getTime();
  return Math.round(ms / 86_400_000);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Hoje" / "Ontem" / dia-da-semana (2–6 dias) / "12 jul" (≥7 dias). */
export function relativeDay(day: string, today: string): string {
  const diff = diffInDays(day, today);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return capitalize(WEEKDAY_FMT.format(parseDay(day)));
  return SHORT_FMT.format(parseDay(day)).replace(".", "");
}

/** Só check-ins com nota escrita (o histórico do mini-diário). */
export function notesOnly(checkins: Checkin[]): Checkin[] {
  return checkins.filter((c) => (c.note ?? "").trim() !== "");
}

/** Upsert por `day` mantendo ordem desc (mais recente primeiro). */
export function mergeCheckin(list: Checkin[], checkin: Checkin): Checkin[] {
  const rest = list.filter((c) => c.day !== checkin.day);
  return [checkin, ...rest].sort((a, b) => (a.day < b.day ? 1 : -1));
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `cd /home/larissa/Projects/bloomy/apps/web && bun test mente-helpers`
Expected: PASS (todos os `describe`).

- [ ] **Step 6: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 7: Commit** *(só sob ordem da Larissa — senão pular e seguir)*

```bash
git add apps/web/src/lib/api-types.ts "apps/web/src/app/(app)/mente/hooks/mente-helpers.ts" "apps/web/src/app/(app)/mente/hooks/mente-helpers.test.ts"
git commit -m "feat(mente): DTOs e helpers puros do check-in"
```

---

### Task 2: Hook `useMente`

**Files:**
- Create: `apps/web/src/app/(app)/mente/hooks/useMente.ts`

**Interfaces:**
- Consumes: `api` (`@/lib/api`), `toastError` (`@/lib/toast`), `useResource` (`@/lib/use-resource`), `Checkin`/`Mood` (`@/lib/api-types`), `mergeCheckin`/`notesOnly` (Task 1).
- Produces: `useMente()` retornando
  `{ today: Checkin | null; records: Checkin[]; loading: boolean; setMood(m: Mood): void; setAnxiety(n: number): void; saveNote(note: string): Promise<void> }`.

- [ ] **Step 1: Implementar `useMente.ts`**

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Checkin, Mood } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { mergeCheckin, notesOnly } from "./mente-helpers";

type CheckinResponse = { checkin: Checkin | null };
type HistoryResponse = { checkins: Checkin[] };

export function useMente() {
  const todayRes = useResource<CheckinResponse>(
    useCallback(() => api.get<CheckinResponse>("/api/checkins"), []),
  );
  const historyRes = useResource<HistoryResponse>(
    useCallback(() => api.get<HistoryResponse>("/api/checkins/history?limit=30"), []),
  );

  const today = todayRes.data?.checkin ?? null;
  const records = notesOnly(historyRes.data?.checkins ?? []);

  /** PUT parcial + merge da resposta em today e history; rollback no catch. */
  const patch = useCallback(
    async (input: { mood?: Mood; anxiety?: number; note?: string }, errMsg: string) => {
      const prevToday = todayRes.data;
      const prevHistory = historyRes.data;
      try {
        const { checkin } = await api.put<CheckinResponse>("/api/checkins", input);
        if (checkin) {
          todayRes.setData({ checkin });
          historyRes.setData({ checkins: mergeCheckin(historyRes.data?.checkins ?? [], checkin) });
        }
      } catch (e) {
        todayRes.setData(prevToday);
        historyRes.setData(prevHistory);
        toastError(e, errMsg);
      }
    },
    [todayRes, historyRes],
  );

  const setMood = useCallback(
    (mood: Mood) => {
      // Otimista: seleção reflete na hora (o merge da resposta confirma).
      if (todayRes.data) todayRes.setData({ checkin: { ...todayRes.data.checkin, mood } as Checkin });
      void patch({ mood }, "Não foi possível registrar o humor");
    },
    [todayRes, patch],
  );

  const setAnxiety = useCallback(
    (anxiety: number) => void patch({ anxiety }, "Não foi possível registrar a ansiedade"),
    [patch],
  );

  const saveNote = useCallback(
    (note: string) => patch({ note }, "Não foi possível salvar o registro"),
    [patch],
  );

  return {
    today,
    records,
    loading: todayRes.loading || historyRes.loading,
    setMood,
    setAnxiety,
    saveNote,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros. (Hook não tem teste unitário — convenção do codebase; a lógica de merge/filtro já foi testada na Task 1; verificação de runtime na Task 7.)

- [ ] **Step 3: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/hooks/useMente.ts"
git commit -m "feat(mente): hook useMente (check-in + histórico otimistas)"
```

---

### Task 3: `MoodFaceIcon` + `MoodCard`

**Files:**
- Create: `apps/web/src/app/(app)/mente/components/MoodFaceIcon.tsx`
- Create: `apps/web/src/app/(app)/mente/components/MoodCard.tsx`

**Interfaces:**
- Consumes: `MOOD_ORDER` (Task 1), `Mood` (`@/lib/api-types`), `cn` (`@bloomy/ui/lib/utils`).
- Produces:
  - `<MoodFaceIcon mood={Mood} size={number} color?={string} weight?={"fill"} />` — renderiza o ícone Phosphor certo do humor.
  - `<MoodCard value={Mood | null} onSelect={(m: Mood) => void} />`.

- [ ] **Step 1: Implementar `MoodFaceIcon.tsx`**

```tsx
"use client";

import {
  CloudRainIcon,
  type Icon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
  SunIcon,
} from "@phosphor-icons/react";

import type { Mood } from "@/lib/api-types";

const MOOD_ICON: Record<Mood, Icon> = {
  sad: CloudRainIcon,
  meh: SmileySadIcon,
  neutral: SmileyMehIcon,
  good: SmileyIcon,
  great: SunIcon,
};

export function MoodFaceIcon({
  mood,
  size,
  color,
}: {
  mood: Mood;
  size: number;
  color?: string;
}) {
  const Face = MOOD_ICON[mood];
  return <Face size={size} weight="fill" color={color} />;
}
```

- [ ] **Step 2: Implementar `MoodCard.tsx`**

```tsx
"use client";

import type { Mood } from "@/lib/api-types";
import { cn } from "@bloomy/ui/lib/utils";

import { MoodFaceIcon } from "./MoodFaceIcon";
import { MOOD_ORDER } from "../hooks/mente-helpers";

const MOOD_LABEL: Record<Mood, string> = {
  sad: "Muito pra baixo",
  meh: "Pra baixo",
  neutral: "Neutro",
  good: "Bem",
  great: "Ótimo",
};

export function MoodCard({
  value,
  onSelect,
}: {
  value: Mood | null;
  onSelect: (mood: Mood) => void;
}) {
  return (
    <section className="rounded-card-lg bg-lilac-tint p-4.5">
      <h2 className="mb-3.5 font-display text-base font-bold text-ink">
        Como você está se sentindo agora?
      </h2>
      <div className="flex justify-between">
        {MOOD_ORDER.map((mood) => {
          const selected = value === mood;
          return (
            <button
              key={mood}
              type="button"
              aria-label={MOOD_LABEL[mood]}
              aria-pressed={selected}
              onClick={() => onSelect(mood)}
              className={cn(
                "grid size-13 place-items-center rounded-control motion-safe:transition-colors",
                selected ? "bg-lilac shadow-btn" : "bg-white",
              )}
            >
              <MoodFaceIcon
                mood={mood}
                size={selected ? 26 : 24}
                color={selected ? "#ffffff" : "#c7beda"}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 4: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/components/MoodFaceIcon.tsx" "apps/web/src/app/(app)/mente/components/MoodCard.tsx"
git commit -m "feat(mente): card de humor com 5 faces"
```

---

### Task 4: `AnxietyCard`

**Files:**
- Create: `apps/web/src/app/(app)/mente/components/AnxietyCard.tsx`

**Interfaces:**
- Consumes: —
- Produces: `<AnxietyCard value={number | null} onCommit={(n: number) => void} />` — slider degradê verde→rosa; persiste só ao soltar.

- [ ] **Step 1: Implementar `AnxietyCard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export function AnxietyCard({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (n: number) => void;
}) {
  // Sem valor salvo → knob no meio (50), mas só persiste após interação.
  const [local, setLocal] = useState<number>(value ?? 50);

  // Reconcilia quando o valor do servidor chega/muda (0 é válido → usar ??).
  useEffect(() => {
    setLocal(value ?? 50);
  }, [value]);

  return (
    <section className="rounded-card bg-white p-4.5 shadow-card">
      <h2 className="mb-4 font-display text-base font-bold text-ink">E a ansiedade hoje?</h2>
      <div className="relative mx-1.5 mb-2.5 h-2">
        <div
          className="h-2 rounded-full"
          style={{ background: "linear-gradient(90deg,#a8d5ba,#f3b6d0)" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-lilac bg-white"
          style={{ left: `${local}%`, boxShadow: "0 3px 8px rgba(120,86,164,.25)" }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={local}
          aria-label="Nível de ansiedade, de tranquilo a agitado"
          onChange={(e) => setLocal(Number(e.target.value))}
          onPointerUp={() => onCommit(local)}
          onKeyUp={() => onCommit(local)}
          className="absolute inset-0 h-6 w-full -translate-y-2 cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-ink-read">
        <span>Tranquilo</span>
        <span>Agitado</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 3: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/components/AnxietyCard.tsx"
git commit -m "feat(mente): card de ansiedade com slider"
```

---

### Task 5: `DiarioCard`

**Files:**
- Create: `apps/web/src/app/(app)/mente/components/DiarioCard.tsx`

**Interfaces:**
- Consumes: —
- Produces: `<DiarioCard note={string | null} onSave={(note: string) => void} />` — textarea + "Salvar registro"; botão desabilitado se vazio ou sem alteração.

- [ ] **Step 1: Implementar `DiarioCard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

export function DiarioCard({
  note,
  onSave,
}: {
  note: string | null;
  onSave: (note: string) => void;
}) {
  const [text, setText] = useState<string>(note ?? "");

  useEffect(() => {
    setText(note ?? "");
  }, [note]);

  const trimmed = text.trim();
  const disabled = trimmed === "" || trimmed === (note ?? "");

  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">Mini-diário</h2>
      <div className="rounded-card bg-pink-tint p-4">
        <p className="mb-3 text-sm font-semibold text-[#9a8290]">
          Quer escrever o que passou pela sua cabeça? Fica só entre vocês dois.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva o que vier..."
          maxLength={2000}
          className="min-h-13 w-full resize-none rounded-control bg-white px-3.5 py-3 text-sm text-ink placeholder:text-[#c6b6c0] focus:outline-none focus:ring-2 focus:ring-lilac"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(trimmed)}
          className="mt-3 w-full rounded-control bg-pink-bright py-2.5 font-display text-sm font-bold text-white disabled:opacity-50"
        >
          Salvar registro
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 3: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/components/DiarioCard.tsx"
git commit -m "feat(mente): card do mini-diário"
```

---

### Task 6: `RegistrosList`

**Files:**
- Create: `apps/web/src/app/(app)/mente/components/RegistrosList.tsx`

**Interfaces:**
- Consumes: `Checkin` (`@/lib/api-types`), `relativeDay`/`MOOD_RECORD_COLOR` (Task 1), `MoodFaceIcon` (Task 3), `dayFor` (`@/server/shared/day` — client-safe).
- Produces: `<RegistrosList records={Checkin[]} />` — lista de cards; vazio → estado acolhedor.

> Nota: `relativeDay` precisa do "hoje". `dayFor()` (de `server/shared/day.ts`) é client-safe (sem `server-only`) e computa o dia no fuso BR — usar aqui.

- [ ] **Step 1: Implementar `RegistrosList.tsx`**

```tsx
"use client";

import type { Checkin } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

import { MoodFaceIcon } from "./MoodFaceIcon";
import { MOOD_RECORD_COLOR, relativeDay } from "../hooks/mente-helpers";

export function RegistrosList({ records }: { records: Checkin[] }) {
  const today = dayFor();

  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">Seus registros</h2>
      {records.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline p-5 text-center text-sm font-semibold text-ink-read">
          Seus registros vão aparecer aqui, no seu tempo.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {records.map((c) => (
            <article key={c.id} className="rounded-card bg-white p-3.5 shadow-card-sm">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-lilac-deep">
                  {relativeDay(c.day, today)}
                </span>
                {c.mood ? (
                  <MoodFaceIcon mood={c.mood} size={18} color={MOOD_RECORD_COLOR[c.mood]} />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#6b6386]">{c.note}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 3: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/components/RegistrosList.tsx"
git commit -m "feat(mente): lista Seus registros"
```

---

### Task 7: Montar a página `mente/page.tsx`

**Files:**
- Modify: `apps/web/src/app/(app)/mente/page.tsx` (substitui o skeleton inteiro)

**Interfaces:**
- Consumes: `useMente` (Task 2), `MoodCard`/`AnxietyCard`/`DiarioCard`/`RegistrosList` (Tasks 3–6), `Screen` (`@/components/screen`).
- Produces: a tela Mente completa.

- [ ] **Step 1: Substituir o conteúdo de `page.tsx`**

```tsx
"use client";

import { Screen } from "@/components/screen";

import { AnxietyCard } from "./components/AnxietyCard";
import { DiarioCard } from "./components/DiarioCard";
import { MoodCard } from "./components/MoodCard";
import { RegistrosList } from "./components/RegistrosList";
import { useMente } from "./hooks/useMente";

export default function MentePage() {
  const { today, records, setMood, setAnxiety, saveNote } = useMente();

  return (
    <Screen title="Seu espaço" subtitle="Sem pressa e sem cobrança. Só um lugar pra registrar como você está.">
      <MoodCard value={today?.mood ?? null} onSelect={setMood} />
      <AnxietyCard value={today?.anxiety ?? null} onCommit={setAnxiety} />
      <DiarioCard note={today?.note ?? null} onSave={saveNote} />
      <RegistrosList records={records} />
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/larissa/Projects/bloomy && bun check-types`
Expected: sem erros.

- [ ] **Step 3: Verificação visual real (porta 3001)**

Run: `bun dev:web` (ou `/dev-up`), abrir `http://localhost:3001/mente`. Conferir:
1. Título "Seu espaço" + subtítulo; card de humor (tint lilás) com 5 faces `cloud-rain·smiley-sad·smiley-meh·smiley·sun`.
2. Tocar uma face → fica selecionada (lilás + sombra) na hora; **recarregar a página mantém a seleção** (persistiu).
3. Arrastar o slider e soltar → knob fica na posição; recarregar mantém.
4. Escrever nota + "Salvar registro" (botão habilita só com texto novo) → a nota aparece em "Seus registros" com data "Hoje".
5. Sem notas ainda → card vazio acolhedor (tracejado, sem cobrança).
6. Nenhum vermelho; erro (ex.: derrubar o server) cai em toast coral.

Expected: todos os pontos OK.

- [ ] **Step 4: Commit** *(só sob ordem da Larissa)*

```bash
git add "apps/web/src/app/(app)/mente/page.tsx"
git commit -m "feat(mente): montar aba Seu espaço"
```

---

## Self-Review (feito na escrita do plano)

- **Cobertura do spec:** título+subtítulo (T7) · card humor 5 faces do protótipo (T3) · salvar humor na hora (T2 `setMood`) · slider ansiedade persist-on-release (T4+T2) · `anxiety=0` válido (T2/T4, `??`) · mini-diário + "Salvar registro" (T5+T2) · "Seus registros" só com nota + data relativa + vazio acolhedor (T6+T1 `notesOnly`/`relativeDay`) · merge da resposta do PUT sem reload (T1 `mergeCheckin` + T2) · Regra Sem-Vermelho (`toastError` coral) · reduced-motion (T3 `motion-safe:`). ✅
- **Placeholders:** nenhum — todo passo traz código/comando reais.
- **Consistência de tipos:** `useMente` retorna `{today, records, setMood, setAnxiety, saveNote}` consumidos igual em T7; `MoodFaceIcon`/`MoodCard`/`AnxietyCard`/`DiarioCard`/`RegistrosList` com as assinaturas declaradas nas Interfaces. `Checkin.anxiety: number | null` lido com `??` em toda parte.

## Notas de fidelidade / decisões

- Raios: card humor `rounded-card-lg` (26px), demais cards `rounded-card` (20px), textarea/botão `rounded-control` (16px) — tokens do sistema (protótipo usa 22–24px; diferença imperceptível, mantém em-sistema). Radius arbitrário seria permitido, mas preferimos token.
- Cor âmbar `#d6a96b` (ícone `meh`/`neutral` nos registros) e `#9a8290`/`#c6b6c0`/`#6b6386` (copy/placeholder/trecho) vêm do protótipo e não estão na paleta do `DESIGN.md` — mantidas por fidelidade ao hifi (cor arbitrária é permitida; só tamanho de fonte é restrito).
- `size-13` (52px) nos tiles = mesmo tamanho do `mood-tiles.tsx` da Home e do `DESIGN.md` (52×52), não os 50px do markup da tela Mente.
