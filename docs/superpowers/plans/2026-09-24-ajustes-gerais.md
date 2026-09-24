# Ajustes gerais (branch `chore/ajustes-gerais`)

## Design aprovado

1. Onboarding: sem os chips "Café / Almoço / Jantar" no passo de refeições.
2. Água: botão `−` na Hidratação tira o último registro do dia (`DELETE /api/water/last`, já existente); desabilitado com o dia zerado.
3. Gotas: gota = porção, enche em fração (`dropFill`), grid de até 8 colunas que encolhe a gota; até 24 gotas, acima vira barra.
4. Remédio: dose = `doseAmount` (real, aceita 0,5) + `doseUnit` (`comp`, `capsula`, `gotas`, `ml`, `g`, `mg`, `scoop`); `stock` real na mesma unidade; toma desconta `min(estoque, dose)` e grava `stockDelta` na toma; desmarcar devolve `stockDelta`. Remédios existentes viram `1 comp`; o texto antigo da dose é descartado.

Migration sem recriar `medication` (no Turso o `PRAGMA foreign_keys=OFF` não vale na transação e o rebuild apagaria as tomas pelo cascade): só `ADD COLUMN` + `ALTER COLUMN` (libsql) + `UPDATE` + `DROP COLUMN`, em duas gerações (adicionar e fazer backfill; depois remover) para o drizzle-kit não perguntar sobre rename.

## Tasks

Desvio: o grid de gotas substituiu `dropSize()` (calibrado para tamanho fixo, não cabia 8 por linha); `dropSize` foi removido.

- [x] 1. Remover chips do onboarding
- [x] 2. Botão `−` da água
- [x] 3. Gotas fracionadas (`dropFill` + teste)
- [x] 4a. Schema + migration de adição com backfill (`dose_amount`, `dose_unit`, `stock_delta`; `stock` vira real via `ALTER COLUMN` do libsql) — 0020
- [x] 4b. Service: desconto/devolução pela dose + testes (dose 2, dose 0,5, clamp no zero, devolução exata)
- [x] 4c. Rotas zod, `api-types`, `formatDose` + teste, modal com unidade, rótulos na Saúde e na Corpo
- [x] 4d. Migration de remoção (`dose`, `stock_decremented`) — 0021, SQL conferido sem rebuild
- [x] 5. `bun check-types` ok, 395 testes ok; verificação visual feita por ela em `/corpo`, `/saude` e onboarding
- [x] 6. Fixes da revisão: precisão de 3 casas na dose (ida e volta), `round(…, 4)` no estoque, `−` bloqueado com add em voo, limpezas
