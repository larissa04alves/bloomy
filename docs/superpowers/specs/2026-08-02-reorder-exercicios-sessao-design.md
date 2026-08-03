# Reordenar exercícios na sessão ativa

2026-08-02

## Problema

A ordem dos exercícios de uma sessão vem do template (`exercise.position`) e é fixa durante
o treino. Quem chega na academia e encontra o aparelho do terceiro exercício livre — mas o
do primeiro ocupado — não tem como adiantar: ou treina fora de ordem e registra as séries
nos cards errados, ou espera.

A sessão já permite trocar, adicionar e remover exercícios no dia
([spec de 2026-07-28](2026-07-28-ajuste-exercicios-sessao-design.md)). Falta reordenar.

## Decisões de design

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Superfície | Só a sessão ativa (`ExercicioList`) | É onde a ordem incomoda. O template ganha a ordem de graça pelo "Salvar no treino" que já existe. |
| Biblioteca | `motion/react` (`Reorder` + `useDragControls`) | Já é dependência do `apps/web`. Handle dedicado é padrão first-class da API. |
| Gesto | Handle de arraste na linha | A linha já consome arraste horizontal no `SwipeableRow`; o reorder precisa de gatilho próprio. Sem modo de edição. |
| Persistência | `PATCH` otimista na coleção, ordem completa no body | Otimismo é obrigatório (senão a linha volta ao lugar antigo após o drop). Ordem completa torna o request idempotente. |
| Migration | Nenhuma | `position` já existe e é `notNull` em `session_exercise`. |

### Por que não `@dnd-kit`

`@dnd-kit/core` + `@dnd-kit/sortable` entregariam navegação por teclado e anúncios de
screen reader prontos, ao custo de duas dependências novas (~35 kB) numa lista de 4 a 10
linhas num app mobile-first. O `motion` já está pago e dá a animação de reordenação de
graça.

Mitigação da lacuna de teclado, se valer a pena depois: o handle é um `<button>` de verdade
com `aria-label`, e tratar `ArrowUp`/`ArrowDown` nele chama a mesma função de movimentação
que o drag usa. A lógica de reordenação fica num lugar só justamente para isso.

### API verificada no pacote instalado

`motion@12.42.2`. `motion/react` faz `export * from 'framer-motion'`
(`dist/react.d.ts`), e `onReorder` está declarado em `framer-motion/dist/index.d.ts:831`.
Não depende de memória de versão.

O ícone do handle também está confirmado: `@phosphor-icons/react@2.1.10` exporta
`DotsSixVerticalIcon` (`dist/csr/DotsSixVertical.d.ts:13`), re-exportado pelo índice do
pacote.

## Front

### Estrutura

`useDragControls` é hook por item, então a linha vira componente próprio:
`apps/web/src/app/(app)/treino/components/ExercicioRow.tsx`.

```
Reorder.Group as="ul" axis="y" values={ids} onReorder     ← substitui o <div flex flex-col gap-2>
└─ ExercicioRow (Reorder.Item as="li" dragListener={false} dragControls={controls})
   └─ SwipeableRow                                        ← sem alteração
      └─ div.rounded-card.bg-white.p-3.shadow-card-sm     ← card sobe do <button> para cá
         ├─ button  handle (DotsSixVerticalIcon, touch-none)
         └─ button  flex-1 → onOpenExercise(i)            ← conteúdo atual da linha
```

`ExercicioList` mantém o cabeçalho, o timer, o "Adicionar exercício", o toggle de descanso
automático e o "Concluir treino". Só o `<div>` que envolve o `map` de exercícios vira
`Reorder.Group`, e o corpo da linha sai para `ExercicioRow`.

### Quatro detalhes que decidem o toque

1. **O card migra do `<button>` para o `<div>` wrapper.** Botão dentro de botão é HTML
   inválido, então o handle não pode viver dentro do botão da linha. As classes
   `rounded-card bg-white p-3 shadow-card-sm` sobem um nível; o botão de tap fica
   `flex flex-1 items-center gap-3 text-left`.
2. **`touch-none` no handle.** Sem isso o navegador trata o arraste vertical como scroll da
   página e o drag nunca começa. O `SwipeableRow` mantém `touch-pan-y` no div interno.
3. **`e.stopPropagation()` no `onPointerDown` do handle**, antes de `controls.start(e)`.
   Hoje o `SwipeableRow` só reage a `|dx| ≥ 6px` (`swipeable-row.tsx:75`), então arraste
   vertical já não viraria swipe — mas o reorder não deve depender desse limiar continuar
   existindo.
4. **`values` é array de `id`, não de objetos.** `patchLocal` recria os objetos de exercício
   a cada série alterada, e `ExercicioList` re-renderiza a cada 1 s pelo timer
   (`ExercicioList.tsx:50-56`). Identidade de objeto não é confiável aqui.

Custo visual: cerca de 30 px à esquerda saem da área de tap. A altura da linha não muda e o
alvo continua acima de 44 px.

### Hook

São **duas** funções em `useSessao.ts`, não uma. `onReorder` do `motion` dispara a cada troca
de posição durante o arraste, não uma vez no drop — juntar estado e rede numa função só
geraria vários PATCHes por drag.

