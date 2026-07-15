# Front Mente — aba "Seu espaço" (design)

> **Revisão v2 (2026-07-15, pós-uso):** o mini-diário passa a permitir **vários relatos por
> dia** (não sobrescreve o do dia), pois a pessoa pode sentir emoções diferentes no mesmo dia.
> Cada relato guarda a **carinha do momento** + texto + horário. O card de humor e a ansiedade
> **continuam do dia** (`mood_checkin` inalterado). Ver seção "Revisão v2 — múltiplos relatos"
> no fim do documento; onde conflitar, a v2 vence.

> **Contexto:** back 100% pronto e testado (schema `mood_checkin` em `packages/db/src/schema/mind.ts`,
> serviço `apps/web/src/server/mind/service.ts`, rotas REST em `apps/web/src/app/api/checkins/**`).
> Front da aba Mente é skeleton (`app/(app)/mente/page.tsx` → `<ScreenSkeleton label="Mente" />`).
> Esta fase entrega a aba Mente de ponta a ponta contra a API existente, seguindo o padrão já
> provado nas abas Corpo (F4) e Treino (F5).
>
> Autoridade visual: `DESIGN.md` + `docs/README.md` (§5 Mente) + protótipo
> `docs/Diario App (standalone).html` (tela `data-screen-label="Mente"`). Autoridade de produto:
> `PRODUCT.md`. Convenções: `apps/web/CLAUDE.md`. Glossário: `apps/web/CONTEXT.md` (Check-in, Streak).

## Objetivo

Aba Mente funcional: **check-in do dia** (humor + ansiedade) com salvamento instantâneo,
**mini-diário** (nota do dia, salvo por botão) e lista **"Seus registros"** (histórico das notas).
Recriação fiel do hifi — **tudo inline na aba, sem bottom sheet** (diferente de Corpo/Treino).
Domínio visual misto do protótipo: **lilás** no card de humor, **rosa** (`#E08AB0`) no mini-diário
e nas datas dos registros.

## Escopo (decidido no brainstorming)

- **Salvamento:** humor e ansiedade salvam **na hora** (upsert parcial por interação); a nota
  salva no botão **"Salvar registro"**. Casa com "registro em segundos" (PRODUCT.md §3).
- **Faces de humor:** set exato da tela Mente do protótipo (`cloud-rain·smiley-sad·smiley-meh·
  smiley·sun`), mapeado ao enum `sad·meh·neutral·good·great`. **Não** reusa `mood-tiles.tsx`
  (é o set da Home + API index-based); componente novo da Mente.
- **"Seus registros":** só dias com **nota não-vazia** (é o histórico do mini-diário); data
  relativa (Hoje/Ontem/dia-da-semana até 7 dias, depois "12 jul").
- **Slider de ansiedade:** `<input type="range">` nativo estilizado (teclado/foco WCAG de graça).

Fora de escopo: widget de humor da Home ("Como você está?" + registrado ✓), card "Check-in da
mente" em Minhas metas, toggle de Lembretes, gráficos/tendências de humor. O `mood-tiles.tsx`
existente (código morto, set da Home) fica intocado para a fase da Home.

