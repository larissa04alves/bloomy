# Página de perfil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Não commitar** — entregar como mudanças não-commitadas (CLAUDE.md do repo).

**Goal:** Rota `/perfil` (aberta por um item novo no dropdown do avatar) para editar altura e nascimento, ajustar descanso automático e aviso de descanso, sair e excluir a conta.

**Architecture:** Tela `(app)/perfil` no padrão da `/metas` (`page.tsx` só renderiza, `hooks/usePerfil.ts` com fetch e mutações otimistas, helpers puros em `hooks/format.ts`). Servidor: `PATCH /api/profile` ganha altura/nascimento; `DELETE /api/account` novo, fino, chamando `server/account/service.ts`.

**Tech Stack:** Next.js 16 App Router, Drizzle + libsql, better-auth, Tailwind 4, Phosphor, `bun test`.

**Spec:** seção "Design aprovado" abaixo · mockup `docs/Perfil (mockup).html`.

## Global Constraints

- Telas em PT, só renderizam; lógica em `hooks/`; código EN; texto sempre na escala nomeada do Tailwind (`apps/web/CLAUDE.md`).
- Rota = zod → sessão → serviço; erro `{ error }` com 400/401/404/422 (ADR-0001, `apps/web/CLAUDE.md`).
- Limites: altura `HEIGHT_CM_LIMITS` (100–250) e nascimento `BIRTH_DATE_MIN` ("1900-01-01") até hoje (`dayFor()`), de `apps/web/src/lib/body.ts`.
- Frase de exclusão: **`aceito excluir minha conta`** (comparação após `trim()` + `toLowerCase()`).
- `DELETE /api/account` **nunca** usa o fallback `DEV_USER_EMAIL`: o `.env` do web aponta para produção.
- Verificar rota/UI só com banco local: `DATABASE_URL=file:<scratch>/x.db DATABASE_AUTH_TOKEN=local BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001`.
- Testes: `bun test` rodado de `apps/web`. Nada de commit.

## Review Focus

1. Data de nascimento impossível ("31/02/1990", futura, antes de 1900) → Salvar desabilitado e 422 no servidor; nunca grava. (Task 1: teste de `validProfileUpdate` e de `parseBrDate` já existente.)
2. Frase com maiúsculas/espaços nas pontas ("  Aceito Excluir Minha Conta ") libera; frase parcial não. (Task 3: teste de `isDeletePhrase`.)
3. Falha no R2 durante a exclusão → conta e dados continuam inteiros, toast de erro, tentar de novo funciona. (Task 3: teste de `deleteAccount` com storage que falha.)
4. Request sem sessão ao `DELETE /api/account` com `DEV_USER_EMAIL` setado → 401, ninguém apagado. (Task 3: verificação por curl.)
5. Quem tinha "Descanso automático" desligado só no aparelho continua desligado depois do deploy. (Task 2: teste de `parseLegacyAuto` + migração no `useDescanso`.)

---

## Design aprovado

### Intenção

Dar à pessoa um lugar para os dados e ajustes da própria conta, que hoje não existe: altura e
nascimento só entram no onboarding e nunca mais são editáveis, "Descanso automático" vive só no
aparelho, e não há como excluir a conta (LGPD — e o ciclo menstrual, que vem na branch seguinte, traz
dado de saúde sensível). Também é a casa da futura seção Ciclo
(`docs/superpowers/plans/2026-11-05-ciclo-menstrual.md`).

### Metas

1. Rota `/perfil` acessada por um item novo "Perfil" no dropdown do avatar.
2. Editar altura e data de nascimento.
3. Ajustes do treino: "Descanso automático" (salvo na conta) e "Aviso de fim do descanso".
4. Sair e Excluir conta (apaga tudo, sem volta, com confirmação por frase digitada).

### Não-metas

