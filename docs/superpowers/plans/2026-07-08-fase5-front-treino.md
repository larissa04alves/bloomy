# Fase 5 — Front Treino Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba Treino de ponta a ponta (lista + resumo/streak, treino em andamento com timer de descanso, criar/editar/excluir treinos) contra a API já existente.

**Architecture:** Mesma organização da aba Corpo (`apps/web/CLAUDE.md`): `page.tsx` só renderiza; lógica em `hooks/` (com `useResource` + mutação otimista); visual em `components/` da tela. Lógica pura extraída em helpers testáveis (padrão `garrafas.ts`). Domínio **rosa** em todos os chips/tints/botões.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind 4 (tokens Bloomy em `@bloomy/ui`), Phosphor Icons, `vaul` (bottom sheet), `sonner` (toast). Testes: `bun test` (rodar de `apps/web`).

## Global Constraints

- **NÃO commitar.** Regra do bloomy (`CLAUDE.md` raiz): a Larissa commita e revisa. Cada task termina em checkpoint (`bun check-types`/`bun test` verde) e deixa as mudanças **não-commitadas**. Não há passo de commit.
- **Ler antes de editar:** `Read` cada arquivo antes de `Edit` (`cat`/`sed` não contam pro harness); se `Edit` falhar com `string not found`, re-`Read` antes de re-tentar.
- **Telas PT sem lógica no `.tsx`:** `page.tsx` só renderiza; fetch/estado/handlers nos hooks (`apps/web/CLAUDE.md`).
- **Uma cor por domínio:** treino = **rosa** (`tone="pink"` → tint `#fbeaf2`, deep `#c76e9e`, solid `bg-pink-bright` `#e08ab0`). Ícone `barbell` Phosphor Fill.
- **Regra Sem-Vermelho:** pendência neutra (tracejado + `text-ink-read`); erro via `toastError` (coral). Nunca vermelho de sistema.
- **`prefers-reduced-motion`:** toda animação com variante `motion-reduce:` (corte seco).
- **Tests rodam de `apps/web`** com `--conditions react-server` (já configurado no `bun test` do pacote); cobertura mínima = pontos críticos (helpers puros).
- **API client:** `api.get/post/put/del` de `@/lib/api`; erros `ApiError`; `toastError` de `@/lib/toast`; `useResource` de `@/lib/use-resource`.
- **Contratos do back** (não mudam): ver `docs/superpowers/specs/2026-07-08-fase5-front-treino-design.md`.

Comandos de verificação (da raiz salvo indicado):
- Typecheck: `bun check-types`
- Testes de treino: `cd apps/web && bun test treino`
- Dev server (verificação visual): porta 3001 (`bun dev:web`), rota `/treino`.

---

### Task 1: Tipos do domínio treino

**Files:**
- Modify: `apps/web/src/lib/api-types.ts` (append)
- Test: `apps/web/src/lib/api-types.test.ts` (create)

**Interfaces:**
- Produces: `Focus`, `FOCUS_LABELS`, `Exercise`, `Workout`, `WorkoutWithExercises`, `WorkoutSummary`, `SetLog`, `SessionExercise`, `SessionDetail`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib/api-types.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { FOCUS_LABELS } from "./api-types";

