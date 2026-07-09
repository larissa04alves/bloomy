# Catálogo de exercícios pré-salvos (com GIF) — design

> **Contexto:** a aba Treino (Fase 5) já tem criar/editar treino com exercícios
> digitados à mão (nome + séries + reps + descanso). Esta fase adiciona um
> **catálogo global de exercícios** (nome + grupo muscular + GIF de execução)
> que o usuário pesquisa/filtra ao montar o treino; exercícios fora do catálogo
> continuam existindo como texto livre ("personalizado"). Autoridade visual:
> `DESIGN.md` + tokens `@bloomy/ui`. Convenções: `apps/web/CLAUDE.md`,
> `packages/db/CLAUDE.md`.

## Objetivo

Ao adicionar um exercício a um treino, poder **buscar no catálogo** (digitando
"supino" → puxa o exercício com nome PT, grupo muscular e GIF de execução),
**filtrar por grupo muscular**, e **ver o GIF grande**. O GIF também aparece
durante o treino em andamento. Exercício custom (fora da lista) segue como hoje,
com opção de marcar o grupo muscular. **Nada fora do design atual** (domínio
rosa, cards, bottom sheet, sem vermelho).

## Escopo

**Dentro:**
- Tabela `exercise_catalog` semeada de um dataset (1.323 exercícios).
- Nomes exibidos em **PT-BR** (`namePt`), traduzidos no seed; inglês só interno.
- Busca por nome + filtro por grupo muscular (8 grupos).
- GIF por exercício (360×360) hospedado no nosso storage, com "ver grande".
- Exercício **custom**: texto livre + grupo muscular opcional (não entra no catálogo).
- GIF exibido na criação/edição **e** durante o treino em andamento.

**Fora:**
- Usuário contribuir/editar o catálogo global.
- Catálogo pessoal por usuário.
- Instruções multi-idioma além de PT (o dataset tem, mas não usamos agora).
- Vídeo/animação além do GIF pronto do dataset.

## Fonte dos dados (decidido)

**Repo:** `omercotkd/exercises-gifs` (GitHub, MIT no empacotamento).
- `exercises.csv` — 1.324 linhas, colunas achatadas: `id, name, bodyPart,
  target, equipment, secondaryMuscles/0..5, instructions/0..10`.
- `assets/{id}.gif` — 1.323 GIFs **360×360** (id zero-padded, ex.: `0025.gif`).
- Junção com metadados só pelo `id` (não precisamos do `hasaneyldrm`).

**Ressalvas registradas (aceitas para app pessoal):**
- Procedência final = ExerciseDB/Gym Visual via Kaggle; o repo declara não ser
  dono do conteúdo. Risco legal baixo p/ uso pessoal; **manter atribuição**
  ("© Gym Visual" na tela de ver-grande).
- `id 0609` tem metadado mas **não tem GIF** → dropar essa linha no seed.
- CSV é achatado → parse reconstrói os arrays (`secondaryMuscles`, `instructions`).

## Hospedagem do GIF (decidido)

**Cloudflare R2** (free tier 10GB + egress grátis). Subir os 1.323 GIFs uma vez
no seed. Servidos pela **URL pública `r2.dev`** do bucket (rate-limit da CF é de
sobra p/ app pessoal). A URL é montada a partir de uma **base configurável**
`EXERCISE_GIF_BASE` (env, ex.: `https://pub-xxxx.r2.dev`), então trocar por
domínio próprio depois é só mudar a env — os `id`s ficam no nosso banco.
`next.config` **não** precisa de `remotePatterns` porque o GIF é servido via
`<img>` simples (não `next/image`, que quebra animação).

## Idioma / PT-BR (decidido)

- `name` (inglês) fica **interno** (join, fallback, termo de busca).
- `namePt` é o que **aparece** — traduzido para os 1.323 no seed (terminologia de
  academia; revisão dos comuns pela usuária). Inglês nunca aparece pro usuário.
- Busca via **Fuse.js** (fuzzy, client-side) sobre `namePt` (peso 2) + `name`
  (peso 1), com `ignoreDiacritics` (acento) e `ignoreLocation`. Tolera erro de
  digitação. Sem tabela de alias agora (YAGNI; adicionar depois se surgir
  sinônimo que o nome não cobre, ex.: "voador"→peck deck).
- **Grupos musculares:** os **8 grupos** que o app já usa (`Focus`): Peito,
  Costas, Pernas, Ombros, Glúteos, Braços, Abdômen, Cardio. No seed, mapeamos o
  `target`/`bodyPart` do dataset → um dos 8 (`group`). Vocabulário único em todo
  lugar (catálogo, custom, filtro).
