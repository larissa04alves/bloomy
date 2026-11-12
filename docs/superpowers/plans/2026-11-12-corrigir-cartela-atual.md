# Corrigir cartela atual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a cartela atual (início e pílulas tomadas) num drawer próprio aberto a partir de "Seu método", para marcar pílulas tomadas e esquecidas no app.

**Architecture:** Serviço novo `setPillsTakenInPack` grava "tomei N desta cartela" de forma atômica (marca 1..N, desmarca o resto até hoje), exposto em `PUT /api/cycle/pill`. No Perfil, o link "Corrigir cartela atual" do `CycleMethodSheet` vira um botão suave que troca para o drawer `CartelaAtualSheet` (estado no `usePerfil`); salvar manda a posição pelo `PUT /api/cycle/method` existente só se ela mudou, e a contagem pelo endpoint novo só se ela mudou.

**Tech Stack:** Next.js 16, Drizzle/libsql, zod, vaul (`BottomSheet`), `bun test`.

**Spec:** seção "Design aprovado" abaixo (mockups em `.superpowers/brainstorm/461220-1794490367/content/drawer-cartela.html` e `botao-cartela-v2.html`).

## Design aprovado

- **Por quê:** ela toma a pílula e às vezes esquece de marcar; o app mostra a bolinha tracejada ("sem marcação") como se não tivesse tomado. A posição da cartela já não se desloca por marcação esquecida (`pillPosition` não lê marcações); falta só corrigir as marcações de dias passados.
- **Onde:** dentro de "Seu método" (Perfil → Ciclo → ✎ Método). Quem não usa pílula não vê a contagem.
- **Botão:** o `FixButton` de texto do ramo de unidades (`noun.fix`: "Corrigir cartela atual" / "anel" / "adesivo") vira botão suave pequeno: fundo `bg-peach-tint`, texto `text-peach-deep`, lápis à esquerda, mesma altura do link atual, alinhado à esquerda. O "Corrigir última menstruação" (modo natural) fica como está.
- **Drawer "Cartela atual"** (título por `UNIT_NOUN`: "Cartela atual" / "Anel atual" / "Adesivo atual"), igual às outras configurações (`BottomSheet` + footer Salvar):
  - "Começou em" — data (≤ hoje), pré-preenchida com o início da unidade atual.
  - "Qual cartela da sequência é essa?" (texto de `noun.which`) — chips, só com `pauseEvery > 1`.
  - "Pílulas tomadas" — `Stepper` 0..pílula de hoje, unidade `de {activeDays}`, dica "hoje é a {N}ª". Só pílula, só quando a data cai na fase ativa.
  - Salvar.
- **Significado do número:** só marcações. Marca da 1 até N, desmarca da N+1 até hoje. Não mexe na posição (posição muda só pela data/chips, que já reancoram via `setMethod`).
- **Aproximações consideradas:** (1) endpoint atômico "tomei N" — escolhido; (2) rota da pílula aceitar `day` passado e o client marcar dia a dia — descartado: N requests para uma ação, falha no meio deixa a cartela pela metade. Opções de UI descartadas: tocar bolinha a bolinha (complexo), contador inline na linha do Perfil, lembrete "ontem sem marcação" na tela Ciclo.
- **Fora de escopo:** pílula contínua (sem pausa → sem cartela, o botão já não aparece), pausa (contagem some), tela Ciclo (lê as mesmas marcações e se corrige sozinha).

**Calls minhas (ela pode revisar):**
- O botão fecha "Seu método" e abre "Cartela atual" (o Perfil tem um sheet por vez). Edição não salva em "Seu método" se perde na troca.
- Prévia de bolinhas no drawer ficou de fora (ela pediu mais singelo).
- Valor inicial do stepper = pílulas já marcadas na cartela (dias antes de `startedOn` contam como tomados, igual às bolinhas da tela Ciclo).

## Global Constraints