## Contratos do back (já existentes)

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/api/checkins?day=` | `{ checkin: Checkin \| null }` (day opcional = hoje, fuso BR) |
| `PUT` | `/api/checkins` | upsert parcial de hoje; body `{ mood?, anxiety?, note? }` (≥1 campo) → `{ checkin }` |
| `GET` | `/api/checkins/history?limit=` | `{ checkins: Checkin[] }` (limit 1–100, default 30, desc por `day`) |

`mood`: enum `sad·meh·neutral·good·great`. `anxiety`: int **0–100** (0 = Tranquilo total, valor
válido, não "vazio"). `note`: string ≤2000. `upsertCheckin` computa `day = dayFor()`
(America/Sao_Paulo, ADR-0002) e atualiza **só os campos enviados** via `onConflictDoUpdate` no
índice `(user_id, day)` — 1 check-in por usuário por dia. Validação zod nas rotas.

## Arquitetura (front)

Mesma organização de Corpo/Treino (`apps/web/CLAUDE.md`): `page.tsx` só renderiza; lógica em
`hooks/`; visual em `components/` da tela. Fetch via `useResource<T>` (`lib/use-resource.ts`) +
`api` (`lib/api.ts`); sem react-query/SWR. Optimistic manual + `toastError` (`lib/toast.ts`) no
catch, como `useHidratacao`.

```
app/(app)/mente/
  page.tsx                  → client; chama useMente(); monta MoodCard/AnxietyCard/DiarioCard/RegistrosList
  hooks/
    useMente.ts             → GET /api/checkins (hoje) + /history; setMood/setAnxiety/saveNote otimistas
  components/
    MoodCard.tsx            → card tint lilás: "Como você está se sentindo agora?" + 5 faces
    AnxietyCard.tsx         → card branco: "E a ansiedade hoje?" + slider degradê verde→rosa
    DiarioCard.tsx          → card tint rosa: copy + textarea + botão "Salvar registro"
    RegistrosList.tsx       → "Seus registros": cards (data relativa + face colorida + trecho)
```

Novos tipos em `lib/api-types.ts` (espelham o serviço; datas como string ISO):

```ts
export type Mood = "sad" | "meh" | "neutral" | "good" | "great";
export interface Checkin {
  id: string;
  day: string;            // YYYY-MM-DD
  mood: Mood | null;
  anxiety: number | null; // 0–100
  note: string | null;
  createdAt: string;      // ISO
  updatedAt: string;
}
```

Mapa de faces (posição worst→best, casando com o enum), em módulo compartilhado da tela:

| enum | ícone Phosphor Fill | cor do ícone no registro (valência) |
|---|---|---|
| `sad` | `cloud-rain` | `#C76E9E` (rosa profundo) |
| `meh` | `smiley-sad` | `#D6A96B` (âmbar) |
| `neutral` | `smiley-meh` | `#D6A96B` (âmbar) |
| `good` | `smiley` | `#7FC4A0` (verde médio) |
| `great` | `sun` | `#4E9C74` (verde profundo) |

## Fluxo de dados (hook `useMente`)

- **Mount:** `GET /api/checkins` (checkin de hoje) + `GET /api/checkins/history?limit=30` — dois
  `useResource`. Pré-preenche face/slider/nota se já houve check-in hoje.
- **Tocar face:** seleção otimista em `today.mood` + `PUT { mood }`. A resposta `{ checkin }`
  substitui `today` e faz **merge por `day`** na lista de history (upsert local) — sem GET extra.
- **Slider:** `onChange` move o knob e atualiza estado local (live); persiste **ao soltar**
  (`onPointerUp` + `onKeyUp`) via `PUT { anxiety }`. Sem valor salvo hoje → knob em **50** (neutro),
  só persiste após interação real do usuário.
- **"Salvar registro":** `PUT { note }`; botão desabilitado com textarea vazia **ou** sem
  alteração vs. a nota já salva. Resposta entra na lista → nota aparece em "Seus registros".
- Todas as mutações: **otimista → merge da resposta do PUT em `today` + `history`**; no catch,
  rollback ao estado anterior + `toastError`. Usar a resposta do PUT evita reload e mantém o
  ícone/nota do dia sincronizados na lista.

## Fidelidade visual (handoff — tela `data-screen-label="Mente"`)

Scroll container `padding: 12px 22px 18px`. Ordem topo→baixo:

1. **Título:** "Seu espaço" (Quicksand 700, 24px, `#3B3552`) + subtítulo "Sem pressa e sem
   cobrança. Só um lugar pra registrar como você está." (Nunito 600, 13px, `#8A82A0`; escurecer
   p/ ~`#6F6787` se abaixo de AA — Do's do DESIGN.md).