- Detalhe de músculos na tela de ver-grande (primário + secundários) usa um mapa
  PT pequeno (~15 termos) sobre os valores `target`/`secondaryMuscles` do dataset.

## Modelo de dados

Tabela nova em `packages/db/src/schema/workout.ts` (migration obrigatória):

```
exercise_catalog
  id            text PK        -- id do dataset ("0025"); é a chave do GIF
  name          text           -- inglês, interno
  namePt        text           -- exibição (PT), traduzido no seed
  group         text (Focus)   -- 1 dos 8 grupos; usado no filtro e no chip
  bodyPart      text           -- valor cru do dataset (detalhe)
  target        text           -- músculo primário cru (detalhe)
  equipment     text
  secondaryMuscles  text(json) -- array
  createdAt     timestamp_ms
```

> `instructions` (passos escritos) **fora do v1** — o dataset só tem EN e traduzir
> milhares de frases é desproporcional; o GIF já ensina a execução. Coluna pode
> ser adicionada depois se necessário.

Alterações na tabela existente `exercise` (linhas de exercício de um treino):

```
exercise
  ...campos atuais (name, targetSets, targetReps, restSeconds, position)...
  catalogId     text NULL  FK → exercise_catalog.id (onDelete: set null)
  muscleGroup   text NULL  (Focus) -- só p/ custom; catálogo deriva de catalog.group
```

- Exercício do catálogo → `catalogId` preenchido; `name` copiado do `namePt`
  (sobrevive a mudanças do catálogo), `muscleGroup` null (usa `catalog.group`).
- Exercício custom → `catalogId` null; `muscleGroup` opcional (1 dos 8).

## Pipeline de seed

Script em `packages/db` (one-shot, idempotente), rodado localmente 1x com as
credenciais do R2 no env:
1. Baixar `exercises.csv` + `assets/*.gif` do repo (pin num commit).
2. Parsear CSV (reconstruir arrays achatados), dropar `0609` (sem GIF).
3. `group`: mapear `target`/`bodyPart` → 1 dos 8 (mapa que nós escrevemos;
   desconhecido → fallback sensato). `namePt`: **arquivo de dados commitado e
   revisável** (`id → { namePt, group }`, autoria nossa) — seed determinístico.
4. Upload dos GIFs pro R2 (`{id}.gif`).
5. Inserir/atualizar `exercise_catalog`.

## API (REST fino + serviço, ADR-0001)

- `GET /api/exercises` → retorna o **catálogo inteiro** (1.323 objetos leves:
  id, namePt, name, group, target, secondaryMuscles; `gifUrl` derivada no front
  de `{EXERCISE_GIF_BASE}/{id}.gif`), `{ exercises: CatalogExercise[] }`. É
  estático-ish → cacheável (client `useResource`, sem params). **Sem busca no
  servidor** — a busca acontece no cliente com Fuse.js.
- **Busca/filtro no cliente:** `new Fuse(catalog, {keys:[{name:'namePt',weight:2},
  {name:'name',weight:1}], threshold:0.4, ignoreLocation:true, ignoreDiacritics:true,
  minMatchCharLength:2})` (índice em `useMemo`). Filtro de grupo = filtro exato no
  array (antes/depois do Fuse). Dep nova: `fuse.js` (catálogo, `"catalog:"`).
- `POST/PUT /api/workouts` já existem — passam a aceitar `catalogId` e
  `muscleGroup` opcionais por exercício. Validação zod estende `EXERCISE_SCHEMA`.
- Exercício do catálogo no treino em andamento: a sessão já traz `catalogId` por
  exercício; o front resolve `gifUrl`/`group` (via o próprio `exercise` + base).

## UI / Layout (dentro do design atual)

**1. Escolher exercício — tela de busca dedicada** (não dropdown inline):
   - Implementada como **troca de view dentro do mesmo bottom sheet** (o modal
     alterna form ↔ busca; voltar retorna ao form; sem empilhar sheets).
   - "Adicionar exercício" abre a view de busca: header (voltar + "Escolher
     exercício"), **barra de busca** + **botão de filtro** ao lado (ícone de
     filtro Phosphor; fica rosa + contador quando há grupo ativo).
   - Busca **fuzzy client-side (Fuse.js)**, tolera erro e ignora acento/caixa;
     filtro por `group` (exato) combina com a busca. Instantânea (em memória), sem
     debounce/round-trip por tecla.
   - Tocar no filtro → abre chips dos 8 grupos (Todos + 8), roláveis. Filtro +
     texto combinam.
   - Lista de resultados: thumb (GIF) + `namePt` + chip do grupo + ⤢ (ver grande).
   - Fim da lista: "＋ Adicionar exercício personalizado (fora do catálogo)".