- Nunca commitar (CLAUDE.md do repo). Cada task termina com mudanças não-commitadas.
- Telas em PT, código em EN; `page.tsx` só renderiza, lógica no `usePerfil`.
- Tamanho de texto só pela escala nomeada (`text-xs`, `text-sm`…), nunca `text-[Npx]`.
- Erro de API: `{ error }` + 400 (corpo inválido) / 422 (fora da regra) / 409 (ciclo desligado).
- Rotas finas: zod → `requireUserId` → serviço.
- Testes: `bun test` rodando de `apps/web`. Teste novo só conta se visto falhando.
- `.env` do web aponta para produção: dev server e testes manuais só com `DATABASE_URL=file:<scratchpad>/bloomy.db DATABASE_AUTH_TOKEN=local BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001`.

## Review Focus

1. Cartela com âncora ("comecei a pausa" adiantada ou "emendar"): com data inalterada, o máximo e a visibilidade da contagem vêm do servidor (`scheduled.phase`/`scheduled.pill`), não da conta `hoje − início + 1`. → teste em Task 2.
2. Data alterada para depois de `activeDays` dias atrás (hoje cairia na pausa): contagem some e não é enviada. → teste em Task 2.
3. N maior que a pílula de hoje no servidor (cliente desatualizado) → 422 `out_of_range`, nada gravado. → teste em Task 1.
4. Marcações de outra pessoa e de cartelas anteriores intactas. → teste em Task 1.
5. Salvar sem mudar nada não dispara request (nem regime novo). → teste em Task 2 (`packChanges`).

---

### Task 1: Serviço e rota "tomei N desta cartela" ✅

**Files:**
- Modify: `apps/web/src/server/cycle/service.ts` (nova função perto de `setPillTaken`, ~linha 326)
- Modify: `apps/web/src/server/cycle/schemas.ts` (novo `PILL_COUNT_SCHEMA`)
- Modify: `apps/web/src/app/api/cycle/pill/route.ts` (novo `PUT`)
- Test: `apps/web/src/server/cycle/service.test.ts` (novo `describe("setPillsTakenInPack")`)

**Interfaces:**
- Produces: `setPillsTakenInPack(db: Db, userId: string, today: string, count: number): Promise<{ ok: true } | { ok: false; reason: "not_pill" | "not_active" | "out_of_range" }>`
- Produces: `PUT /api/cycle/pill` body `{ count: number }` → `{ cycle: CycleState }`; 400 corpo inválido, 409 ciclo desligado, 422 com `reason`.

- [ ] **Step 1: Testes que falham** — usar `PILL` do arquivo (ativado em `2026-11-05`, cartela 3 começou `2026-10-22`; em `2026-11-08` é a pílula 18):

```ts
describe("setPillsTakenInPack", () => {
  test("marca 1..N e desmarca o resto até hoje; cartela anterior e outra pessoa intactas", async () => {
    // userId e otherId ativados com PILL em 2026-11-05
    // pré: setPillTaken em 2026-10-21 (cartela anterior), 2026-11-07 e 2026-11-08 (userId); 2026-11-01 (otherId)
    expect(await setPillsTakenInPack(db, userId, "2026-11-08", 10)).toEqual({ ok: true });
    const state = await getCycleState(db, userId, "2026-11-08");
    expect(state?.pill?.takenDays).toEqual(daysFrom("2026-10-22", 10)); // 22/10..31/10
    expect(state?.pill?.taken).toBe(false);
    // 2026-10-21 de userId e 2026-11-01 de otherId continuam em cyclePillIntake
  });
  test("N = pílula de hoje marca hoje também", /* count 18 → taken true, 18 takenDays */);
  test("0 desmarca a cartela toda até hoje", /* takenDays [] */);
  test("N > pílula de hoje → out_of_range e nada gravado", /* count 19 */);
  test("na pausa → not_active", /* addAnchor(db, userId, "pause_started", "2026-11-08") e depois count 5 em 2026-11-08 */);
  test("pílula contínua → not_active; anel → not_pill", /* contínua: { kind: "pill", activeDays: 28, pillTime: "21:00" } */);
});
```

`daysFrom` é helper local do teste (lista de N dias a partir de uma data, com `addDays`).