describe("FOCUS_LABELS", () => {
  it("rotula os 4 focos em PT", () => {
    expect(FOCUS_LABELS).toEqual({
      chest: "Peito",
      back: "Costas",
      legs: "Pernas",
      cardio: "Cardio",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test api-types`
Expected: FAIL — `FOCUS_LABELS` não exportado.

- [ ] **Step 3: Add types + labels**

Append ao final de `apps/web/src/lib/api-types.ts`:

```ts
// ── Treino ────────────────────────────────────────────────────────────────

export type Focus = "chest" | "back" | "legs" | "cardio";

/** Rótulos PT-BR dos focos (ordem de exibição no modal). */
export const FOCUS_LABELS: Record<Focus, string> = {
  chest: "Peito",
  back: "Costas",
  legs: "Pernas",
  cardio: "Cardio",
};

export type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  position: number;
};

export type Workout = {
  id: string;
  name: string;
  focus: Focus;
  active: boolean;
  createdAt: string;
};

export type WorkoutWithExercises = Workout & { exercises: Exercise[] };

export type WorkoutSummary = {
  weekCount: number;
  weekTarget: number;
  streak: number;
  weekDays: boolean[]; // 7 posições, seg..dom
};

export type SetLog = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  reps: number | null;
  load: number | null;
  done: boolean;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  position: number;
  sets: SetLog[];
  lastPerformance: { reps: number | null; load: number | null } | null;
};

export type SessionDetail = {
  session: {
    id: string;
    workoutId: string;
    day: string;
    startedAt: string;
    completedAt: string | null;
  };
  exercises: SessionExercise[];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test api-types`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types`
Expected: sem erros. Deixar não-commitado.

---

### Task 2: Helpers de formatação (timer + duração)

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/format.ts`
- Test: `apps/web/src/app/(app)/treino/hooks/format.test.ts`

**Interfaces:**
- Produces: `mmss(totalSeconds: number): string`, `formatDuration(totalSeconds: number): string`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/(app)/treino/hooks/format.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { formatDuration, mmss } from "./format";

describe("mmss", () => {
  it("formata segundos como M:SS", () => {
    expect(mmss(372)).toBe("6:12");
    expect(mmss(45)).toBe("0:45");
    expect(mmss(0)).toBe("0:00");
  });
  it("nunca fica negativo", () => {
    expect(mmss(-5)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("mostra minutos abaixo de 1h", () => {
    expect(formatDuration(1920)).toBe("32 min");
  });
  it("mostra horas e minutos acima de 1h", () => {
    expect(formatDuration(3900)).toBe("1h 05");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test format`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implement**

Create `apps/web/src/app/(app)/treino/hooks/format.ts`:

```ts
/** Segundos → "M:SS" (timer da sessão e do descanso). Ex.: 372 → "6:12". */
export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Segundos → duração amigável. Ex.: 1920 → "32 min"; 3900 → "1h 05". */
export function formatDuration(totalSeconds: number): string {
  const min = Math.max(0, Math.round(totalSeconds / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test format`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 3: Helpers de sessão (imutáveis, testáveis)

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/session.ts`
- Test: `apps/web/src/app/(app)/treino/hooks/session.test.ts`

**Interfaces:**
- Consumes: `SessionExercise`, `SetLog` de `@/lib/api-types`.
- Produces: `doneCount(ex: SessionExercise): number`, `applySetPatch(exercises, setId, patch): SessionExercise[]`, `completedExercises(exercises): number`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/(app)/treino/hooks/session.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import type { SessionExercise } from "@/lib/api-types";

import { applySetPatch, completedExercises, doneCount } from "./session";

function ex(id: string, sets: { id: string; done: boolean }[]): SessionExercise {
  return {
    exerciseId: id,
    name: id,
    targetSets: sets.length,
    position: 0,
    lastPerformance: null,
    sets: sets.map((s, i) => ({
      id: s.id,
      exerciseId: id,
      exerciseName: id,
      setIndex: i + 1,
      reps: 10,
      load: 40,
      done: s.done,
    })),
  };
}

describe("doneCount", () => {
  it("conta séries feitas", () => {
    expect(doneCount(ex("a", [{ id: "s1", done: true }, { id: "s2", done: false }]))).toBe(1);
  });
});

describe("applySetPatch", () => {
  it("altera só a série alvo, imutável", () => {
    const exercises = [ex("a", [{ id: "s1", done: false }])];
    const next = applySetPatch(exercises, "s1", { done: true, load: 42.5 });
    expect(next[0].sets[0].done).toBe(true);
    expect(next[0].sets[0].load).toBe(42.5);
    expect(exercises[0].sets[0].done).toBe(false); // original intacto
  });
  it("ignora setId inexistente", () => {
    const exercises = [ex("a", [{ id: "s1", done: false }])];
    expect(applySetPatch(exercises, "x", { done: true })[0].sets[0].done).toBe(false);
  });
});

describe("completedExercises", () => {
  it("conta exercícios com todas as séries feitas", () => {
    const exercises = [
      ex("a", [{ id: "s1", done: true }, { id: "s2", done: true }]),
      ex("b", [{ id: "s3", done: true }, { id: "s4", done: false }]),
    ];
    expect(completedExercises(exercises)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test session`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implement**

Create `apps/web/src/app/(app)/treino/hooks/session.ts`:

```ts
import type { SessionExercise, SetLog } from "@/lib/api-types";

/** Nº de séries concluídas de um exercício. */
export function doneCount(ex: SessionExercise): number {
  return ex.sets.filter((s) => s.done).length;
}

/** Aplica um patch a uma série (imutável) — base do update otimista. */
export function applySetPatch(
  exercises: SessionExercise[],
  setId: string,
  patch: Partial<Pick<SetLog, "reps" | "load" | "done">>,
): SessionExercise[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }));
}

/** Nº de exercícios com todas as séries feitas. */
export function completedExercises(exercises: SessionExercise[]): number {
  return exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test session`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 4: Preferências e tick de descanso

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/rest.ts`
- Test: `apps/web/src/app/(app)/treino/hooks/rest.test.ts`

**Interfaces:**
- Produces: `REST_MIN`, `REST_MAX`, `REST_DEFAULT`, `RestPrefs`, `clampRest(n): number`, `tickRest(left: number | null): number | null`, `loadRestPrefs(): RestPrefs`, `saveRestPrefs(prefs): void`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/app/(app)/treino/hooks/rest.test.ts`:

```ts
import { describe, expect, it } from "bun:test";

import { clampRest, loadRestPrefs, REST_DEFAULT, REST_MAX, REST_MIN, tickRest } from "./rest";

describe("clampRest", () => {
  it("limita ao intervalo e arredonda", () => {
    expect(clampRest(5)).toBe(REST_MIN);
    expect(clampRest(999)).toBe(REST_MAX);
    expect(clampRest(45.6)).toBe(46);
  });
});

describe("tickRest", () => {
  it("decrementa até acabar", () => {
    expect(tickRest(45)).toBe(44);
    expect(tickRest(1)).toBeNull();
    expect(tickRest(0)).toBeNull();
    expect(tickRest(null)).toBeNull();
  });
});

describe("loadRestPrefs", () => {
  it("retorna os defaults sem window (SSR)", () => {
    expect(loadRestPrefs()).toEqual({ seconds: REST_DEFAULT, auto: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test rest`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implement**

Create `apps/web/src/app/(app)/treino/hooks/rest.ts`:

```ts
export type RestPrefs = { seconds: number; auto: boolean };

export const REST_MIN = 15;
export const REST_MAX = 120;
export const REST_DEFAULT = 45;

const KEY_SECONDS = "bloomy.rest.seconds";
const KEY_AUTO = "bloomy.rest.auto";

export function clampRest(seconds: number): number {
  return Math.min(REST_MAX, Math.max(REST_MIN, Math.round(seconds)));
}

/** Um tick do descanso: null quando chega a 0 (ou já inativo). */
export function tickRest(left: number | null): number | null {
  if (left === null || left <= 1) return null;
  return left - 1;
}

export function loadRestPrefs(): RestPrefs {
  if (typeof window === "undefined") return { seconds: REST_DEFAULT, auto: true };
  const rawSec = window.localStorage.getItem(KEY_SECONDS);
  const rawAuto = window.localStorage.getItem(KEY_AUTO);
  const parsed = rawSec === null ? REST_DEFAULT : clampRest(Number(rawSec));
  return {
    seconds: Number.isFinite(parsed) ? parsed : REST_DEFAULT,
    auto: rawAuto === null ? true : rawAuto === "true",
  };
}

export function saveRestPrefs(prefs: RestPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_SECONDS, String(prefs.seconds));
  window.localStorage.setItem(KEY_AUTO, String(prefs.auto));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && bun test rest`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types` → sem erros. Não-commitado.

---

### Task 5: Hook `useDescanso` + `DescansoOverlay`

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/useDescanso.ts`
- Create: `apps/web/src/app/(app)/treino/components/DescansoOverlay.tsx`

**Interfaces:**
- Consumes: `rest.ts` helpers; `mmss` de `./format`.
- Produces: `useDescanso()` → `{ resting: boolean, left: number, seconds: number, auto: boolean, start(): void, stop(): void, adjust(delta: number): void, setAuto(auto: boolean): void }`; `DescansoOverlay` component.

- [ ] **Step 1: Implement the hook**

Create `apps/web/src/app/(app)/treino/hooks/useDescanso.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clampRest, loadRestPrefs, type RestPrefs, saveRestPrefs, tickRest } from "./rest";

export function useDescanso() {
  const [prefs, setPrefs] = useState<RestPrefs>(() => loadRestPrefs());
  const [left, setLeft] = useState<number | null>(null); // null = descanso inativo
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clear();
    setLeft(null);
  }, [clear]);

  const start = useCallback(() => {
    if (!prefs.auto) return;
    clear();
    setLeft(prefs.seconds);
    timer.current = setInterval(() => {
      setLeft((v) => {
        const next = tickRest(v);
        if (next === null) clear();
        return next;
      });
    }, 1000);
  }, [prefs.auto, prefs.seconds, clear]);

  // Ajusta o descanso corrente e o default (persistido).
  const adjust = useCallback((delta: number) => {
    setPrefs((p) => {
      const np = { ...p, seconds: clampRest(p.seconds + delta) };
      saveRestPrefs(np);
      return np;
    });
    setLeft((v) => (v === null ? v : clampRest(v + delta)));
  }, []);

  const setAuto = useCallback((auto: boolean) => {
    setPrefs((p) => {
      const np = { ...p, auto };
      saveRestPrefs(np);
      return np;
    });
  }, []);

  useEffect(() => clear, [clear]); // limpa o interval ao desmontar

  return {
    resting: left !== null,
    left: left ?? 0,
    seconds: prefs.seconds,
    auto: prefs.auto,
    start,
    stop,
    adjust,
    setAuto,
  };
}
```

- [ ] **Step 2: Implement the overlay**

Create `apps/web/src/app/(app)/treino/components/DescansoOverlay.tsx`:

```tsx
"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

import { mmss } from "../hooks/format";

export function DescansoOverlay({
  left,
  total,
  onAdjust,
  onSkip,
}: {
  left: number;
  total: number;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
}) {
  const pct = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-105 px-5.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-4 rounded-card-lg bg-ink px-5 py-4 text-white shadow-sheet">
        <div className="relative grid place-items-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#5a5470" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#a78bd0"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
            />
          </svg>
          <span className="absolute font-display text-xl font-bold tabular-nums">{mmss(left)}</span>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <span className="text-[10px] font-extrabold tracking-widest text-white/70">DESCANSO</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Menos 15 segundos"
              onClick={() => onAdjust(-15)}
              className="grid size-9 place-items-center rounded-full bg-white/12"
            >
              <MinusIcon size={16} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Mais 15 segundos"
              onClick={() => onAdjust(15)}
              className="grid size-9 place-items-center rounded-full bg-white/12"
            >
              <PlusIcon size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="ml-auto rounded-full bg-white/15 px-4 py-2 text-[13px] font-bold"
            >
              Pular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Checkpoint**

Run: `bun check-types`
Expected: sem erros. (Verificação visual do overlay acontece na Task 8, já dentro do fluxo.) Não-commitado.

---

### Task 6: Hook `useSessao` (motor do treino em andamento)

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/useSessao.ts`

**Interfaces:**
- Consumes: `applySetPatch` de `./session`; `SessionDetail` de `@/lib/api-types`; `api`, `ApiError`, `toastError`, `useResource`.
- Produces: `useSessao()` → `{ detail: SessionDetail | null, loading: boolean, view: 'lista'|'ex'|'fim', activeEx: number, finishSummary, start(workoutId), openExercise(i), backToList(), setSetValue(setId, patch), persistSet(setId, patch), markDone(setId, patch), complete(), reset() }`.

- [ ] **Step 1: Implement**

Create `apps/web/src/app/(app)/treino/hooks/useSessao.ts`:

```ts
"use client";

import { useCallback, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { SessionDetail } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

import { applySetPatch } from "./session";

type View = "lista" | "ex" | "fim";
type SetPatch = { reps?: number | null; load?: number | null };
type FinishSummary = { durationSec: number; exerciseCount: number };

export function useSessao() {
  const { data, loading, reload, setData } = useResource<{ session: SessionDetail | null }>(
    useCallback(() => api.get<{ session: SessionDetail | null }>("/api/sessions/active"), []),
  );
  const detail = data?.session ?? null;

  const [view, setView] = useState<View>("lista");
  const [activeEx, setActiveEx] = useState(0);
  const [finishSummary, setFinishSummary] = useState<FinishSummary | null>(null);

  const patchLocal = useCallback(
    (setId: string, patch: SetPatch) => {
      if (!detail) return;
      setData({
        session: { ...detail, exercises: applySetPatch(detail.exercises, setId, patch) },
      });
    },
    [detail, setData],
  );

  const start = useCallback(
    async (workoutId: string) => {
      try {
        const { session } = await api.post<{ session: SessionDetail }>(
          `/api/workouts/${workoutId}/sessions`,
        );
        setData({ session });
        setView("lista");
        setActiveEx(0);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          reload(); // já havia uma sessão ativa — recarrega em vez de erro
          return;
        }
        toastError(e, "Não foi possível iniciar o treino");
      }
    },
    [setData, reload],
  );

  const openExercise = useCallback((i: number) => {
    setActiveEx(i);
    setView("ex");
  }, []);
  const backToList = useCallback(() => setView("lista"), []);

  // Edição local (stepper) sem persistir.
  const setSetValue = useCallback((setId: string, patch: SetPatch) => patchLocal(setId, patch), [patchLocal]);

  // Persiste reps/load ao sair do campo (sem marcar feito).
  const persistSet = useCallback(
    async (setId: string, patch: SetPatch) => {
      if (!detail) return;
      try {
        await api.put(`/api/sessions/${detail.session.id}/sets/${setId}`, patch);
      } catch (e) {
        toastError(e, "Não foi possível salvar a série");
      }
    },
    [detail],
  );

  // Marca feito (otimista): grava reps/load atuais + done. Retorna true se marcou.
  const markDone = useCallback(
    async (setId: string, patch: SetPatch): Promise<boolean> => {
      if (!detail) return false;
      const prev = data;
      patchLocal(setId, { ...patch, done: true });
      try {
        await api.put(`/api/sessions/${detail.session.id}/sets/${setId}`, { ...patch, done: true });
        return true;
      } catch (e) {
        if (prev) setData(prev);
        toastError(e, "Não foi possível salvar a série");
        return false;
      }
    },
    [detail, data, setData, patchLocal],
  );

  const complete = useCallback(async () => {
    if (!detail) return;
    try {
      const summary = await api.post<FinishSummary>(`/api/sessions/${detail.session.id}/complete`);
      setFinishSummary(summary);
      setView("fim");
    } catch (e) {
      toastError(e, "Não foi possível concluir o treino");
    }
  }, [detail]);

  const reset = useCallback(() => {
    setData({ session: null });
    setFinishSummary(null);
    setView("lista");
    setActiveEx(0);
  }, [setData]);

  return {
    detail,
    loading,
    view,
    activeEx,
    finishSummary,
    start,
    openExercise,
    backToList,
    setSetValue,
    persistSet,
    markDone,
    complete,
    reset,
  };
}
```

- [ ] **Step 2: Checkpoint**

Run: `bun check-types`
Expected: sem erros. Não-commitado.

---

### Task 7: Views da sessão (lista de exercícios, séries, fim)

**Files:**
- Create: `apps/web/src/app/(app)/treino/components/ExercicioList.tsx`
- Create: `apps/web/src/app/(app)/treino/components/SerieList.tsx`
- Create: `apps/web/src/app/(app)/treino/components/SessaoFim.tsx`
- Create: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx`

**Interfaces:**
- Consumes: `useSessao()` (Task 6), `useDescanso()` + `DescansoOverlay` (Task 5), `doneCount`/`completedExercises` de `./hooks/session`, `mmss`/`formatDuration`, `IconChip`, `ToggleSwitch`, `Stepper`, tipos de `@/lib/api-types`.
- Produces: `SessaoAtiva({ sessao })` component (recebe o retorno de `useSessao`).

- [ ] **Step 1: `ExercicioList` (view 'lista')**

Create `apps/web/src/app/(app)/treino/components/ExercicioList.tsx`:

```tsx
"use client";

import { ArrowLeftIcon, BarbellIcon, CaretRightIcon, CheckCircleIcon, TimerIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { SessionExercise } from "@/lib/api-types";

import { mmss } from "../hooks/format";
import { doneCount } from "../hooks/session";

export function ExercicioList({
  name,
  exercises,
  startedAt,
  auto,
  onToggleAuto,
  onOpenExercise,
  onComplete,
}: {
  name: string;
  exercises: SessionExercise[];
  startedAt: string;
  auto: boolean;
  onToggleAuto: (v: boolean) => void;
  onOpenExercise: (i: number) => void;
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const doneEx = exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-28">
      <header className="flex items-center gap-3">
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-2xl font-bold text-ink">{name}</h1>
          <p className="text-[13px] font-semibold text-ink-read">
            {doneEx} de {exercises.length} exercícios
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-pink-tint px-3 py-1.5 font-display text-[13px] font-bold text-pink-deep tabular-nums">
          <TimerIcon size={16} weight="fill" /> {mmss(elapsed)}
        </span>
      </header>

      <p className="text-[13px] font-semibold text-ink-read">Toque num exercício para registrar as séries.</p>

      <div className="flex flex-col gap-2">
        {exercises.map((ex, i) => {
          const done = ex.sets.length > 0 && ex.sets.every((s) => s.done);
          return (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() => onOpenExercise(i)}
              className="flex items-center gap-3 rounded-card bg-white p-3 text-left shadow-card-sm"
            >
              <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-[14px] font-bold text-ink">{ex.name}</span>
                <span className="text-[12px] font-semibold text-ink-read">
                  {doneCount(ex)}/{ex.targetSets} séries
                  {ex.lastPerformance?.load ? ` · ${ex.lastPerformance.load} kg` : ""}
                </span>
              </div>
              {done ? (
                <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
              ) : (
                <CaretRightIcon size={20} className="text-ink-faint" />
              )}
            </button>
          );
        })}
      </div>

      <label className="flex items-center justify-between rounded-card bg-white p-3 shadow-card-sm">
        <span className="text-[13px] font-bold text-ink">Descanso automático</span>
        <ToggleSwitch checked={auto} onCheckedChange={onToggleAuto} label="Descanso automático" />
      </label>

      <button
        type="button"
        onClick={onComplete}
        className="mt-2 w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn"
      >
        Concluir treino
      </button>
    </div>
  );
}
```

> Nota: `ArrowLeftIcon` fica reservado à Task 8 (o back da sessão para a lista de treinos não existe aqui — a lista de exercícios é o topo). Se o linter reclamar de import não usado, remova `ArrowLeftIcon` deste arquivo.

- [ ] **Step 2: `SerieList` (view 'ex')**

Create `apps/web/src/app/(app)/treino/components/SerieList.tsx`:

```tsx
"use client";

import { ArrowLeftIcon, CheckCircleIcon } from "@phosphor-icons/react";

import type { SessionExercise } from "@/lib/api-types";

export function SerieList({
  exercise,
  onBack,
  onChangeReps,
  onChangeLoad,
  onPersist,
  onDone,
}: {
  exercise: SessionExercise;
  onBack: () => void;
  onChangeReps: (setId: string, reps: number) => void;
  onChangeLoad: (setId: string, load: number) => void;
  onPersist: (setId: string, patch: { reps: number | null; load: number | null }) => void;
  onDone: (setId: string, patch: { reps: number | null; load: number | null }) => void;
}) {
  const doneN = exercise.sets.filter((s) => s.done).length;
  const last = exercise.lastPerformance;

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={onBack}
          className="grid size-10 place-items-center rounded-full bg-lilac-tint text-lilac-deep"
        >
          <ArrowLeftIcon size={20} weight="bold" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-display text-xl font-bold text-ink">{exercise.name}</h1>
          <p className="text-[13px] font-semibold text-ink-read">
            {doneN} de {exercise.sets.length} séries
          </p>
        </div>
      </header>

      {last?.load ? (
        <p className="rounded-control bg-pink-tint px-4 py-2.5 text-[13px] font-semibold text-pink-deep">
          Último treino: {last.load} kg{last.reps ? ` · ${last.reps} reps` : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {exercise.sets.map((s, i) => {
          const current = !s.done && exercise.sets.slice(0, i).every((p) => p.done);
          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 rounded-card p-3 ${current ? "bg-lilac-tint" : "bg-white shadow-card-sm"}`}
            >
              <span className="w-16 text-[13px] font-bold text-ink">Série {s.setIndex}</span>

              <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={s.reps ?? ""}
                  onChange={(e) => onChangeReps(s.id, Number(e.target.value))}
                  onBlur={() => onPersist(s.id, { reps: s.reps, load: s.load })}
                  className="w-9 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                  aria-label={`Repetições da série ${s.setIndex}`}
                />
                <span className="text-[11px] font-bold text-ink-read">reps</span>
              </label>

              <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  value={s.load ?? ""}
                  onChange={(e) => onChangeLoad(s.id, Number(e.target.value))}
                  onBlur={() => onPersist(s.id, { reps: s.reps, load: s.load })}
                  className="w-11 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                  aria-label={`Carga da série ${s.setIndex}`}
                />
                <span className="text-[11px] font-bold text-ink-read">kg</span>
              </label>

              {s.done ? (
                <CheckCircleIcon size={26} weight="fill" className="ml-auto text-green-deep" />
              ) : (
                <button
                  type="button"
                  onClick={() => onDone(s.id, { reps: s.reps, load: s.load })}
                  className="ml-auto rounded-full bg-pink-bright px-4 py-2 text-[13px] font-bold text-white"
                >
                  Feito
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `SessaoFim` (view 'fim')**

Create `apps/web/src/app/(app)/treino/components/SessaoFim.tsx`:

```tsx
"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";

import { formatDuration } from "../hooks/format";

export function SessaoFim({
  durationSec,
  exerciseCount,
  onRestart,
}: {
  durationSec: number;
  exerciseCount: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-5.5 pt-16 pb-8 text-center">
      <CheckCircleIcon size={88} weight="fill" className="text-green-deep" />
      <h1 className="font-display text-2xl font-bold text-ink">Treino concluído!</h1>

      <div className="flex w-full gap-3">
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">{exerciseCount}</span>
          <span className="text-[12px] font-semibold text-ink-read">exercícios</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">{formatDuration(durationSec)}</span>
          <span className="text-[12px] font-semibold text-ink-read">duração</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-2 w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
      >
        Voltar ao início
      </button>
    </div>
  );
}
```

- [ ] **Step 4: `SessaoAtiva` (orquestra as views + descanso)**

Create `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx`:

```tsx
"use client";

import type { useSessao } from "../hooks/useSessao";
import { useDescanso } from "../hooks/useDescanso";
import { DescansoOverlay } from "./DescansoOverlay";
import { ExercicioList } from "./ExercicioList";
import { SerieList } from "./SerieList";
import { SessaoFim } from "./SessaoFim";

export function SessaoAtiva({ sessao }: { sessao: ReturnType<typeof useSessao> }) {
  const descanso = useDescanso();
  const { detail, view, activeEx, finishSummary } = sessao;

  if (!detail) return null;

  if (view === "fim" && finishSummary) {
    return (
      <SessaoFim
        durationSec={finishSummary.durationSec}
        exerciseCount={finishSummary.exerciseCount}
        onRestart={sessao.reset}
      />
    );
  }

  if (view === "ex") {
    const exercise = detail.exercises[activeEx];
    return (
      <>
        <SerieList
          exercise={exercise}
          onBack={sessao.backToList}
          onChangeReps={(setId, reps) => sessao.setSetValue(setId, { reps })}
          onChangeLoad={(setId, load) => sessao.setSetValue(setId, { load })}
          onPersist={(setId, patch) => sessao.persistSet(setId, patch)}
          onDone={async (setId, patch) => {
            const ok = await sessao.markDone(setId, patch);
            if (ok) descanso.start();
          }}
        />
        {descanso.resting ? (
          <DescansoOverlay
            left={descanso.left}
            total={descanso.seconds}
            onAdjust={descanso.adjust}
            onSkip={descanso.stop}
          />
        ) : null}
      </>
    );
  }

  return (
    <ExercicioList
      name={/* nome do treino: vem da lista; ver Task 8 nota */ "Treino"}
      exercises={detail.exercises}
      startedAt={detail.session.startedAt}
      auto={descanso.auto}
      onToggleAuto={descanso.setAuto}
      onOpenExercise={sessao.openExercise}
      onComplete={sessao.complete}
    />
  );
}
```

> **Nota sobre o nome do treino:** `SessionDetail.session` não traz o nome do workout. Na Task 8, `useTreinos` já tem a lista; passe o nome resolvido (`workouts.find(w => w.id === detail.session.workoutId)?.name ?? "Treino"`) como prop `workoutName` de `SessaoAtiva`. Ajuste a assinatura de `SessaoAtiva` para aceitar `workoutName: string` e repasse ao `ExercicioList name={workoutName}`.

- [ ] **Step 5: Checkpoint**

Run: `bun check-types`
Expected: sem erros (pode haver aviso de import não usado `ArrowLeftIcon` no `ExercicioList` — remover). Não-commitado.

---

### Task 8: Lista de treinos + resumo + gate da página (primeiro E2E)

**Files:**
- Create: `apps/web/src/app/(app)/treino/hooks/useTreinos.ts`
- Create: `apps/web/src/app/(app)/treino/components/ResumoTreinoCard.tsx`
- Create: `apps/web/src/app/(app)/treino/components/TreinoList.tsx`
- Modify: `apps/web/src/app/(app)/treino/page.tsx` (substitui o skeleton)
- Modify: `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx` (aceita `workoutName`)

**Interfaces:**
- Consumes: `useSessao` (Task 6), `SessaoAtiva` (Task 7), `WorkoutWithExercises`/`WorkoutSummary`/`FOCUS_LABELS`.
- Produces: `useTreinos()` → `{ workouts, summary, loading, reload, create, edit, remove }`; `ResumoTreinoCard`; `TreinoList`.

- [ ] **Step 1: `useTreinos` (GET + create/edit/remove otimista)**

Create `apps/web/src/app/(app)/treino/hooks/useTreinos.ts`:

```ts
"use client";

import { useCallback } from "react";

import { api } from "@/lib/api";
import type { Focus, WorkoutSummary, WorkoutWithExercises } from "@/lib/api-types";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export type WorkoutInput = {
  name: string;
  focus: Focus;
  exercises: { name: string; targetSets: number; position: number }[];
};

export function useTreinos() {
  const list = useResource<{ workouts: WorkoutWithExercises[] }>(
    useCallback(() => api.get<{ workouts: WorkoutWithExercises[] }>("/api/workouts"), []),
  );
  const sum = useResource<WorkoutSummary>(
    useCallback(() => api.get<WorkoutSummary>("/api/workouts/summary"), []),
  );

  const workouts = list.data?.workouts ?? [];

  const create = useCallback(
    async (input: WorkoutInput) => {
      try {
        await api.post("/api/workouts", input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível criar o treino");
      }
    },
    [list],
  );

  const edit = useCallback(
    async (id: string, input: WorkoutInput) => {
      try {
        await api.put(`/api/workouts/${id}`, input);
        list.reload();
      } catch (e) {
        toastError(e, "Não foi possível salvar o treino");
      }
    },
    [list],
  );

  const remove = useCallback(
    async (id: string) => {
      const prev = list.data;
      list.setData({ workouts: workouts.filter((w) => w.id !== id) }); // otimista
      try {
        await api.del(`/api/workouts/${id}`);
      } catch (e) {
        if (prev) list.setData(prev);
        toastError(e, "Não foi possível excluir o treino");
      }
    },
    [list, workouts],
  );

  return {
    workouts,
    summary: sum.data,
    loading: list.loading,
    reload: () => {
      list.reload();
      sum.reload();
    },
    create,
    edit,
    remove,
  };
}
```

- [ ] **Step 2: `ResumoTreinoCard` (card rosa + streak + 7 bolinhas)**

Create `apps/web/src/app/(app)/treino/components/ResumoTreinoCard.tsx`:

```tsx
import { FireIcon } from "@phosphor-icons/react/dist/ssr";

import type { WorkoutSummary } from "@/lib/api-types";

const DOW = ["S", "T", "Q", "Q", "S", "S", "D"]; // seg..dom

export function ResumoTreinoCard({ summary }: { summary: WorkoutSummary }) {
  return (
    <section className="flex flex-col gap-3 rounded-card-lg bg-pink-tint p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-display text-[15px] font-bold text-pink-deep">
            {summary.weekCount} {summary.weekCount === 1 ? "treino" : "treinos"} essa semana
          </span>
          <span className="text-[12px] font-semibold text-pink-deep/80">
            Meta: {summary.weekTarget} por semana
          </span>
        </div>
        {summary.streak > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-[13px] font-bold text-pink-deep">
            <FireIcon size={16} weight="fill" /> {summary.streak}
          </span>
        ) : null}
      </div>

      <div className="flex justify-between">
        {summary.weekDays.map((active, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${
                active ? "bg-pink-bright text-white" : "bg-white/60 text-pink-deep/50"
              }`}
            >
              {DOW[i]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

> `key={i}` aqui é estável (semana fixa de 7 posições) — ok o index como key.

- [ ] **Step 3: `TreinoList` (cards + play → start)**

Create `apps/web/src/app/(app)/treino/components/TreinoList.tsx`:

```tsx
"use client";

import { BarbellIcon, PlayIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { FOCUS_LABELS, type WorkoutWithExercises } from "@/lib/api-types";

export function TreinoList({
  workouts,
  onStart,
}: {
  workouts: WorkoutWithExercises[];
  onStart: (workoutId: string) => void;
}) {
  if (workouts.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline p-5 text-center text-[13px] font-semibold text-ink-read">
        Nenhum treino ainda. Crie o primeiro no botão acima.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      {workouts.map((w) => (
        <div key={w.id} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
          <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
          <div className="flex flex-1 flex-col">
            <span className="text-[14px] font-bold text-ink">{w.name}</span>
            <span className="text-[12px] font-semibold text-ink-read">
              {w.exercises.length} exercícios · {FOCUS_LABELS[w.focus]}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Iniciar ${w.name}`}
            onClick={() => onStart(w.id)}
            className="grid size-11 place-items-center rounded-full bg-pink-bright text-white shadow-btn"
          >
            <PlayIcon size={20} weight="fill" />
          </button>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Ajustar `SessaoAtiva` para receber `workoutName`**

Em `apps/web/src/app/(app)/treino/components/SessaoAtiva.tsx`, trocar a assinatura e o uso:

```tsx
export function SessaoAtiva({
  sessao,
  workoutName,
}: {
  sessao: ReturnType<typeof useSessao>;
  workoutName: string;
}) {
```

e no retorno da view 'lista' trocar `name={"Treino"}` por `name={workoutName}`.

- [ ] **Step 5: `page.tsx` (gate + lista)**

Substituir todo o conteúdo de `apps/web/src/app/(app)/treino/page.tsx`:

```tsx
"use client";

import { PlusIcon } from "@phosphor-icons/react";

import { Screen } from "@/components/screen";

import { ResumoTreinoCard } from "./components/ResumoTreinoCard";
import { SessaoAtiva } from "./components/SessaoAtiva";
import { TreinoList } from "./components/TreinoList";
import { useSessao } from "./hooks/useSessao";
import { useTreinos } from "./hooks/useTreinos";

export default function TreinoPage() {
  const sessao = useSessao();
  const treinos = useTreinos();

  if (sessao.detail) {
    const workoutName =
      treinos.workouts.find((w) => w.id === sessao.detail!.session.workoutId)?.name ?? "Treino";
    return <SessaoAtiva sessao={sessao} workoutName={workoutName} />;
  }

  return (
    <Screen title="Treino" subtitle="Seu ritual de hoje">
      {treinos.summary ? <ResumoTreinoCard summary={treinos.summary} /> : null}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-bold text-ink">Seus treinos</h2>
        <button
          type="button"
          className="flex items-center gap-1 text-[13px] font-bold text-pink-deep"
          // onClick do modal chega na Task 9
        >
          <PlusIcon size={16} weight="bold" /> Novo treino
        </button>
      </div>

      <TreinoList workouts={treinos.workouts} onStart={sessao.start} />
    </Screen>
  );
}
```

- [ ] **Step 6: Verificação visual (primeiro E2E do fluxo em andamento)**

Rodar `bun check-types` (raiz) → sem erros. Subir `bun dev:web`, abrir `/treino` na porta 3001:
- A lista de treinos e o card rosa de resumo aparecem (usar um treino já existente no banco de dev; se não houver, criar um pelo `db:studio` ou aguardar a Task 9).
- Tocar play → entra na lista de exercícios (timer da sessão correndo) → abrir exercício → editar carga → **Feito** → overlay de descanso aparece e conta regressivo → **Pular** encerra → **Concluir treino** → tela de resumo → **Voltar ao início** volta pra lista.

Expected: fluxo completo funciona; nenhum vermelho; sombras/tints rosa corretos. Não-commitado.

---

### Task 9: Modal de criar treino

**Files:**
- Create: `apps/web/src/app/(app)/treino/components/TreinoModal.tsx`
- Modify: `apps/web/src/app/(app)/treino/page.tsx` (estado do modal + wire create)

**Interfaces:**
- Consumes: `BottomSheet`, `ChoiceChip`, `FOCUS_LABELS`, `WorkoutInput` (de `useTreinos`).
- Produces: `TreinoModal({ open, onOpenChange, editing?, onSubmit })`.

- [ ] **Step 1: `TreinoModal`**

Create `apps/web/src/app/(app)/treino/components/TreinoModal.tsx`:

```tsx
"use client";

import { BarbellIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { type Focus, FOCUS_LABELS, type WorkoutWithExercises } from "@/lib/api-types";

import type { WorkoutInput } from "../hooks/useTreinos";

const FOCI: Focus[] = ["chest", "back", "legs", "cardio"];

type ExRow = { name: string; targetSets: number };

export function TreinoModal({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: WorkoutWithExercises;
  onSubmit: (input: WorkoutInput) => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<Focus>("chest");
  const [rows, setRows] = useState<ExRow[]>([{ name: "", targetSets: 3 }]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setFocus(editing?.focus ?? "chest");
      setRows(
        editing && editing.exercises.length > 0
          ? editing.exercises.map((e) => ({ name: e.name, targetSets: e.targetSets }))
          : [{ name: "", targetSets: 3 }],
      );
    }
  }, [open, editing]);

  const cleanRows = rows.filter((r) => r.name.trim().length > 0);
  const canSave = name.trim().length > 0 && cleanRows.length > 0;

  const setRow = (i: number, patch: Partial<ExRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { name: "", targetSets: 3 }]);
  const removeRow = (i: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      focus,
      exercises: cleanRows.map((r, i) => ({
        name: r.name.trim(),
        targetSets: r.targetSets,
        position: i,
      })),
    });
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar treino" : "Novo treino"}
      tone="pink"
      icon={<BarbellIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSave}
          onClick={submit}
          className="w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          {editing ? "Salvar" : "Criar treino"}
        </button>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do treino (ex.: Peito e tríceps)"
        className="w-full rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-pink-bright focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {FOCI.map((f) => (
          <ChoiceChip key={f} tone="pink" selected={focus === f} onClick={() => setFocus(f)}>
            {FOCUS_LABELS[f]}
          </ChoiceChip>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          // eslint-disable-next-line react/no-array-index-key -- lista curta e efêmera
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => setRow(i, { name: e.target.value })}
              placeholder={i === 0 ? "Exercício" : "Mais um exercício…"}
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-pink-bright focus:outline-none"
            />
            <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-2.5">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={r.targetSets}
                onChange={(e) => setRow(i, { targetSets: Math.min(20, Math.max(1, Number(e.target.value))) })}
                className="w-8 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                aria-label={`Séries do exercício ${i + 1}`}
              />
              <span className="text-[11px] font-bold text-ink-read">séries</span>
            </label>
            {rows.length > 1 ? (
              <button
                type="button"
                aria-label="Remover exercício"
                onClick={() => removeRow(i)}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-pink-tint text-pink-deep"
              >
                <XIcon size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-2.5 text-[13px] font-bold text-pink-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar exercício
        </button>
      </div>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Wire no `page.tsx`**

Editar `apps/web/src/app/(app)/treino/page.tsx`:
1. Adicionar imports:
```tsx
import { useState } from "react";

import { TreinoModal } from "./components/TreinoModal";
```
2. Dentro do componente, antes do `return`:
```tsx
  const [modalOpen, setModalOpen] = useState(false);
```
3. Trocar o botão "Novo treino" para abrir o modal:
```tsx
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 text-[13px] font-bold text-pink-deep"
        >
          <PlusIcon size={16} weight="bold" /> Novo treino
        </button>
```
4. Antes do fechamento do `</Screen>`, adicionar o modal:
```tsx
      <TreinoModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={treinos.create} />
```

- [ ] **Step 3: Verificação visual**

`bun check-types` → sem erros. Na porta 3001: "Novo treino" abre o bottom sheet rosa; preencher nome + foco + 2 exercícios + Criar → o treino aparece na lista sem reload. Cancelar/arrastar pra baixo fecha. Não-commitado.

---

### Task 10: Editar e excluir treino (swipe)

**Files:**
- Modify: `apps/web/src/app/(app)/treino/components/TreinoList.tsx` (envolver cada card em `SwipeableRow`)
- Modify: `apps/web/src/app/(app)/treino/page.tsx` (estado de edição + wire edit/remove)

**Interfaces:**
- Consumes: `SwipeableRow` de `@/components/swipeable-row`; `edit`/`remove` de `useTreinos`.

- [ ] **Step 1: `TreinoList` com swipe**

Editar `apps/web/src/app/(app)/treino/components/TreinoList.tsx`:
1. Adicionar import: `import { SwipeableRow } from "@/components/swipeable-row";`
2. Estender as props:
```tsx
export function TreinoList({
  workouts,
  onStart,
  onEdit,
  onDelete,
}: {
  workouts: WorkoutWithExercises[];
  onStart: (workoutId: string) => void;
  onEdit: (workout: WorkoutWithExercises) => void;
  onDelete: (workoutId: string) => void;
}) {
```
3. Envolver cada card em `SwipeableRow` (substitui o `<div key={w.id} …>` externo):
```tsx
      {workouts.map((w) => (
        <SwipeableRow key={w.id} onEdit={() => onEdit(w)} onDelete={() => onDelete(w.id)}>
          <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
            <IconChip tone="pink" icon={<BarbellIcon size={22} weight="fill" />} />
            <div className="flex flex-1 flex-col">
              <span className="text-[14px] font-bold text-ink">{w.name}</span>
              <span className="text-[12px] font-semibold text-ink-read">
                {w.exercises.length} exercícios · {FOCUS_LABELS[w.focus]}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Iniciar ${w.name}`}
              onClick={() => onStart(w.id)}
              className="grid size-11 place-items-center rounded-full bg-pink-bright text-white shadow-btn"
            >
              <PlayIcon size={20} weight="fill" />
            </button>
          </div>
        </SwipeableRow>
      ))}
```

- [ ] **Step 2: Wire edição no `page.tsx`**

Editar `apps/web/src/app/(app)/treino/page.tsx`:
1. Import do tipo: `import type { WorkoutWithExercises } from "@/lib/api-types";`
2. Estado de edição:
```tsx
  const [editing, setEditing] = useState<WorkoutWithExercises | undefined>(undefined);
```
3. Passar `onEdit`/`onDelete` ao `TreinoList`:
```tsx
      <TreinoList
        workouts={treinos.workouts}
        onStart={sessao.start}
        onEdit={(w) => {
          setEditing(w);
          setModalOpen(true);
        }}
        onDelete={treinos.remove}
      />
```
4. Ao abrir "Novo treino", limpar edição: no `onClick` do botão trocar para `() => { setEditing(undefined); setModalOpen(true); }`.
5. Passar `editing` + `onSubmit` que decide create/edit ao `TreinoModal`:
```tsx
      <TreinoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        onSubmit={(input) => {
          if (editing) treinos.edit(editing.id, input);
          else treinos.create(input);
        }}
      />
```

- [ ] **Step 3: Verificação visual**

`bun check-types` → sem erros. Na porta 3001:
- Swipe pra esquerda revela excluir (coral); confirmar remove da lista otimista.
- Swipe pra direita revela editar (lilás); abre o modal "Editar treino" pré-preenchido; salvar reflete na lista.
Não-commitado.

---

### Task 11: Verificação visual final (aceitação da fase)

**Files:** nenhum (verificação).

- [ ] **Step 1: Typecheck + testes**

Run: `bun check-types` (raiz) → sem erros.
Run: `cd apps/web && bun test treino` → todos os testes de treino verdes.

- [ ] **Step 2: E2E completo na porta 3001**

Percorrer, confirmando fidelidade visual (domínio rosa, sombras lilás, sem vermelho, cantos arredondados) e comportamento:
1. `/treino` mostra resumo rosa (semana + streak `fire` + 7 bolinhas) e lista de treinos.
2. **Criar** treino pelo bottom sheet → aparece na lista.
3. **Iniciar** → lista de exercícios com timer da sessão correndo; abrir exercício.
4. Editar reps/carga; **Feito** → overlay de descanso conta regressivo; **−15/+15** ajusta; **Pular** encerra; toggle "Descanso automático" off não dispara overlay.
5. **Concluir treino** → resumo (exercícios + duração) → **Voltar ao início**.
6. Reabrir `/treino` com sessão ativa (iniciar e sair/voltar pela tab) → cai direto no treino em andamento (resume).
7. **Editar** e **excluir** treino por swipe.
8. Rodar com `prefers-reduced-motion` (DevTools) → sem animações do anel/toggle.

Expected: tudo funcionando de ponta a ponta contra a API real. Deixar tudo **não-commitado** para revisão da Larissa.

---

## Self-Review

**Spec coverage:**
- Registro de série editável + Feito → Tasks 6, 7 (SerieList, markDone/persistSet). ✓
- Criar/editar/excluir templates → Tasks 8 (create/remove), 9 (modal criar), 10 (editar/excluir swipe). ✓
- Descanso configurável salvo local (restSeconds/autoRest) → Tasks 4, 5 (rest.ts, useDescanso, DescansoOverlay), 7 (toggle auto). ✓
- Resume de sessão ativa ao entrar → Task 6 (`useSessao` faz GET active) + Task 8 (gate na page). ✓
- Resumo/streak/7 bolinhas → Task 8 (ResumoTreinoCard). ✓
- Máquina de estados lista→ex→fim → Tasks 6, 7. ✓
- Erros (409, complete idempotente, toast coral, sem-vermelho) → Task 6 (409/toast), Global Constraints. ✓
- Fidelidade visual (rosa, barbell, bottom sheet, overlay #3B3552) → Tasks 5, 7, 8, 9. ✓
- Testes em pontos críticos → Tasks 1–4 (FOCUS_LABELS, format, session, rest). ✓

**Placeholder scan:** sem "TBD/TODO"; o comentário em `page.tsx` da Task 8 (`onClick do modal chega na Task 9`) é resolvido na Task 9 Step 2; o `name={"Treino"}` provisório da Task 7 é resolvido na Task 8 Step 4. Ambos com instrução concreta. ✓

**Type consistency:** `WorkoutInput` definido em `useTreinos` (Task 8) e consumido em `TreinoModal` (Task 9) com a mesma forma. `SessionDetail`/`SessionExercise`/`SetLog` (Task 1) usados consistentemente em `useSessao`/`SerieList`/`ExercicioList`. `useSessao` retorna `markDone` como `Promise<boolean>` e `SessaoAtiva` faz `await` antes de `descanso.start()`. ✓