**2. Card do exercício (no modal de treino):**
   - Catálogo: GIF thumb + `namePt` (**nome fixo, não editável** — label, não input)
     + chip do grupo + linha séries/reps/intervalo + "⤢ ver execução".
   - Custom: ícone 🏋️ (sem GIF) + nome **editável** + **seletor de grupo muscular
     opcional** (8 chips; sem escolher = chip cinza "personalizado") +
     séries/reps/intervalo.
   - Séries/reps/intervalo são sempre editáveis (nível-treino). Catálogo não
     pré-preenche reps/descanso (o dataset não tem) — usam defaults (3/12/45).

**3. Ver grande (overlay):** painel branco arredondado sobre backdrop escuro —
   GIF grande (360×360), `namePt`, chips de músculos (primário + secundários em PT)
   e atribuição "© Gym Visual". Fecha no ✕. **Sem passos escritos no v1.**

**4. Durante o treino em andamento:**
   - `ExercicioList`: cada exercício mostra o GIF thumb (custom → 🏋️), "N séries
     · carga", check/caret. Timer total da sessão no topo (já existe).
   - `SerieList`: thumb do exercício no header + "⤢ ver execução" (mesma tela de
     ver-grande). Séries reps/kg/Feito como hoje.
   - **Contador de descanso** (já existe, `DescansoOverlay` `#3B3552`): ao marcar
     "Feito", dispara usando o `restSeconds` **do exercício** (por-exercício, já
     implementado). Anel + mm:ss + −15/+15 + Pular.

## Erros / edge cases

- GIF que falhar ao carregar → fallback pro ícone 🏋️ (nunca quebra o layout).
- Busca sem resultado → estado vazio + atalho "adicionar personalizado".
- Custom sem grupo → chip "personalizado" (neutro, sem vermelho).
- `namePt` ausente (tradução faltando) → fallback pro `name` EN (não deve ocorrer
  após seed completo; é rede de segurança).
- Regra Sem-Vermelho e `prefers-reduced-motion` seguem o padrão da Fase 5.

## Testes (pontos críticos)

- Mapeamento `target`/`bodyPart` → `group` (função pura): cobre os grupos e um
  fallback p/ desconhecido.
- Wrapper do Fuse (config nossa): "supin"→"Supino…", "gluteo"→"Glúteos", e
  filtro de grupo combinado devolvem os itens esperados (teste da nossa
  configuração, não do Fuse em si).
- Parse do CSV achatado → objeto (arrays reconstruídos), incluindo drop do 0609.
- `GET /api/exercises`: retorna o catálogo completo (serviço).
- Front: o card resolve catálogo vs custom (thumb/chip/nome-fixo-vs-editável
  corretos); filtro-botão reflete grupo ativo.

## Aceitação

`bun check-types` + `bun run test` verdes **e** verificação visual na 3001:
buscar "supino" → filtrar "Peito" → escolher (thumb+músculo no card) → ver grande
→ salvar treino → iniciar → GIF na lista/série → marcar Feito → contador de
descanso; adicionar custom com grupo muscular. Migration aplicada; GIFs no R2.

## Riscos / dependências

- **R2:** exige criar conta Cloudflare + bucket + credenciais (setup guiado na
  implementação). Bloqueia o seed dos GIFs.
- **Procedência da mídia** é cinza (aceito p/ uso pessoal; atribuição mantida).
- **Curadoria PT** (`namePt` + mapa de grupo) é trabalho manual nosso no seed;
  qualidade boa nos comuns, revisável.
- Tamanho: ~377MB de GIFs (fora do repo, no R2). Catálogo em JSON no cliente
  (~300KB) carregado 1x (cacheável).
- Dep nova: `fuse.js` (busca fuzzy client-side).

## Decisão de faseamento (p/ o plano)

Sugestão de fases no plano de implementação: (1) schema + migration + tipos;
(2) seed pipeline + R2 (GIFs + catálogo); (3) `GET /api/exercises` (catálogo
completo); (4) tela de busca (Fuse) + filtro dentro do modal; (5) card
catálogo/custom + ver-grande + `catalogId`/`muscleGroup` no create/edit;
(6) GIF no treino em andamento; (7) verificação E2E.