2. **Card de humor** (`bg #EDE7F8` lilás tint, `rounded-card-lg` 24px, `padding 18px`): heading
   "Como você está se sentindo agora?" (Quicksand 700, 15px) + fileira de **5 tiles 50×50 r16**
   `justify-between`. Selecionado = `bg-lilac` + ícone branco 26px + `shadow-btn`; repouso =
   `bg-white` + ícone `#C7BEDA` 24px. **Sem "registrado ✓"** (o hifi da Mente não tem; a seleção
   é o feedback).
3. **Card de ansiedade** (branco, r22, `shadow-card`): heading "E a ansiedade hoje?" + slider
   (track 8px r5, `linear-gradient(90deg,#A8D5BA,#F3B6D0)`; knob 22×22 branco, `border 3px #A78BD0`,
   `shadow 0 3px 8px rgba(120,86,164,.25)`) + rótulos "Tranquilo"/"Agitado" (Nunito 600, 12px,
   `#8A82A0`, space-between).
4. **Mini-diário:** label "Mini-diário" (Quicksand 700, 15px) + card (`bg #FBEAF2` rosa tint, r22,
   p16): copy "Quer escrever o que passou pela sua cabeça? Fica só entre vocês dois." + textarea
   (branco, r14, `padding 12px 14px`, placeholder "Escreva o que vier...", `min-height 52px`) +
   botão "Salvar registro" (`bg #E08AB0`, branco, r13, `padding 11px`, Quicksand 700 14px).
5. **Seus registros:** label + lista `gap 10px`; cada card branco r18 p14 `shadow 0 5px 14px
   rgba(120,86,164,.05)`: linha 1 = data relativa (Quicksand 700, 13px, `#8768BC`) + face colorida
   por valência (18px, à direita); linha 2 = trecho da nota (Nunito 400/600, 13px, `#6B6386`).
   **Vazio** (sem notas): card neutro acolhedor ("Seus registros vão aparecer aqui…"),
   nunca cobrança.

Ícones: Phosphor **Fill**. Tokens via classes Tailwind do `@theme` (`bg-lilac`, `text-pink-deep`,
`rounded-card`, `shadow-btn`); cor por domínio via `lib/tone.ts` onde aplicável.

## Erros / edge cases

- **3 PUTs/dia** (face + slider + nota) são seguros: upsert parcial no back preserva campos não
  enviados.
- **Slider não persiste no drag**, só no release (`pointerup`/`keyup`) — evita flood de requests.
- **`anxiety = 0` é válido** (Tranquilo total): não tratar `0` como null no pré-preenchimento nem
  no "há valor salvo?".
- **Face alterada após já ter nota:** o ícone na lista atualiza via merge da resposta do PUT por
  `day` (sem reload).
- **Regra Sem-Vermelho:** pendência/erro neutro; erro de form (se houver) usa coral `#C76E9E`,
  nunca vermelho de sistema.
- **`prefers-reduced-motion`:** seleção de face sem animação de escala (corte seco).
- **401 (sessão):** as rotas exigem sessão; erro de fetch cai no `toastError` padrão.

## Testes (TDD, cobertura nos pontos críticos — `apps/web/CLAUDE.md`)

- `useMente`: `setMood` otimista + merge da resposta em `today`/`history`; rollback no erro;
  `anxiety = 0` preservado (não vira null); `saveNote` insere/atualiza a entrada do dia na lista.
- util de data relativa: hoje→"Hoje", ontem→"Ontem", ≤7 dias→dia-da-semana, senão→"12 jul".
- filtro de registros: só entradas com `note` não-vazia (trim).
- mapa de faces: enum ↔ ícone/posição worst→best.

## Aceitação

`bun check-types` verde **e** verificação visual real na porta 3001: tocar face persiste na hora
(recarregar mantém seleção); mexer slider e soltar persiste ansiedade; escrever nota + "Salvar
registro" faz a nota aparecer em "Seus registros"; recriar check-in de outro dia via histórico
reflete data relativa correta. `check-types` verde ≠ UI funcionando.

---

## Revisão v2 — múltiplos relatos por dia