| Função | Quando | O que faz |
| --- | --- | --- |
| `reorderLocal(ids: string[])` | `onReorder` da `Reorder.Group`, várias vezes por drag | Só `setData` com a lista reordenada. Sem rede. |
| `persistOrder()` | `onDragEnd` da `Reorder.Item`, uma vez por drag | `PATCH /api/sessions/{id}/exercises` com a ordem atual de `detail.exercises` |

`persistOrder` lê a ordem de um `useRef` atualizado sincronamente dentro do `reorderLocal`,
com fallback para `detail.exercises` quando o ref está vazio.

Ler direto da closure do `useCallback` **não funciona** aqui, e essa foi uma premissa errada
na primeira versão deste spec. `onReorder` vem de `pointermove`, que o React trata em
prioridade contínua e pode adiar o flush; `onDragEnd` da `motion` roda em listener nativo de
`pointerup`, fora do sistema sintético. Num arraste rápido — o caso comum — o `onDragEnd`
dispara antes do commit do último `reorderLocal`, o PATCH envia a ordem penúltima, e a
resposta de sucesso sobrescreve a tela com a ordem errada. Falha silenciosa.

O ref é limpo depois de cada persistência (sucesso ou erro), porque daí em diante o canônico
vem do servidor. Sem essa limpeza, um `persistOrder` posterior a um add/remove/swap enviaria
ids que talvez nem existam mais, e o back responderia 409.

O otimismo do `reorderLocal` não é luxo — sem ele a linha volta ao lugar antigo no drop.

Erro no PATCH → `reload()` + `toastError(e, "Não foi possível salvar a nova ordem")`.

Recarregar o canônico em vez de restaurar snapshot local segue o motivo já documentado em
`persistSet` e `markDone`: um snapshot sobrescreveria escritas concorrentes já persistidas.

Dois drags rápidos em sequência disparam dois requests. Como cada um carrega a ordem
completa, a operação é idempotente e o último vence sobre o estado inteiro — não é preciso
sequenciar nem cancelar request em vôo.

## Back

### Rota

`PATCH` adicionado a `apps/web/src/app/api/sessions/[id]/exercises/route.ts`, junto do
`POST` que já existe.

Não crio `exercises/order/route.ts`: um segmento estático `order` conviveria com
`[sessionExerciseId]` na mesma altura da árvore, e a correção passaria a depender da
precedência estático-sobre-dinâmico do Next. `PATCH` na coleção reordenando a coleção também
é o REST mais direto.

```ts
const ORDER_SCHEMA = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
```

Respostas: `null` → 404 · `"mismatch"` → 409 `"exercise set mismatch"` · sucesso →
`Response.json({ session })`. Wrapper fino, sem regra de negócio, como as outras rotas.

### Serviço

`reorderSessionExercises(db, userId, sessionId, ids)` em
`apps/web/src/server/workout/session.ts`.

1. Carrega a sessão por `(id, userId)`; ausente → `null`
2. Carrega os `session_exercise` da sessão
3. Exige que `ids` seja **permutação exata** dos ids carregados: mesmo tamanho, mesmo
   conjunto, sem repetição. Divergência → `"mismatch"`
4. Transação: `update position = i` para cada id na ordem recebida
5. Retorna `buildSessionDetail(db, session, userId)` — mesmo contrato de add, swap e remove

A exigência de permutação exata é o que impede um cliente com estado velho de fazer um
exercício desaparecer da sessão ou aparecer duas vezes. O 409 leva o cliente a recarregar.

### Propagação para o template

Nada a fazer. `applySessionToWorkout` (`session.ts:573-584`) já renumera `position: i` a
partir da ordem da sessão, então "Salvar no treino" na tela de fim persiste a nova ordem no
`exercise` sem código adicional.

## Bordas

| Caso | Comportamento |
| --- | --- |
| `completing` em andamento | Handle com `disabled` e opacidade reduzida; `onPointerDown` não chama `controls.start`. Mesma regra do swipe, trocar e remover |
| Um exercício só na lista | Handle não renderiza; `Reorder.Group` permanece (evita remontar a lista ao adicionar o segundo) |
| Exercício com séries feitas | Reordena normalmente; `set_log` não referencia posição |
| `activeEx` (índice, não id) | Drag só existe na view `lista`, e `openExercise(i)` grava no momento do tap — não há índice velho |
| Drag além das pontas da lista | Para na primeira ou última posição; comportamento padrão do `Reorder` |

## Testes

Em `apps/web/src/server/workout/session.test.ts`, que já cobre add, swap, remove e apply:

- permutação válida renumera `position` como `0..n-1` na ordem recebida
- `ids` com item faltando → `"mismatch"`, e nenhuma posição muda
- `ids` com item extra ou repetido → `"mismatch"`
- sessão de outro usuário → `null`
- `applySessionToWorkout` depois de um reorder leva a ordem nova para `exercise`

Sem teste de UI, seguindo o padrão do projeto — lógica de gesto não é testada aqui; os
hooks com teste são `buscaExercicios`, `session` e `gif`.

## Fora de escopo

- Reordenar no `TreinoModal` (template) por drag. A ordem do template continua sendo a
  ordem de inserção, ajustável pelo "Salvar no treino" ao fim de uma sessão.
- Navegação por teclado no reorder. O handle nasce como `<button>` com `aria-label` para
  que isso caiba depois sem refazer a estrutura.
