# Dia local com fuso fixo (America/Sao_Paulo)

Todo registro diário grava, além do timestamp, a coluna `day` (`YYYY-MM-DD`) calculada no servidor com fuso fixo `America/Sao_Paulo` e virada à meia-noite — a query de "hoje" é um `WHERE day = ?` indexado, sem matemática de fuso espalhada pelas queries. Rejeitamos armazenar só UTC (cada leitura recalcularia o dia — fonte recorrente de bug) e fuso por usuário (complexidade que o produto PT-BR não precisa agora; o Brasil não tem mais horário de verão).

## Consequences

- Migrar para fuso por usuário no futuro afeta apenas registros novos; os antigos mantêm o `day` com que foram gravados.