- [ ] **Step 2:** `bun test src/server/cycle/service.test.ts` (de `apps/web`) → FAIL (`setPillsTakenInPack` não exportado).
- [ ] **Step 3: Implementar `setPillsTakenInPack`** — método atual precisa ser `pill` (`not_pill`) e `modeOf === "scheduled"` (senão `not_active`); `scheduledPosition(db, userId, method, today)`; `phase !== "active"` → `not_active`; `count > position.pill` → `out_of_range`. Numa transação: `delete` de `cyclePillIntake` do usuário com `day` em `[packStart, today]` (`packStart = addDays(today, -(pill - 1))`), depois `insert` dos dias `packStart .. packStart + count − 1`.
- [ ] **Step 4: Schema e rota** — `PILL_COUNT_SCHEMA = z.object({ count: z.number().int().min(0).max(PILL_ACTIVE_DAYS_LIMITS.max) })` em `schemas.ts`; `PUT` em `pill/route.ts` no padrão do `method/route.ts` (parse → `invalidBody`, `isCycleEnabled` → `conflict`, `!ok` → `unprocessable(reason)`, retorna `{ cycle }`).
- [ ] **Step 5:** `bun test src/server/cycle` → PASS; `bun check-types` (raiz) → sem erros.

### Task 2: Rascunho da cartela no Perfil (helpers puros) ✅

**Files:**
- Modify: `apps/web/src/app/(app)/perfil/hooks/format.ts`
- Test: `apps/web/src/app/(app)/perfil/hooks/format.test.ts`

**Interfaces:**
- Produces:
  - `type PackDraft = { start: string; unit: number; count: number }`
  - `packDraftFrom(cycle: CycleState, today: string): PackDraft` — `start` = início da unidade atual (ativa: `today − (pill − 1)`; pausa: `today − (pauseDay − 1) − pill`), `unit` = `scheduled.unit`, `count` = dias de `start..today` com `day < method.startedOn` ou em `pill.takenDays` (0 fora de pílula/fase ativa).
  - `packCountMax(draft: PackDraft, initial: PackDraft, cycle: CycleState, today: string): number | null` — `null` se não é pílula. Data e unidade iguais ao `initial`: `scheduled.phase === "active" ? scheduled.pill : null`. Alteradas: `n = daysBetween(draft.start, today) + 1`; `n <= method.activeDays ? n : null`.
  - `packChanges(draft: PackDraft, initial: PackDraft, max: number | null): { position: boolean; count: number | null }` — `position` = data ou unidade diferente; `count` = `min(draft.count, max)` se `max !== null` e (`position` ou `draft.count !== initial.count`), senão `null`.

- [ ] **Step 1: Testes que falham** — montar `CycleState` mínimo à mão (`scheduled`, `method.activeDays: 21`, `method.startedOn`, `pill.takenDays`):
  - `packDraftFrom` na fase ativa (pill 18 em `2026-11-08` → `start: "2026-10-22"`), na pausa (`pauseDay 3`, `pill 21` → início 23 dias antes), e com `startedOn` no meio da cartela contando os dias anteriores.
  - `packCountMax` com data igual e `phase: "pause"` mas `today − start + 1 ≤ 21` (pausa adiantada) → `null` (Review Focus 1); data alterada para 25 dias atrás → `null` (Review Focus 2); data alterada para 5 dias atrás → `5`; método `ring` → `null`.
  - `packChanges` sem mudança → `{ position: false, count: null }` (Review Focus 5); só contagem → `{ position: false, count: N }`; data mudou e `draft.count > max` → `count` limitado a `max`.
- [ ] **Step 2:** `bun test src/app/\(app\)/perfil/hooks/format.test.ts` → FAIL.
- [ ] **Step 3:** Implementar os três em `format.ts` com `addDays`/`daysBetween` de `@/server/shared/day` (client-safe).
- [ ] **Step 4:** mesmo comando → PASS.

### Task 3: Botão suave + drawer "Cartela atual" + verificação visual ✅

**Files:**
- Modify: `apps/web/src/components/cycle-method-sheet.tsx` (ramo `canFix` das unidades, ~linha 239; nova prop)
- Create: `apps/web/src/app/(app)/perfil/components/CartelaAtualSheet.tsx`
- Modify: `apps/web/src/app/(app)/perfil/hooks/usePerfil.ts` (`PerfilSheet` ganha `"currentPack"`; draft, abrir, salvar)
- Modify: `apps/web/src/app/(app)/perfil/page.tsx` (renderizar o sheet, passar `onFixPack`)

