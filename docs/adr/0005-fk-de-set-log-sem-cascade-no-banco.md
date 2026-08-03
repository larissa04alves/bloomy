# FK de `set_log.session_exercise_id` sem cascade no banco

O schema Drizzle declara `set_log.session_exercise_id` com `onDelete: "cascade"`, mas o DDL aplicado (migration `0014_naive_screwball`) criou a coluna como `text REFERENCES session_exercise(id)`, sem cláusula `ON DELETE` — o SQLite assume `NO ACTION`. **Banco e schema divergem, e vão continuar divergindo:** o snapshot do drizzle-kit concorda com o schema, então `db:generate` nunca detecta a diferença nem emite correção.

Aceitamos o drift em vez de reconstruir a tabela. Corrigir uma FK no SQLite exige recriar `set_log` (create/copy/drop/rename), e `set_log` guarda o histórico inteiro de séries de todos os usuários. Verificamos que não há bug ativo: `PRAGMA foreign_keys` é `1` (o driver libsql aplica FK de verdade), e deletar um treino com sessão e séries registradas funciona — o cascade de `set_log.session_id → workout_session` remove as linhas antes de a FK sem `ON DELETE` ser cobrada. Nenhum caminho do serviço depende do cascade: `swapSessionExercise` e `removeSessionExercise` apagam `set_log` explicitamente antes de mexer em `session_exercise`.

## Consequences

- **Não remova os deletes explícitos de `set_log`** em `swapSessionExercise` e `removeSessionExercise` confiando no cascade declarado no schema. Ele não existe no banco. Os comentários no código dizem isso; este ADR é o registro do porquê.
- Um banco criado do zero pelas migrations reproduz o mesmo drift, então dev e produção erram igual — o comportamento é consistente, só não é o declarado.
- Se algum dia o cascade passar a ser necessário, a correção é uma migration custom reconstruindo `set_log`, com dump do Turso antes. Não dá para consertar com `ALTER`.