Seção Ciclo (branch do ciclo), editar nome/foto (vêm do Google), descanso padrão por exercício, peso
(continua em Saúde), mover Metas/Notificações para dentro da página, selo "novo" no item do dropdown
(era só destaque do mockup).

### Restrições

- ADR-0001 (rota fina + serviço), tela em PT só renderiza (lógica em `hooks/`), código EN, migrations.
- Spec `2026-08-22-metas-e-perfil-design.md`, decisão 12: **o dropdown fica** (vestido, não
  reescrito). Esta página não revoga isso — só acrescenta um item.
- ADR-0005: `set_log.session_exercise_id` não tem `ON DELETE` no banco real. Excluir conta precisa de
  teste com treino + sessão + séries registradas.
- ADR-0003: anexos de exame no R2 (`exam.attachment_key`, `ExamStorage.delete`); o cascade do banco
  não os remove.
- `requireUserId` cai no usuário de `DEV_USER_EMAIL` sem sessão, e o `.env` aponta para produção:
  a exclusão exige sessão real.

### Abordagens

Uma só faz sentido: rota `(app)/perfil` no padrão da `/metas`, reaproveitando `BottomSheet`,
`Stepper`, `ToggleSwitch` e `PATCH /api/profile`. Descartadas: ampliar o dropdown (não comporta
edição) e uma tela de ajustes genérica (a escolha foi página de perfil).

### Decisões

**Referência visual**: `docs/Perfil (mockup).html` (classes dos componentes reais; recriar fielmente,
sem o selo "novo" nem o anel de destaque do item Perfil).

1. **Dropdown** (`home/components/PerfilMenu.tsx`): item **Perfil** (`UserCircleIcon`) no topo, antes
   de Metas, Notificações, separador, Sair. O header mostra só o nome — o "Seu perfil" sob o nome
   sai; sem nome, o título continua sendo o texto reserva "Seu perfil".
2. **Página `/perfil`**: header de voltar (igual Metas) com "Seu perfil"; card tint lilás com avatar
   grande (foto do Google ou inicial, mesma regra do `Avatar` atual), nome e e-mail (só leitura);
   seções **Sobre você**, **Treino**, **Conta**. A seção Ciclo entra entre Treino e Conta na branch
   do ciclo.
3. **Sobre você**: cards no padrão `MetaCard` (IconChip + título + subtítulo + pill com lápis).
   Altura: pill "165 cm" ou "Adicionar" → sheet com `Stepper` (100–250, passo 1, digitável).
   Nascimento: pill "12/03/1996" (subtítulo "30 anos") ou "Adicionar" → sheet com input mascarado
   dd/mm/aaaa e a validação do onboarding. Salvar otimista, rollback + `toastError`; sheet fecha no
   Salvar. Servidor aceita `heightCm`/`birthDate` com os limites do onboarding.
4. **Treino**:
   - "Descanso automático" passa a ser `profile.autoRest` (coluna existe, nunca lida). Toggle da
     sessão e do perfil gravam o mesmo valor. Migração única: se o aparelho tiver
     `localStorage["bloomy.rest.auto"]`, esse valor vai para a conta e a chave é apagada.
     `bloomy.rest.seconds` segue local (fora do escopo).
   - "Aviso de fim do descanso" = `profile.restAlert`, **com o mesmo comportamento da Notificações**:
     ligar pede permissão e registra o aparelho; desligar devolve a subscription se nenhum lembrete
     estiver ligado. O `syncPush` sai do `useNotificacoes` para um hook compartilhado.
5. **Conta**:
   - Sair: mesmo fluxo do dropdown (hook compartilhado).
   - Excluir conta → sheet coral com o texto "Vamos apagar tudo o que você registrou no Bloomy:
     água, refeições, remédios, treinos, humor, consultas, exames e anexos. Não dá pra desfazer.",
     campo para digitar **"aceito excluir minha conta"**, botão "Excluir conta" (coral, habilitado só
     com a frase) e "Cancelar" (tint).
   - Servidor: apaga primeiro os objetos do R2 de todos os exames com anexo da pessoa (falhou →
     aborta sem tocar no banco; repetir é seguro porque `DeleteObject` é idempotente), depois a
     linha de `user` (todas as FKs para `user` são `cascade`). Exige sessão real.
   - Client: sucesso → `disablePush()` (erro ignorado) → `router.replace("/login")`.

