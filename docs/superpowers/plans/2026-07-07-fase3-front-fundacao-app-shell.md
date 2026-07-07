# Fase 3 — Fundação de UI & App Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Ao despachar implementer, colar no prompt:** "Read cada arquivo antes de Edit
> (`cat`/`sed`/`head` NÃO contam p/ o harness); se Edit falhar com `string not found`,
> re-Read antes de re-tentar — nunca editar de memória; rodar `bun check-types` (da
> raiz) antes de commit."

**Goal:** Estabelecer a base visual e estrutural do front (tokens Bloomy, fontes, ícones,
primitivos reusáveis, coluna mobile sobre o board, tab bar de 5 abas, client REST + hook
de leitura, auth-gate) para que as fases de tela (F4→F10) sejam pura composição.

**Architecture:** Next 16 App Router. Tokens Bloomy no `@bloomy/ui/globals.css` (Tailwind
v4 `@theme`), consumidos por utilitários (`bg-lilac`, `text-ink`, `rounded-card`,
`shadow-card`). Primitivos visuais reusáveis moram em `@bloomy/ui`; a estrutura do app
(coluna, tab bar, gate) mora em `apps/web`. Rotas das abas ficam sob o route group
`(app)`, cujo layout-servidor faz o auth-gate; `/login` e `/onboarding` ficam fora do
grupo (sem tab bar, sem gate). Fetch acontece nos hooks das telas via `lib/api.ts` +
`useResource`.

**Tech Stack:** Next 16, React 19, Tailwind v4, shadcn (`base-lyra`), `@phosphor-icons/react`
(peso Fill), `vaul` (BottomSheet), `next/font` (Quicksand + Nunito), better-auth, bun.

> **Alinhamento com o spec `docs/superpowers/specs/2026-07-07-front-design.md` (2026-07-07).**
> Atualizações aplicadas neste plano após o brainstorming:
> - **D5 — shadcn imutável:** o `BottomSheet` deixou de ser wrapper do `drawer` gerado
>   pelo shadcn e passou a ser **componente nosso sobre `vaul`** (Task 7). `vaul` foi
>   adicionado ao catalog e a `@bloomy/ui` (Task 1). Nenhum arquivo shadcn é editado; a
>   re-tokenização do `globals.css` (Task 2) é a via sancionada de tematização.
> - **D1/D2/D3:** o `lib/api.ts` + `useResource` (Task 3) já materializam a camada de
>   leitura da D1. A mutação híbrida (D2) e os formulários com `@tanstack/react-form`
>   (D3) só aparecem a partir da **F4** (esta fase não tem tela com mutação/CRUD).
> - **D4 — toast de erro (`sonner`):** o `Toaster` é montado quando a primeira tela com
>   mutação existir (F4); a F3 não precisa dele.
> - **Correção de local dos componentes:** os primitivos das Tasks 6–7 e o `tone.ts`
>   moram em `apps/web/src/components/*` e `apps/web/src/lib/tone.ts` (imports `@/...`),
>   **não** em `packages/ui` — este último guarda só arquivos gerados pelo shadcn. Por
>   isso `vaul` é dep de `apps/web` (não de `@bloomy/ui`). Os blocos de código das
>   Tasks 6–7 abaixo ainda citam paths `packages/ui`/`@bloomy/ui`: ler com esse ajuste.

## Global Constraints

- **Autoridade visual:** `DESIGN.md` (raiz). Cores, raios, sombras e tipografia são
  finais — recriar fielmente, não reinterpretar.
- **Light-only.** Remover dark mode do `globals.css` (produto é light por ora — `PRODUCT.md`).
- **Uma cor por domínio:** lilás geral/água · verde alimentação · rosa treino/mente ·
  coral remédios.
- **Regra do Sem-Vermelho:** nada de vermelho de alerta na experiência.
- **Ícones:** Phosphor Icons, peso **Fill** para ativo/destaque, **Regular** para nav
  inativa. Nunca outro icon set no produto (`lucide` fica só para internals de shadcn).
- **Column-only:** app é coluna mobile `max-w-[420px]` centrada sobre o `board`
  (`#E9E2F3`); sem layout desktop alternativo.
- **Convenções (`apps/web/CLAUDE.md`):** telas PT em `src/app/<tela>/page.tsx` só
  renderizam; lógica em `hooks/use<Tela>.ts`. Código EN. Componentes shadcn instalados
  **dentro de `packages/ui/`**.
- **Dependências compartilhadas** entram no `catalog` do `package.json` raiz; packages
  referenciam `"catalog:"`.
- **Verificação:** `bun check-types` (da raiz) verde + render real no dev server
  (porta 3001) encerram a fase.
- **Idioma de UI:** PT-BR; wordmark **Bloomy**.

## Contrato de tokens (referência para todas as tasks)

Nomes de utilitário que este plano cria (Tailwind v4 `--color-*`/`--radius-*`/`--shadow-*`):