**Motivação:** o mini-diário original era 1 nota/dia (campo `note` no `mood_checkin`, upsert).
A pessoa pode sentir emoções diferentes ao longo do mesmo dia — cada save deve **criar um novo
relato**, nunca sobrescrever.

**Decisões:** cada relato guarda a **carinha do momento** (snapshot do humor selecionado) + texto
+ horário; **humor e ansiedade continuam do dia** (o `mood_checkin` fica como está — estado geral
de hoje, feed do tile Hoje e da meta `mind`).

### Back-end (novo)

- **Schema `mind_note`** (`packages/db/src/schema/mind.ts`) — vários por (usuário, dia):
  `id` PK uuid · `userId` FK user cascade · `day` text `YYYY-MM-DD` · `mood` enum nullable
  (snapshot) · `note` text **not null** · `createdAt` timestamp_ms. Índice `(user_id, created_at)`.
  Sem unique — múltiplos/dia. Migration aditiva via `bun db:generate` (usuária roda `db:migrate`).
- **`mood_checkin` inalterado.** A coluna `note` do check-in fica vestigial (front para de usá-la;
  sem migration destrutiva).
- **Serviço** (`server/mind/service.ts`): `createNote(db, userId, { note, mood? }): Promise<MindNote>`
  (dia = `dayFor()`, insert, retorna) e `listNotes(db, userId, limit): Promise<MindNote[]>`
  (desc por `createdAt`). `upsertCheckin`/`getCheckin` seguem para humor/ansiedade.
- **Rotas** (`app/api/checkins/notes/route.ts`): `POST` `{ note, mood? }` → `{ note }` 201 (cria);
  `GET ?limit=` → `{ notes: MindNote[] }`. A rota antiga `/api/checkins/history` deixa de ser
  usada pelo front (pode ficar).

### Front

- **DTO** `MindNote` em `lib/api-types.ts`: `{ id, day, mood: Mood|null, note, createdAt }` (ISO).
- **`useMente`**: `today` (mood_checkin) e `setMood`/`setAnxiety` seguem via `/api/checkins`.
  `records` vem de `GET /api/checkins/notes?limit=30`. `saveNote(text): Promise<boolean>` faz
  `POST /api/checkins/notes { note, mood: today?.mood ?? null }`, dá **prepend** do relato criado
  na lista; retorna `true` no sucesso, `false` (+ toast) no erro. `saveNote` não toca mais em
  `mood_checkin`. Remover `mergeCheckin`/`notesOnly` (não usados).
- **`DiarioCard`**: vira caixa de composição (sem prop `note`). Botão habilitado quando há texto
  (trim); ao salvar, `await onSave(trim)` e **limpa o textarea só se `true`** (não perde texto se
  o POST falhar). Permite escrever outro relato em seguida.
- **`RegistrosList`**: recebe `MindNote[]`; cada card mostra **data relativa · hora** (`relativeDay`
  + novo helper `timeOf`) + carinha do relato (se houver) + trecho (`line-clamp-2`). Vários por dia.
- **Helper `timeOf(createdAt): string`** em `mente-helpers.ts` → "HH:mm" em `America/Sao_Paulo`
  (testável). `MOOD_ORDER`/`MOOD_RECORD_COLOR`/`relativeDay` seguem.

### Testes

- Serviço: `createNote` cria vários no mesmo dia sem sobrescrever (length cresce); `listNotes`
  ordena desc por `createdAt` (inserir com `createdAt` explícito distinto p/ ordem determinística).
- `timeOf`: ISO UTC → "HH:mm" BR (ex.: `...T17:32:00Z` → "14:32").

### Aceitação (v2)

`bun check-types` verde · `bun db:generate` gera a migration do `mind_note` · `bun test
--conditions react-server` verde · `bun run build` PASS. Visual: salvar dois relatos no mesmo dia
com humores diferentes → ambos aparecem em "Seus registros", cada um com sua carinha e hora, o
campo limpa após salvar, nada é sobrescrito.