**Interfaces:**
- Consumes: Task 1 (`PUT /api/cycle/pill { count }`), Task 2 (`PackDraft`, `packDraftFrom`, `packCountMax`, `packChanges`).
- Produces:
  - `CycleMethodSheet` prop opcional `onFixPack?: () => void`. No ramo de unidades com `canFix`, se `onFixPack` existe renderiza o botão suave chamando-o; sem ele (tela `ciclo/ativar`) nada aparece. Classes do botão: `inline-flex min-h-9 items-center gap-1 self-start rounded-full bg-peach-tint px-3 text-sm font-bold text-peach-deep` + `PencilSimpleIcon weight="bold"`. Texto `noun.fix`.
  - `CartelaAtualSheet` controlado, no padrão do `AlturaSheet`: props `open`, `onOpenChange`, `title`, `draft: PackDraft`, `onChange(patch)`, `units: number` (chips só se > 1, rótulo de `UNIT_NOUN.which`), `countMax: number | null`, `activeDays: number`, `busy`, `onSave`. Campos: "Começou em" (`DatePickerField typeable tone="peach"`, `maxDate` hoje), chips da sequência, "Pílulas tomadas" (`Stepper min 0 max countMax unit={`de ${activeDays}`}`) + `text-xs` "hoje é a {countMax}ª" só com `countMax !== null`. Footer "Salvar" no estilo do footer de "Seu método" (`bg-peach … shadow-btn-peach`), "Salvando…" com `busy`.
  - `usePerfil`: `openCurrentPack()` monta `packDraft`/`packInitial` com `packDraftFrom(cycle, dayFor())` e troca o sheet para `"currentPack"`; `savePack()` usa `packChanges`: com `position`, `PUT /api/cycle/method` com `toMethodInput({ ...methodFormFromState(cycle), fixPosition: true, currentUnitStart: draft.start, currentUnit: draft.unit }, methodFormFromState(cycle))`; depois, com `count !== null`, `PUT /api/cycle/pill { count }`; guarda o último `cycle`, fecha o sheet; nada mudou → só fecha. Erro: `toastError(e, "Não foi possível salvar a cartela")`. Título do drawer: "Cartela atual" / "Anel atual" / "Adesivo atual" pelo `cycle.method.kind`.

- [ ] **Step 1:** Implementar os quatro arquivos acima.
- [ ] **Step 2:** `bun check-types` (raiz) → sem erros; `bun test` (de `apps/web`) → PASS.
- [ ] **Step 3: Verificação visual** (`/dev-up-agent-browser`, porta 3001, com os overrides de banco/auth das Global Constraints e um banco local com ciclo de pílula ativo e uma marcação faltando): em `/perfil`, ✎ Método → botão suave "Corrigir cartela atual" aparece pequeno, à esquerda → abre "Cartela atual" com data e contagem pré-preenchidas → aumentar a contagem → Salvar → `/ciclo` mostra as bolinhas antes tracejadas como tomadas. Conferir também: com anel, o drawer sem "Pílulas tomadas"; com data movida para hoje cair na pausa, a contagem some.
- [ ] **Step 4:** Parar o dev server e reportar o que ficou rodando. Sem commit.

## Desvios na execução

- `packCountMax` virou `packCountRange` (`{ min, max } | null`): o mínimo do stepper são os dias que as bolinhas já presumem tomados (antes de `startedOn`); com a data alterada o servidor regrava `startedOn` = hoje, então o mínimo vira `max − 1`. Sem isso, diminuir a contagem salvava e não aparecia em lugar nenhum.
- Novo `patchPackDraft`: mudar início/unidade desloca a contagem pela diferença de dias (recuar a data não desmarca hoje).
- `packDraftFrom` limita a unidade a `pauseEvery` (cartela emendada passa dele e o `PUT /api/cycle/method` recusava).
- `UNIT_NOUN`, `toDate`, `toDay` e `Label` exportados de `cycle-method-sheet.tsx` para o drawer.