| Papel | Utilitário | Valor |
|---|---|---|
| Lilás / profundo / tint / tint-soft | `lilac` `lilac-deep` `lilac-tint` `lilac-tint-soft` | `#A78BD0` `#8768BC` `#EDE7F8` `#F4EFFA` |
| Rosa / profundo / vivo / tint | `pink` `pink-deep` `pink-bright` `pink-tint` | `#F3B6D0` `#C76E9E` `#E08AB0` `#FBEAF2` |
| Verde / profundo / médio / tint / tint-soft | `green` `green-deep` `green-mid` `green-tint` `green-tint-soft` | `#A8D5BA` `#4E9C74` `#7FC4A0` `#E6F4EC` `#EAF5EF` |
| Coral / tint | `coral` `coral-tint` | `#C77E93` `#FBECEF` |
| Fundo / board | `bg` `board` | `#FBFAFE` `#E9E2F3` |
| Tinta / suave / apagada / leitura-AA | `ink` `ink-soft` `ink-faint` `ink-read` | `#3B3552` `#8A82A0` `#A79FB8` `#6F6787` |
| Nav inativa / controle-off / trilho-anel / hairline / hairline-soft | `nav-inactive` `control-off` `ring-track` `hairline` `hairline-soft` | `#B3ABC4` `#E2D8F0` `#DDD1EF` `#EAE2F4` `#F1EBF8` |
| Raios | `rounded-control` `rounded-card` `rounded-card-lg` `rounded-sheet` | `16px` `20px` `26px` `28px` |
| Sombras | `shadow-card` `shadow-card-sm` `shadow-btn` `shadow-sheet` `shadow-device` | ver DESIGN §4 |
| Fontes | `font-display` (Quicksand) · `font-sans` (Nunito) | via `next/font` |

Overlay de sheet: `rgba(43,38,64,.42)`.

---

### Task 1: Dependências, fontes e config

**Files:**
- Modify: `package.json` (raiz — adicionar `@phosphor-icons/react` ao `catalog`)
- Modify: `apps/web/package.json` (dep `@phosphor-icons/react: "catalog:"`)
- Modify: `packages/ui/package.json` (dep `@phosphor-icons/react: "catalog:"`)
- Modify: `apps/web/next.config.ts` (`optimizePackageImports`)
- Modify: `apps/web/src/app/layout.tsx` (fontes Quicksand/Nunito, remover Geist e `<h1>teste</h1>`)

**Interfaces:**
- Produces: utilitários de fonte `--font-quicksand` / `--font-nunito` no `<body>`;
  `@phosphor-icons/react` disponível em `apps/web` e `packages/ui`.

- [ ] **Step 1: Adicionar `@phosphor-icons/react` e `vaul` ao catalog da raiz**

Em `package.json` (raiz), dentro de `workspaces.catalog` (ou `catalog`), acrescentar:

```json
"@phosphor-icons/react": "^2.1.7",
"vaul": "^1.1.2"
```

> `vaul` é a base do `BottomSheet` próprio (Task 7, decisão D5 — sem gerar o drawer do
> shadcn).

- [ ] **Step 2: Referenciar em web e ui**

Em `apps/web/package.json` → `dependencies`, adicionar `"@phosphor-icons/react": "catalog:"`.
Em `packages/ui/package.json` → `dependencies`, adicionar `"@phosphor-icons/react": "catalog:"`
e `"vaul": "catalog:"` (o `BottomSheet` mora em `@bloomy/ui`).

- [ ] **Step 3: Instalar**

Run (da raiz): `bun install`
Expected: instala `@phosphor-icons/react` nos dois workspaces sem erro de resolução.

- [ ] **Step 4: `optimizePackageImports` no next.config**

Em `apps/web/next.config.ts`, dentro do objeto de config, adicionar/mesclar:

```ts
experimental: {
  optimizePackageImports: ["@phosphor-icons/react"],
},
```

- [ ] **Step 5: Reescrever `layout.tsx` com Quicksand + Nunito**

Substituir todo o conteúdo de `apps/web/src/app/layout.tsx` por:

```tsx
import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";

import "../index.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bloomy",
  description: "Seu jardim de bolso — cuidar de você, todo dia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${quicksand.variable} ${nunito.variable} bg-board text-ink font-sans antialiased`}
      >
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-bg sm:shadow-device">
          {children}
        </div>
      </body>
    </html>
  );
}
```

> `bg-board`, `text-ink`, `bg-bg`, `font-sans` (Nunito) e `shadow-device` passam a
> existir na Task 2. Nesta task o `check-types` já deve passar (classes são strings).

- [ ] **Step 6: check-types + commit**

Run (da raiz): `bun check-types`
Expected: sem erros de tipo.

```bash
git add package.json apps/web/package.json packages/ui/package.json apps/web/next.config.ts apps/web/src/app/layout.tsx bun.lock
git commit -m "feat(front): fontes Bloomy, Phosphor e shell do layout raiz"
```

---

### Task 2: Re-tokenização do `globals.css` (paleta Bloomy)

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (substituir tokens cinza; remover dark)
- Modify: `apps/web/src/app/page.tsx` (redirect para `/home` — remove o placeholder)

**Interfaces:**
- Produces: todos os utilitários da tabela "Contrato de tokens" (cores, raios, sombras,
  fontes). Consumido por TODAS as tasks e fases seguintes.

- [ ] **Step 1: Substituir o `:root`, o `@theme` e remover o dark**

Reescrever `packages/ui/src/styles/globals.css` inteiro para:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@source "../../../apps/**/*.{ts,tsx}";
@source "../**/*.{ts,tsx}";

/* ---- Tokens semânticos shadcn (light-only, mapeados p/ Bloomy) ---- */
:root {
  --background: #fbfafe; /* bg */
  --foreground: #3b3552; /* ink */
  --card: #ffffff;
  --card-foreground: #3b3552;
  --popover: #ffffff;
  --popover-foreground: #3b3552;
  --primary: #a78bd0; /* lilac */
  --primary-foreground: #ffffff;
  --secondary: #edE7f8; /* lilac-tint */
  --secondary-foreground: #8768bc; /* lilac-deep */
  --muted: #f4effa; /* lilac-tint-soft */
  --muted-foreground: #8a82a0; /* ink-soft */
  --accent: #edE7f8;
  --accent-foreground: #8768bc;
  --destructive: #c76e93; /* coral profundo — erro de form, nunca vermelho */
  --border: #eae2f4; /* hairline */
  --input: #eae2f4;
  --ring: #a78bd0; /* lilac */
  --radius: 1rem; /* 16px = control */
}

/* ---- Tokens Bloomy (utilitários bg-/text-/border-<nome>) ---- */
@theme {
  --color-lilac: #a78bd0;
  --color-lilac-deep: #8768bc;
  --color-lilac-tint: #ede7f8;
  --color-lilac-tint-soft: #f4effa;

  --color-pink: #f3b6d0;
  --color-pink-deep: #c76e9e;
  --color-pink-bright: #e08ab0;
  --color-pink-tint: #fbeaf2;

  --color-green: #a8d5ba;
  --color-green-deep: #4e9c74;
  --color-green-mid: #7fc4a0;
  --color-green-tint: #e6f4ec;
  --color-green-tint-soft: #eaf5ef;

  --color-coral: #c77e93;
  --color-coral-tint: #fbecef;

  --color-bg: #fbfafe;
  --color-board: #e9e2f3;

  --color-ink: #3b3552;
  --color-ink-soft: #8a82a0;
  --color-ink-faint: #a79fb8;
  --color-ink-read: #6f6787; /* corpo pequeno AA sobre bg */

  --color-nav-inactive: #b3abc4;
  --color-control-off: #e2d8f0;
  --color-ring-track: #ddd1ef;
  --color-hairline: #eae2f4;
  --color-hairline-soft: #f1ebf8;

  --radius-control: 16px;
  --radius-card: 20px;
  --radius-card-lg: 26px;
  --radius-sheet: 28px;

  --shadow-card: 0 6px 18px rgba(120, 86, 164, 0.06);
  --shadow-card-sm: 0 5px 16px rgba(120, 86, 164, 0.05);
  --shadow-btn: 0 8px 20px rgba(167, 139, 208, 0.35);
  --shadow-sheet: 0 -12px 40px rgba(59, 53, 82, 0.25);
  --shadow-device: 0 22px 50px rgba(120, 86, 164, 0.16);

  --font-display: var(--font-quicksand);
  --font-sans: var(--font-nunito);
}

/* ---- Mapa dos tokens semânticos p/ os componentes shadcn ---- */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-nunito), system-ui, sans-serif;
  }
}
```

> Removido: bloco `.dark`, `@custom-variant dark`, tokens `--chart-*` e `--sidebar-*`
> (não usados no produto) e `--font-sans: "Inter Variable"`.

- [ ] **Step 2: Redirect raiz**

Substituir `apps/web/src/app/page.tsx` inteiro por:

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/home");
}
```

- [ ] **Step 3: Verificar visualmente o fundo/board**

Run: `bun dev:web` (da raiz) e abrir `http://localhost:3001/` — deve redirecionar para
`/home` (ainda 404 até a Task 4). O objetivo aqui é só confirmar que **não há erro de
build do CSS**. Checar no terminal do dev server: sem erro de Tailwind/`@theme`.

- [ ] **Step 4: check-types + commit**

Run (da raiz): `bun check-types`
Expected: sem erros.

```bash
git add packages/ui/src/styles/globals.css apps/web/src/app/page.tsx
git commit -m "feat(front): re-tokeniza globals com a paleta Bloomy e remove dark mode"
```

---

