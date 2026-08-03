# Checklist de verificação — reorder de exercícios na sessão

Para rodar quando você for treinar de verdade, na sua sessão real. Nada aqui exige
ferramenta especial: só o app aberto e o DevTools na aba Network.

Pré-requisito: uma sessão ativa de um treino com **3 ou mais** exercícios.

## Os seis comportamentos

| # | O que fazer | O que tem que acontecer |
| --- | --- | --- |
| 1 | Olhar a lista de exercícios | Um handle `⠿` aparece à esquerda de cada linha |
| 2 | Arrastar o handle pra cima/baixo | A linha acompanha o dedo e as outras abrem espaço com animação |
| 3 | Soltar | A linha fica na posição nova — não volta pro lugar antigo |
| 4 | Recarregar a página | A ordem nova continua lá (prova que o PATCH persistiu) |
| 5 | Tocar no corpo da linha | Abre a lista de séries, como antes |
| 6 | Deslizar a linha pro lado | Ainda revela "trocar" e "excluir", como antes |

Os itens 5 e 6 são os que provam que o handle não quebrou o que já existia — são o motivo
de o arraste ter um gatilho próprio em vez de usar a linha inteira.

## Na aba Network

Filtrar por `exercises`. Cada arraste tem que gerar **exatamente um**
`PATCH /api/sessions/{id}/exercises`.

**Vários PATCHes num único arraste = bug.** Significaria que a persistência foi ligada no
evento errado (`onReorder`, que dispara a cada troca de posição, em vez de `onDragEnd`, que
dispara uma vez no drop).

O corpo do request é `{ "ids": [...] }` com a lista completa na ordem nova.

## Dois casos de borda que valem checar

**Com um exercício só na lista:** o handle não deve aparecer (não há o que reordenar).

**Arrastes em sequência rápida:** arraste um exercício, solte, e imediatamente arraste
outro. A ordem final na tela tem que bater com a ordem depois de um reload. Esse caminho
teve dois bugs corrigidos durante a implementação — os dois causavam a tela e o banco
divergirem silenciosamente — então é o que mais merece um olhar.

**Cancelar um arraste** (soltar fora da lista, ou apertar Esc no meio): a lista deve voltar
ao normal sem deixar a linha travada. Não consegui verificar esse caminho por análise — se
o `onDragEnd` da lib não disparar no cancelamento, a ordem local pode ficar dessincronizada
do servidor até o próximo arraste.

## Três suspeitas do review final

Nenhuma foi verificada na tela. Estão em ordem de probabilidade e cada uma tem sintoma
específico — se você vir o sintoma, é isso, não é coincidência.

**1. Swipe aberto + arrastar a mesma linha.** Deslize uma linha pro lado (revelando
"trocar"/"excluir") e, sem fechar, arraste o handle dela pra cima. Suspeita: o deslocamento
horizontal viaja junto no arraste vertical — a linha sobe torta, deslocada pro lado.

**2. Swipe aberto numa linha + arrastar outra.** Deslize a linha A pro lado, depois arraste
o handle da linha B. Suspeita: a linha A não fecha sozinha, como fecharia se você tocasse em
qualquer outro lugar. Causa provável: o `stopPropagation` do handle corta a propagação antes
de chegar no listener global que fecha as linhas abertas.

**3. Segurar o arraste parado por alguns segundos.** Pegue um exercício pelo handle e
segure sem soltar, atravessando a virada do segundo no cronômetro do topo. Suspeita: um
tranco na animação, ou a linha trocando de vizinho errado, porque a lista re-renderiza a
cada 1 s por causa do cronômetro.

Das três hipóteses que eu pedi pro review investigar, só essa terceira tem causa raiz
confirmada no código. As outras duas que eu suspeitava — o `overflow-hidden` do
`SwipeableRow` atrapalhando a medição, e o `Reorder.Item` brigando com o `translateX` do
swipe — **não** se confirmaram: o transform do swipe fica num `div` filho, não no `li` que
a lib mede.

## Propagação pro template (opcional)

Ao concluir o treino, a tela de fim oferece "Salvar no treino". Se você tocar, a ordem nova
vai pro template — reabrindo em "Editar treino", os exercícios aparecem na ordem nova.

Isso não precisou de código novo: o `applySessionToWorkout` já renumerava as posições a
partir da ordem da sessão. Mas vale conferir uma vez, porque é o único caminho que grava
a ordem de forma permanente.