### Estados

Carregando = skeleton (padrão Metas); erro de leitura = bloco com "Tentar de novo"; altura/nascimento
nulos = pill "Adicionar"; excluindo = botão "Excluindo…" desabilitado.

---

## Tasks

### Task 1: `/perfil` com Sobre você + item no dropdown

Status: concluída (revisão aprovada; menores registrados no ledger para a revisão final).

**Files:**
- Modify: `apps/web/src/server/profile/service.ts` (tipo `ProfileUpdate`, `updateProfile`, nova `validProfileUpdate`)
- Modify: `apps/web/src/server/profile/service.test.ts`
- Modify: `apps/web/src/app/api/profile/route.ts`
- Modify: `apps/web/src/lib/body.ts` (recebe `maskBirthDate` e `parseBrDate`)
- Modify: `apps/web/src/app/onboarding/hooks/format.ts` + `format.test.ts` (importam de `lib/body`; testes dos dois helpers migram para `apps/web/src/lib/body.test.ts`)
- Create: `apps/web/src/components/avatar.tsx` (o `Avatar` hoje privado em `PerfilMenu.tsx`, com tamanho `"xl"` novo para a página)
- Modify: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx`
- Create: `apps/web/src/app/(app)/perfil/page.tsx`
- Create: `apps/web/src/app/(app)/perfil/hooks/usePerfil.ts`, `hooks/format.ts`, `hooks/format.test.ts`
- Create: `apps/web/src/app/(app)/perfil/components/{IdentidadeCard,SobreVoceSection,AlturaSheet,NascimentoSheet,PerfilSkeleton,PerfilError}.tsx`

**Interfaces:**
- Produces: `ProfileUpdate` com `heightCm?: number; birthDate?: string`; `validProfileUpdate(input: ProfileUpdate, today?: string): boolean`; `PATCH /api/profile` → 422 quando inválido.
- Produces (client): `usePerfil()` devolvendo `{ ready, error, reload, account: { name: string | null; email: string; image: string | null }, profile, saveHeight(cm: number), saveBirthDate(iso: string) }` — Tasks 2 e 3 estendem este hook.
- Produces: `<Avatar name image size="lg" | "sm" | "xl" />` em `components/avatar.tsx`.

- [ ] **Step 1: Testes do serviço** em `server/profile/service.test.ts`, `describe("altura e nascimento")`:
  - `updateProfile(db, id, { heightCm: 172, birthDate: "1996-03-12" })` → `heightCm === 172`, `birthDate === "1996-03-12"`, `waterPortionMl === 500` (não tocado).
  - `validProfileUpdate({ heightCm: 99 })`, `({ heightCm: 251 })`, `({ heightCm: 170.5 })` → `false`; `({ heightCm: 100 })`, `({ heightCm: 250 })` → `true`.
  - `validProfileUpdate({ birthDate: "1899-12-31" }, "2026-11-05")`, `({ birthDate: "2026-11-06" }, "2026-11-05")`, `({ birthDate: "1990-02-31" }, …)` → `false`; `({ birthDate: "2026-11-05" }, "2026-11-05")` → `true`; `({})` → `true`.
- [ ] **Step 2:** `bun test src/server/profile` → FAIL (`validProfileUpdate` não existe).
- [ ] **Step 3:** Implementar. `validProfileUpdate` reaproveita a regra de `withinLimits` do `server/onboarding/service.ts` (inteiro dentro de `HEIGHT_CM_LIMITS`; `DAY_SCHEMA` + `BIRTH_DATE_MIN` ≤ data ≤ `today`, default `dayFor()`) — extrair os dois checks para funções exportadas de `server/profile/service.ts` e usá-las nos dois serviços. Rota: zod ganha `heightCm: z.number().int().optional()` e `birthDate: DAY_SCHEMA.optional()`; inválido pela regra → `unprocessable("altura ou nascimento fora da faixa permitida")` (`server/shared/api.ts`), como `app/api/onboarding/route.ts` faz.
- [ ] **Step 4:** `bun test src/server/profile src/server/onboarding` → PASS.
- [ ] **Step 5: Helpers da tela** em `perfil/hooks/format.test.ts`:
  - `ageFrom("1996-03-12", "2026-11-05") === 30`; `ageFrom("1996-11-06", "2026-11-05") === 29`; `ageFrom("1996-11-05", "2026-11-05") === 30`.
  - `heightPill(165) === "165 cm"`, `heightPill(null) === "Adicionar"`; `birthPill("1996-03-12") === "12/03/1996"`, `birthPill(null) === "Adicionar"`.
  Rodar → FAIL; implementar em `perfil/hooks/format.ts`; rodar → PASS.
- [ ] **Step 6: Mover `maskBirthDate`/`parseBrDate`** para `lib/body.ts` (com seus testes em `lib/body.test.ts`), atualizar os imports do onboarding. `bun test` de `apps/web` → PASS.
- [ ] **Step 7: Tela.** `usePerfil` busca `/api/profile` com `useResource` e a identidade com `authClient.useSession()` (conferir a API em `find-docs` do better-auth; e-mail vem de `session.user.email`). `saveHeight`/`saveBirthDate`: `setData` otimista → `api.patch("/api/profile", …)` → em erro, restaura e `toastError(e, "Não foi possível salvar")`. Componentes conforme o mockup: `IdentidadeCard` (card `rounded-card-lg bg-lilac-tint p-5`, `Avatar size="xl"`), `SobreVoceSection` (dois cards no padrão `MetaCard`; ícones `RulerIcon`, `CakeIcon`; subtítulos "Altura" sem subtítulo extra, nascimento com "N anos"), `AlturaSheet` (`BottomSheet` tone lilac + `Stepper` 100–250 com `parse`), `NascimentoSheet` (input com `maskBirthDate`; Salvar desabilitado quando `parseBrDate` devolve `null` ou a data sai da faixa). Header de voltar copiado da `/metas` com título "Seu perfil". Skeleton/erro no padrão `MetasSkeleton`/`MetasError`.
- [ ] **Step 8: Dropdown.** Extrair `Avatar` para `components/avatar.tsx`; no `PerfilMenu`, item "Perfil" (`UserCircleIcon`, `href="/perfil"`) antes de Metas; remover a linha "Seu perfil" sob o nome.
- [ ] **Step 9:** `bun check-types` (raiz) → sem erros.

### Task 2: Seção Treino (descanso automático na conta + aviso com push)

Status: concluída (revisão aprovada; menores no ledger).

**Files:**
- Create: `apps/web/src/lib/use-push-sync.ts`
- Modify: `apps/web/src/app/(app)/notificacoes/hooks/useNotificacoes.ts` (usa o hook novo; comportamento igual)
- Modify: `apps/web/src/app/(app)/treino/hooks/rest.ts` + `rest.test.ts` (já existe)
- Modify: `apps/web/src/app/(app)/treino/hooks/useDescanso.ts`
- Modify: `apps/web/src/app/(app)/perfil/hooks/usePerfil.ts`, `page.tsx`
- Create: `apps/web/src/app/(app)/perfil/components/TreinoSection.tsx`

**Interfaces:**
- Consumes: `usePerfil` da Task 1.
- Produces: `usePushSync(): { permission: PushStatus | null; syncPush(anyEnabled: boolean): Promise<void> }` (o `permission`/`setPermission`, o efeito inicial com `pushStatus()` e o `syncPush` de hoje, movidos sem mudança).
- Produces: `parseLegacyAuto(raw: string | null): boolean | null` e `takeLegacyAutoRest(): boolean | null` (lê `bloomy.rest.auto`, apaga a chave, devolve o valor) em `treino/hooks/rest.ts`.
- Produces: `usePerfil()` ganha `autoRest`, `setAutoRest(next: boolean)`, `restAlert`, `setRestAlert(next: boolean)`.

- [ ] **Step 1: Teste** `parseLegacyAuto("true") === true`, `("false") === false`, `(null) === null`, `("lixo") === null`. Rodar → FAIL; implementar; rodar → PASS.
- [ ] **Step 2: `usePushSync`.** Mover de `useNotificacoes` sem alterar a lógica; `useNotificacoes` passa a consumi-lo. `bun check-types` → OK.
- [ ] **Step 3: `useDescanso`.** `auto` passa a vir de `profileData.profile.autoRest` (default `true` até carregar); `setAuto` faz `setData` otimista + `api.patch("/api/profile", { autoRest })` com rollback e `toastError(e, "Não foi possível salvar o descanso automático")`. Quando o profile carrega: `takeLegacyAutoRest()`; se não for `null` e diferir de `autoRest`, PATCH com o valor legado (uma vez). `RestPrefs.auto` e `KEY_AUTO` deixam de ser usados fora da migração; `seconds` continua no `localStorage`.
- [ ] **Step 4: Perfil.** `usePerfil` busca também `/api/reminders` (para decidir o desligar do push). `setAutoRest`: otimista + PATCH + rollback. `setRestAlert`: mesmo algoritmo de `useNotificacoes.setRestAlert` (ref do estado mais recente, PATCH, rollback, `syncPush(anyReminder || latestRestAlert)`), usando `usePushSync`. `TreinoSection` conforme mockup (IconChip pink `TimerIcon` / `BellRingingIcon`, subtítulos "inicia o descanso ao marcar a série" e "som + notificação", `ToggleSwitch`).
- [ ] **Step 5:** `bun test` (apps/web) + `bun check-types` → OK.

### Task 3: Seção Conta (sair + excluir conta)

Status: concluída (revisão aprovada; menores no ledger).

**Files:**
- Modify: `apps/web/src/server/shared/api.ts` (nova `requireSessionUserId`)
- Create: `apps/web/src/server/account/service.ts`, `service.test.ts`
- Create: `apps/web/src/app/api/account/route.ts`
- Create: `apps/web/src/lib/use-sign-out.ts`
- Modify: `apps/web/src/app/(app)/home/components/PerfilMenu.tsx` (usa `useSignOut`)
- Modify: `apps/web/src/app/(app)/perfil/hooks/usePerfil.ts`, `hooks/format.ts`, `hooks/format.test.ts`, `page.tsx`
- Create: `apps/web/src/app/(app)/perfil/components/{ContaSection,ExcluirContaSheet}.tsx`

**Interfaces:**
- Produces: `requireSessionUserId(request: Request): Promise<string | null>` — só `auth.api.getSession`, **sem** `devUser()`.
- Produces: `deleteAccount(db: Db, storage: ExamStorage, userId: string): Promise<void>` — rejeita se algum `storage.delete` falhar, sem apagar nada do banco.
- Produces: `DELETE /api/account` → 204; 401 sem sessão real; 500 `{ error }` se o R2 falhar.
- Produces: `useSignOut(): { signingOut: boolean; signOut(): Promise<void> }` (lógica atual do `PerfilMenu`: `disablePush().catch`, `authClient.signOut()` checando `{ error }`, `router.replace("/login")`, toast "Não foi possível sair. Tente de novo.").
- Produces: `isDeletePhrase(raw: string): boolean` e `DELETE_PHRASE = "aceito excluir minha conta"` em `perfil/hooks/format.ts`.

- [ ] **Step 1: Testes do serviço** (`createTestDb`, `createTestUser`; fake de storage no estilo de `fakeStorage()` de `server/health/service.test.ts`):
  - "apaga o usuário e tudo dele": usuário com água, refeição, remédio + toma, check-in, consulta, exame com anexo (`attachmentKey: "k1"`), treino com sessão e série registrada (criar pelos serviços de `server/workout`, como em `server/workout/service.test.ts`), lembrete e push subscription → depois de `deleteAccount`, `select` de cada tabela por `userId` volta vazio e `storage` recebeu `delete("k1")`.
  - "não toca em outro usuário": segundo usuário com água e exame → intactos.
  - "R2 falhou: nada some do banco": storage cujo `delete` rejeita → `expect(deleteAccount(...)).rejects`, usuário e exame continuam no banco.
- [ ] **Step 2:** `bun test src/server/account` → FAIL (módulo não existe).
- [ ] **Step 3:** Implementar `deleteAccount`: `select attachmentKey from exam where userId and attachmentKey is not null` → `await Promise.all(keys.map(storage.delete))` → `db.delete(user).where(eq(user.id, userId))`. Rota `DELETE`: `requireSessionUserId` → `deleteAccount(db, examStorage, userId)` → `new Response(null, { status: 204 })`; erro do storage → 500 `{ error: "storage_failed" }`.
- [ ] **Step 4:** `bun test src/server/account` → PASS. Ver o teste falhando de verdade: trocar temporariamente a ordem (banco antes do R2) e confirmar que o terceiro teste quebra; restaurar.
- [ ] **Step 5: Helpers** em `perfil/hooks/format.test.ts`: `isDeletePhrase("aceito excluir minha conta")`, `("  Aceito Excluir Minha Conta ")` → `true`; `("aceito excluir")`, `("")`, `("aceito  excluir minha conta")` → `false`. FAIL → implementar → PASS.
- [ ] **Step 6: Client.** `useSignOut` extraído do `PerfilMenu` (que passa a usá-lo). `usePerfil` ganha `signOut`, `signingOut`, `deleteAccount()` (`api.del("/api/account")` — já devolve `undefined` em 204 → `disablePush().catch(() => {})` → `router.replace("/login")`; erro → `toastError(e, "Não foi possível excluir a conta. Tente de novo.")`), `deleting`. `ContaSection` e `ExcluirContaSheet` conforme o mockup (opção B), texto do sheet exatamente o da Decisão 5.
- [ ] **Step 7:** `bun test` (apps/web) + `bun check-types` → OK.

### Task 4: Verificação real

Status: concluída — tudo verificado na rota com banco local, exceto o toast de falha do R2 e o push real de fim do descanso.

- [ ] **Step 1:** Banco local migrado: `DATABASE_URL=file:<scratch>/perfil.db DATABASE_AUTH_TOKEN=local bun run --cwd packages/db db:migrate`.
- [ ] **Step 2:** Subir com `/dev-up-agent-browser` usando os overrides de banco + `BETTER_AUTH_URL=http://localhost:3001 CORS_ORIGIN=http://localhost:3001`; logar com Google; passar pelo onboarding.
- [ ] **Step 3:** Na rota real: dropdown mostra "Perfil" e só o nome no header; `/perfil` renderiza identidade, altura/nascimento editam e persistem após reload; nascimento "31/02/1990" mantém Salvar desabilitado; toggles de Treino persistem após reload e o "Descanso automático" da sessão de treino reflete o do perfil; "Aviso de fim do descanso" no perfil e na Notificações mostram o mesmo valor.
- [ ] **Step 4:** Sem sessão, com `DEV_USER_EMAIL` setado: `curl -X DELETE http://localhost:3001/api/account` → `401`.
- [ ] **Step 5:** Excluir conta pela UI (com frase) → vai para `/login`; logar de novo cai no onboarding (conta nova).
- [ ] **Step 6:** Reportar o que ficou rodando (dev server) e o que não foi possível confirmar.