### Task 3: Client REST (`lib/api.ts`) + hook `useResource`

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/api.test.ts`
- Create: `apps/web/src/lib/use-resource.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number }`
  - `api.get<T>(path): Promise<T>` · `api.post<T>(path, body?): Promise<T>` ·
    `api.put<T>(path, body?): Promise<T>` · `api.patch<T>(path, body?): Promise<T>` ·
    `api.del<T>(path): Promise<T>` — todos rejeitam com `ApiError(status, body.error)`
    em resposta não-ok; retornam `undefined` em 204.
  - `useResource<T>(fetcher: () => Promise<T>): { data: T | null; error: Error | null;
    loading: boolean; reload: () => void; setData: (v: T) => void }` — busca no mount.

- [ ] **Step 1: Escrever o teste do client (falhando)**

Criar `apps/web/src/lib/api.test.ts`:

```ts
import { afterEach, describe, expect, it, mock } from "bun:test";

import { ApiError, api } from "./api";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = mock(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as typeof fetch;
}

describe("api client", () => {
  it("retorna o JSON parseado em 200", async () => {
    mockFetch(200, { totalMl: 250 });
    const data = await api.get<{ totalMl: number }>("/api/water");
    expect(data.totalMl).toBe(250);
  });

  it("lança ApiError com a mensagem de {error} em resposta não-ok", async () => {
    mockFetch(409, { error: "já marcada" });
    let caught: unknown;
    try {
      await api.post("/api/intakes", { medicationId: "x", time: "09:00" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
    expect((caught as ApiError).message).toBe("já marcada");
  });

  it("retorna undefined em 204", async () => {
    mockFetch(204, undefined);
    const data = await api.del("/api/meals/1");
    expect(data).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run (de `apps/web`): `bun test src/lib/api.test.ts`
Expected: FAIL — `Cannot find module "./api"`.

- [ ] **Step 3: Implementar `lib/api.ts`**

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* corpo não-JSON: mantém statusText */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  return fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((res) => handle<T>(res));
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body),
  put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, "PATCH", body),
  del: <T>(path: string) => request<T>(path, "DELETE"),
};
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run (de `apps/web`): `bun test src/lib/api.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Implementar o hook `useResource`**

Criar `apps/web/src/lib/use-resource.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useResource<T>(fetcher: () => Promise<T>) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetcherRef
      .current()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
```

> `fetcherRef` evita re-disparo por identidade instável do `fetcher` inline;
> a busca roda uma vez no mount, e `reload()` re-busca após mutações.

- [ ] **Step 6: check-types + commit**

Run (da raiz): `bun check-types`

```bash
git add apps/web/src/lib/api.ts apps/web/src/lib/api.test.ts apps/web/src/lib/use-resource.ts
git commit -m "feat(front): client REST tipado e hook useResource"
```

---

### Task 4: App shell — route group `(app)`, auth-gate, `/login` stub e 5 skeletons

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx` (server — auth-gate + tab bar)
- Create: `apps/web/src/components/screen.tsx` (wrapper de tela + skeleton)
- Create: `apps/web/src/app/(app)/home/page.tsx`
- Create: `apps/web/src/app/(app)/corpo/page.tsx`
- Create: `apps/web/src/app/(app)/treino/page.tsx`
- Create: `apps/web/src/app/(app)/mente/page.tsx`
- Create: `apps/web/src/app/(app)/saude/page.tsx`
- Create: `apps/web/src/app/login/page.tsx` (stub — F10 substitui)

**Interfaces:**
- Consumes: `auth` de `@bloomy/auth`; `<TabBar/>` (Task 5 — importar já; o arquivo é
  criado lá, mas esta task pode criar um stub temporário e a Task 5 o substitui).
- Produces: `<Screen title subtitle>` e `<ScreenSkeleton>` de `components/screen.tsx`.

> **Ordem prática:** faça a Task 5 (TabBar) **antes** do Step 2 desta task, ou crie o
> `tab-bar.tsx` como stub aqui e finalize na Task 5. O plano assume TabBar já existe.

- [ ] **Step 1: Wrapper de tela + skeleton**

Criar `apps/web/src/components/screen.tsx`:

```tsx
import type { ReactNode } from "react";

export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-[22px] pt-6 pb-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
        {subtitle ? (
          <p className="text-[13px] font-semibold text-ink-read">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 px-[22px] pt-6">
      <div className="h-7 w-40 animate-pulse rounded-control bg-lilac-tint" />
      <div className="h-24 w-full animate-pulse rounded-card bg-lilac-tint-soft" />
      <div className="h-24 w-full animate-pulse rounded-card bg-lilac-tint-soft" />
      <p className="pt-2 text-center text-[11px] font-bold text-ink-faint">
        {label} · em breve
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Layout do route group com auth-gate + tab bar**

Criar `apps/web/src/app/(app)/layout.tsx`:

```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@bloomy/auth";

import { TabBar } from "@/components/tab-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-2">{children}</main>
      <TabBar />
    </div>
  );
}
```

> `@/*` já aponta para `apps/web/src/*` (tsconfig do Next). Confirmar o alias em
> `apps/web/tsconfig.json`; se não existir, usar caminho relativo.
>
> **Decisão (execução F3):** o gate acima fica **desligado** durante F3–F9 (comentado
> com `TODO(F10)`) para permitir navegar as telas em dev sem login — a **F10 reativa**.
> O layout então não é `async` e não importa `headers`/`redirect`/`auth`.

- [ ] **Step 3: As 5 telas skeleton**

Criar cada arquivo abaixo (mesma forma, `label` diferente):

`apps/web/src/app/(app)/home/page.tsx`:

```tsx
import { ScreenSkeleton } from "@/components/screen";

export default function HomePage() {
  return <ScreenSkeleton label="Home" />;
}
```

`apps/web/src/app/(app)/corpo/page.tsx` → `label="Corpo"`
`apps/web/src/app/(app)/treino/page.tsx` → `label="Treino"`
`apps/web/src/app/(app)/mente/page.tsx` → `label="Mente"`
`apps/web/src/app/(app)/saude/page.tsx` → `label="Saúde"`

(cada um com o mesmo corpo, trocando o nome do componente `CorpoPage`/`TreinoPage`/… e o `label`.)

- [ ] **Step 4: Stub de `/login`**

Criar `apps/web/src/app/login/page.tsx`:

```tsx
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="grid size-[78px] place-items-center rounded-[24px] bg-lilac text-white shadow-btn">
        <span className="font-display text-3xl font-bold">B</span>
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">Bloomy</h1>
      <p className="text-[13px] font-semibold text-ink-read">
        Tela de login — implementada na Fase 10.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Verificar o gate + navegação**

Run: `bun dev:web`. Sem sessão, abrir `http://localhost:3001/home` → redireciona para
`/login` (mostra o stub). Criar uma sessão de teste (email/senha via better-auth — usar
o mesmo fluxo dos testes de back, ou registrar por
`POST /api/auth/sign-up/email`), depois abrir `/home` → renderiza o skeleton com a tab bar.

- [ ] **Step 6: check-types + commit**

Run (da raiz): `bun check-types`

```bash
git add "apps/web/src/app/(app)" apps/web/src/app/login apps/web/src/components/screen.tsx
git commit -m "feat(front): route group (app) com auth-gate, skeletons e login stub"
```

---

### Task 5: TabBar (5 abas, Phosphor Fill/Regular)

**Files:**
- Create: `apps/web/src/components/tab-bar.tsx`

**Interfaces:**
- Consumes: `usePathname` (next/navigation); `@phosphor-icons/react`.
- Produces: `<TabBar/>` usado por `app/(app)/layout.tsx`.

- [ ] **Step 1: Implementar a TabBar**

Criar `apps/web/src/components/tab-bar.tsx`:

```tsx
"use client";

import {
  BarbellIcon,
  FirstAidKitIcon,
  HeartbeatIcon,
  HouseIcon,
  SmileyIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; Icon: Icon }[] = [
  { href: "/home", label: "Home", Icon: HouseIcon },
  { href: "/corpo", label: "Corpo", Icon: HeartbeatIcon },
  { href: "/treino", label: "Treino", Icon: BarbellIcon },
  { href: "/mente", label: "Mente", Icon: SmileyIcon },
  { href: "/saude", label: "Saúde", Icon: FirstAidKitIcon },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex items-stretch justify-around border-t border-hairline-soft bg-white px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5"
          >
            <Icon
              size={24}
              weight={active ? "fill" : "regular"}
              className={active ? "text-lilac-deep" : "text-nav-inactive"}
            />
            <span
              className={
                active
                  ? "text-[10px] font-extrabold text-lilac-deep"
                  : "text-[10px] font-semibold text-nav-inactive"
              }
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Verificar a tab bar**

Run: `bun dev:web`, navegar entre `/home`, `/corpo`, `/treino`, `/mente`, `/saude`:
a aba ativa fica lilás-profundo com ícone **Fill**; inativas cinza-nav com ícone Regular.
Borda superior `hairline-soft`, fundo branco.

- [ ] **Step 3: check-types + commit**

Run (da raiz): `bun check-types`

```bash
git add apps/web/src/components/tab-bar.tsx
git commit -m "feat(front): bottom tab bar com Phosphor fill/regular"
```

---

### Task 6: Primitivos parte 1 — IconChip, ProgressBar, ChoiceChip, Stepper, Toggle

**Files:**
- Create: `packages/ui/src/components/icon-chip.tsx`
- Create: `packages/ui/src/components/progress-bar.tsx`
- Create: `packages/ui/src/components/choice-chip.tsx`
- Create: `packages/ui/src/components/stepper.tsx`
- Create: `packages/ui/src/components/toggle-switch.tsx`

**Interfaces:**
- Produces (import `@bloomy/ui/components/<arquivo>`):
  - `<IconChip tone icon variant? size? />` — `tone: "lilac"|"green"|"pink"|"coral"`,
    `variant: "tint"|"white"` (default `tint`).
  - `<ProgressBar value />` — `value: 0..1`.
  - `<ChoiceChip tone? selected onClick>{label}</ChoiceChip>`.
  - `<Stepper value min max step? onChange unit? />` — número grande Quicksand.
  - `<ToggleSwitch checked onCheckedChange />` — 46×27.

- [ ] **Step 1: Mapa de tons compartilhado**

Criar `packages/ui/src/lib/tone.ts`:

```ts
export type Tone = "lilac" | "green" | "pink" | "coral";

/** Classes por tom: fundo tint, fundo cheio, texto profundo. Estáticas (Tailwind não
 *  varre string concatenada — cada classe aparece literal aqui). */
export const TONE: Record<Tone, { tint: string; solid: string; deep: string }> = {
  lilac: { tint: "bg-lilac-tint", solid: "bg-lilac", deep: "text-lilac-deep" },
  green: { tint: "bg-green-tint", solid: "bg-green-mid", deep: "text-green-deep" },
  pink: { tint: "bg-pink-tint", solid: "bg-pink-bright", deep: "text-pink-deep" },
  coral: { tint: "bg-coral-tint", solid: "bg-coral", deep: "text-coral" },
};
```

- [ ] **Step 2: IconChip**

Criar `packages/ui/src/components/icon-chip.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";
import { TONE, type Tone } from "@bloomy/ui/lib/tone";

export function IconChip({
  tone,
  icon,
  variant = "tint",
  className,
}: {
  tone: Tone;
  icon: ReactNode;
  variant?: "tint" | "white";
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "grid size-[42px] shrink-0 place-items-center rounded-[14px]",
        variant === "white" ? "bg-white" : t.tint,
        t.deep,
        className,
      )}
    >
      {icon}
    </span>
  );
}
```

> O ícone Phosphor é passado pelo consumidor com `weight="fill"` e herda a cor via
> `currentColor` (o `t.deep` define `color`). Ex.:
> `<IconChip tone="lilac" icon={<DropIcon size={22} weight="fill" />} />`.

- [ ] **Step 3: ProgressBar**

Criar `packages/ui/src/components/progress-bar.tsx`:

```tsx
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ring-track">
      <div
        className="h-full rounded-full bg-lilac transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

