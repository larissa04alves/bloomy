# Redesign — Tela de séries (SerieList)

**Data:** 2026-07-13 · **Escopo:** `apps/web/src/app/(app)/treino/components/SerieList.tsx` (1 componente)

## Problema

A tela de séries durante o treino ficou "muito branca / fora do app": a implementação
divergiu da linguagem lilás do design canônico (`docs/Diario App (standalone).html`,
tela EXERCÍCIO/SÉRIES) — trocou tons lilás por rosa/branco e comprimiu gif + "ver
execução" num header apertado.

## Direção escolhida (mockup B2)

Restaurar a linguagem lilás do design + ajustes pedidos. Sem elementos inventados
(nada de stepper/overlay/trilho).

### Layout (de cima pra baixo)

1. **Header:** botão voltar (`size-38`, `rounded-[12px]`, bg `lilac-tint-soft`, ícone
   `ArrowLeft` lilás) · **gif pequeno à esquerda** (~`size-14`/56px, `rounded-2xl`, bg
   `lilac-tint-soft`, anel branco interno + sombra suave) · nome (display bold ~17px) +
   subtítulo (grupo muscular, se houver).
2. **"ver execução":** pill discreto `lilac-tint`/`lilac-deep` com ícone `ArrowsOut`,
   abaixo do header. Só quando há `catalogExercise`.
3. **"Último treino":** banner `lilac-tint`, `rounded-[15px]`, ícone
   `ClockCounterClockwise` (lilás) + "Último treino: {load} kg · {reps} reps". Só quando
   `last?.load != null`. (Elemento que a usuária gostou — manter.)
4. **Cabeçalho da seção "Séries":** "Séries" à esquerda; à direita **bolinhas de
   progresso** (feitas = `lilac-deep`, pendentes = `lilac-tint`) + "N de M" pequeno em
   `lilac-deep`. Contador discreto — não um card grande.
5. **Cards de série em coluna** (tingidos por estado, `rounded-2xl`, altos — preenchem
   a tela, que estava vazia demais):
   - fundo: feita `green-tint-soft` · atual `lilac-tint` · pendente `lilac-tint-soft`.
   - conteúdo empilhado: linha de topo "Série N" (+ badge "feita" com `CheckCircle`
     verde quando concluída) · **reps e kg lado a lado** (pills brancas, label em cima
     e input embaixo) · botão **"Feito" lilás** largo abaixo (some quando a série está
     feita). Gif do header aumentado (`size-20`) mantendo a vibe fofinha.

### Invariantes (não quebrar)

- reps/kg continuam **editáveis** (mantêm `onChangeReps`/`onChangeLoad`/`onPersist`/
  `onDone`). As pills brancas envolvem os inputs.
- Props e assinatura do componente inalteradas.
- Ícones Phosphor.
- Tamanhos de fonte na escala nomeada (`text-xs/sm/base/...`), sem `text-[Npx]`.

## Fora de escopo

Lista de exercícios (ExercicioList), timer de descanso, tela de fim. Sem mudança de
backend/dados.