> Nota de convenção: pill = 999px é `rounded-full` (Tailwind v4 já provê); **não** criar
> token `rounded-pill`. Vale para todos os primitivos.

- [ ] **Step 4: ChoiceChip**

Criar `packages/ui/src/components/choice-chip.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";
import { TONE, type Tone } from "@bloomy/ui/lib/tone";

export function ChoiceChip({
  tone = "lilac",
  selected,
  onClick,
  children,
}: {
  tone?: Tone;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-[36px] rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
        selected ? cn(t.solid, "text-white") : cn("bg-lilac-tint-soft", t.deep),
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Stepper**

Criar `packages/ui/src/components/stepper.tsx`:

```tsx
"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  unit?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="grid size-12 place-items-center rounded-full bg-lilac-tint text-lilac-deep disabled:text-ink-faint"
      >
        <MinusIcon size={22} weight="bold" />
      </button>
      <div className="flex flex-col items-center">
        <span className="font-display text-4xl font-bold text-ink">{value}</span>
        {unit ? <span className="text-[13px] font-semibold text-ink-read">{unit}</span> : null}
      </div>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="grid size-12 place-items-center rounded-full bg-lilac text-white shadow-btn disabled:opacity-60"
      >
        <PlusIcon size={22} weight="bold" />
      </button>
    </div>
  );
}
```

- [ ] **Step 6: ToggleSwitch**

Criar `packages/ui/src/components/toggle-switch.tsx`:

```tsx
"use client";

import { cn } from "@bloomy/ui/lib/utils";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-[27px] w-[46px] shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
        checked ? "bg-lilac" : "bg-control-off",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[21px] rounded-full bg-white shadow-card-sm transition-[left] duration-200 motion-reduce:transition-none",
          checked ? "left-[22px]" : "left-[3px]",
        )}
      />
    </button>
  );
}
```

- [ ] **Step 7: check-types + commit**

Run (da raiz): `bun check-types`

```bash
git add packages/ui/src/lib/tone.ts packages/ui/src/components/icon-chip.tsx packages/ui/src/components/progress-bar.tsx packages/ui/src/components/choice-chip.tsx packages/ui/src/components/stepper.tsx packages/ui/src/components/toggle-switch.tsx
git commit -m "feat(ui): primitivos Bloomy — IconChip, ProgressBar, ChoiceChip, Stepper, ToggleSwitch"
```

---

### Task 7: Primitivos parte 2 — MoodTiles + BottomSheet

**Files:**
- Create: `packages/ui/src/components/bottom-sheet.tsx` (componente **nosso** sobre `vaul`)
- Create: `packages/ui/src/components/mood-tiles.tsx`

> **D5 (spec `2026-07-07-front-design.md`):** componentes shadcn são imutáveis — não
> geramos `drawer.tsx` nem editamos nada em `packages/ui/src/components/*` do shadcn. O
> `BottomSheet` é construído direto sobre `vaul` (dep adicionada na Task 1), com controle
> total do grabber/overlay/raio.

**Interfaces:**
- Produces:
  - `<MoodTiles value onChange />` — `value: number | null` (0..4), 5 faces Phosphor.
  - `<BottomSheet open onOpenChange title icon tone footer>{children}</BottomSheet>` —
    sheet ancorado embaixo, grabber, header com IconChip, botão primário do domínio.

- [ ] **Step 1: BottomSheet sobre `vaul` (componente nosso, sem shadcn)**

Criar `packages/ui/src/components/bottom-sheet.tsx`. Constrói o grabber, o overlay
`rgba(43,38,64,.42)`, o raio de topo 28px (`rounded-t-sheet`) e a `shadow-sheet` à mão —
nenhum arquivo shadcn é gerado ou tocado:

```tsx
"use client";

import type { ReactNode } from "react";

import { Drawer } from "vaul";

import { IconChip } from "@bloomy/ui/components/icon-chip";
import type { Tone } from "@bloomy/ui/lib/tone";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  icon,
  tone,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  tone: Tone;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[#2b2640]/[0.42]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[420px] flex-col rounded-t-sheet bg-white shadow-sheet outline-none"
        >
          <div className="mx-auto mt-2 mb-1 h-[5px] w-10 shrink-0 rounded-full bg-control-off" />
          <div className="flex items-center gap-3 px-[22px] pt-2">
            <IconChip tone={tone} icon={icon} />
            <Drawer.Title className="font-display text-lg font-bold text-ink">
              {title}
            </Drawer.Title>
          </div>
          <div className="flex flex-col gap-4 px-[22px] pt-4 pb-2">{children}</div>
          {footer ? (
            <div className="px-[22px] pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

> `vaul` já entrega drag-to-dismiss e trava de scroll. `Drawer.Title` é obrigatório para
> a11y. `aria-describedby={undefined}` silencia o warning de descrição ausente. O overlay
> usa o hex literal do design (`#2b2640` a 42%) — sem depender de token semântico.

- [ ] **Step 2: MoodTiles**

Criar `packages/ui/src/components/mood-tiles.tsx`:

```tsx
"use client";

import {
  HeartIcon,
  type Icon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
  SmileyWinkIcon,
} from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

const FACES: { Icon: Icon; label: string }[] = [
  { Icon: SmileySadIcon, label: "Triste" },
  { Icon: SmileyMehIcon, label: "Neutro" },
  { Icon: SmileyIcon, label: "Bem" },
  { Icon: SmileyWinkIcon, label: "Ótimo" },
  { Icon: HeartIcon, label: "Radiante" },
];

export function MoodTiles({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex justify-between">
      {FACES.map(({ Icon, label }, i) => {
        const selected = value === i;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onChange(i)}
            className={cn(
              "grid size-[52px] place-items-center rounded-[16px] transition-colors",
              selected ? "bg-lilac shadow-btn" : "bg-lilac-tint-soft",
            )}
          >
            <Icon
              size={28}
              weight="fill"
              className={selected ? "text-white" : "text-[#c7beda]"}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: check-types + commit**

Run (da raiz): `bun check-types`

```bash
git add packages/ui/src/components/bottom-sheet.tsx packages/ui/src/components/mood-tiles.tsx
git commit -m "feat(ui): MoodTiles e BottomSheet (sobre vaul, sem editar shadcn)"
```

---

### Task 8: Rota de preview + verificação visual da fase

**Files:**
- Create: `apps/web/src/app/preview/page.tsx` (referência viva dos primitivos; fora do gate)

> ⚠️ **Não usar `_preview`**: no Next App Router, pastas com prefixo `_` são _private
> folders_ e ficam **fora do roteamento** (a rota dá 404). Usar `preview` (sem underscore).

**Interfaces:**
- Consumes: todos os primitivos das Tasks 6–7.

- [ ] **Step 1: Página de preview**

Criar `apps/web/src/app/preview/page.tsx`:

```tsx
"use client";

import { DropIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { BottomSheet } from "@bloomy/ui/components/bottom-sheet";
import { ChoiceChip } from "@bloomy/ui/components/choice-chip";
import { IconChip } from "@bloomy/ui/components/icon-chip";
import { MoodTiles } from "@bloomy/ui/components/mood-tiles";
import { ProgressBar } from "@bloomy/ui/components/progress-bar";
import { Stepper } from "@bloomy/ui/components/stepper";
import { ToggleSwitch } from "@bloomy/ui/components/toggle-switch";

export default function PreviewPage() {
  const [mood, setMood] = useState<number | null>(2);
  const [ml, setMl] = useState(250);
  const [freq, setFreq] = useState(1);
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <MoodTiles value={mood} onChange={setMood} />
      <div className="flex gap-2">
        <IconChip tone="lilac" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="green" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="pink" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="coral" icon={<DropIcon size={22} weight="fill" />} />
      </div>
      <ProgressBar value={0.62} />
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <ChoiceChip key={n} selected={freq === n} onClick={() => setFreq(n)}>
            {n}x
          </ChoiceChip>
        ))}
      </div>
      <Stepper value={ml} min={0} max={1000} step={50} onChange={setMl} unit="ml" />
      <ToggleSwitch checked={on} onCheckedChange={setOn} label="Lembrete" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-lilac px-5 py-3 font-display font-bold text-white shadow-btn"
      >
        Abrir sheet
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Adicionar água"
        tone="lilac"
        icon={<DropIcon size={22} weight="fill" />}
        footer={
          <button className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn">
            Registrar
          </button>
        }
      >
        <Stepper value={ml} min={0} max={1000} step={50} onChange={setMl} unit="ml" />
      </BottomSheet>
    </div>
  );
}
```

- [ ] **Step 2: Verificação visual da fase (obrigatória)**

Run: `bun dev:web`. Abrir `http://localhost:3001/preview` e conferir contra `DESIGN.md`:

- [ ] Fundo do card é branco sobre `bg` (`#FBFAFE`); board lilás aparece nas laterais no desktop.
- [ ] MoodTiles: selecionado lilás cheio + ícone branco + sombra de botão; demais tint com ícone `#C7BEDA`.
- [ ] IconChip: cada tom com fundo tint + ícone na cor profunda do matiz.
- [ ] ProgressBar em 62% preenche lilás sobre trilho `ring-track`.
- [ ] ChoiceChip selecionado = cheio + texto branco.
- [ ] Stepper: número grande em Quicksand; botão `+` lilás com sombra, `−` tint.
- [ ] ToggleSwitch: ON trilho lilás com knob à direita; OFF `control-off` à esquerda.
- [ ] BottomSheet: ancora embaixo, cantos 28px topo, grabber `control-off`, overlay escurece, botão primário lilás.

Corrigir qualquer divergência antes de fechar a fase. `bun check-types` verde **não**
substitui esta checagem visual.

- [ ] **Step 3: Navegação end-to-end**

Com sessão de teste: `/` → `/home`; percorrer as 5 abas; a tab bar destaca a ativa.
Sem sessão: `/home` → `/login` (stub). Sem erros no console do navegador.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/preview/page.tsx
git commit -m "feat(front): rota preview dos primitivos (referência viva)"
```

---

## Verificação final da fase

Run (da raiz):

```bash
bun check-types
bun test --cwd apps/web
```

Expected: types verdes; `api.test.ts` passa (o restante da suíte de back permanece verde).

Checklist de aceitação (roadmap F3):
- [ ] Tokens Bloomy ativos (cores, raios, sombras, fontes) — verificado no `/preview`.
- [ ] Coluna mobile centrada sobre o board no desktop.
- [ ] Tab bar de 5 abas navegável, ativa em lilás-profundo com Phosphor Fill.
- [ ] Auth-gate redireciona sem sessão; passa com sessão.
- [ ] `lib/api.ts` + `useResource` prontos para as fases de tela.
- [ ] Todos os primitivos-assinatura disponíveis em `@bloomy/ui`.

## Self-review (executado na escrita do plano)

- **Cobertura vs. objetivo da F3 (roadmap):** tokens (T2), fontes (T1), Phosphor (T1),
  primitivos (T6–T7), coluna+board (T1 layout raiz), tab bar (T5), 5 rotas skeleton (T4),
  client REST + `useResource` (T3), auth-gate + `/login` stub (T4). ✔ Todos mapeados.
- **Placeholders:** nenhum "TODO/implementar depois" — todo step tem código real. A única
  ressalva honesta (alias `@/*` do tsconfig) vem com o fallback concreto (caminho relativo),
  não como lacuna.
- **D5 (shadcn imutável):** o `BottomSheet` (T7) é construído sobre `vaul` como arquivo
  nosso; a fase não gera nem edita nenhum componente shadcn. Tematização vem do `globals.css`
  (T2, `src/styles`, sancionado) e de wrappers próprios.
- **Consistência de tipos:** `Tone` definido em `lib/tone.ts` (T6) e reusado por IconChip,
  ChoiceChip e BottomSheet (T6/T7). `api`/`ApiError`/`useResource` definidos em T3 e citados
  nos Interfaces das fases seguintes. `<TabBar/>` produzido em T5 e consumido pelo layout de
  T4 (ordem sinalizada no cabeçalho da T4).
- **Convenção de pill:** todos os primitivos usam `rounded-full` para 999px (não há token
  `rounded-pill`) — nota fixada no Step 3 da T6.
- **Dependência de fase:** nada da F3 depende das telas; F4→F10 dependem de tudo daqui.
