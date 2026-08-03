# ADR-0004: Ciclo de vida do exame e onde o retorno é decidido

## Contexto

Exame não é consulta: depois de realizado, ainda falta o laudo. O primeiro desenho
tratava os dois igual — concluir perguntava se havia retorno e mandava o registro
para o histórico na mesma ação. Isso produziu dois problemas reais:

- O laudo ficava sem lugar. `attachExam` só aceitava `awaiting_result`, e o exame
  ia direto para `completed`: responder o retorno **queimava** a chance de anexar
  o resultado (a tentativa devolvia 409).
- Na tela, o original saía dos ativos e sobrava o retorno homônimo em "a agendar",
  o que se lê como "o exame voltou para a agendar".

## Decisão

Máquina de estados do exame, com uma transição por operação:

```
to_schedule ──(modal, exige data)──> scheduled
scheduled   ──(markExamDone)───────> awaiting_result   + cria o retorno to_schedule
awaiting_result ──(attachExam)─────> completed         (anexar o laudo fecha)
awaiting_result ──(completeExam)───> completed         (concluir sem laudo)
```

- **O retorno é decidido no `markExamDone`**, não na conclusão. Se ficasse na
  conclusão, o exame permaneceria em `awaiting_result` com o botão ainda oferecendo
  a pergunta — daria para responder duas vezes e criar dois retornos. A guarda
  `eq(status, "scheduled")` cobre o double-tap.
- **O exame só sai dos ativos quando o laudo é resolvido** (anexado ou dispensado
  no `ResultadoSheet`). `awaiting_result` é o estado que diz "falta o resultado".
- **O retorno é um registro novo** com `parentId` apontando para o original, nunca
  reciclagem do mesmo registro. Como herda o nome, a UI marca com um badge
  `retorno` — sem isso, origem e retorno são indistinguíveis na lista.
- **Transições têm rota dedicada** (`POST .../done`, `POST .../complete`). O `PUT`
  genérico só aceita `to_schedule`/`scheduled`: era por ele que dava para gravar
  `completed` sem `completedAt`, quebrando a ordenação do histórico.
- Estado de origem inválido é **409**, não 404 — 404 fica reservado para exame
  inexistente ou de outra usuária.
- `scheduled` sem `scheduledAt` é estado inválido, validado no serviço sobre o
  **estado final** (patch + linha atual, já que o `PUT` é parcial).

## Consequência

- Consulta segue o fluxo antigo (concluir pergunta o retorno e finaliza na hora):
  não tem laudo para esperar. A simetria entre os dois domínios foi abandonada de
  propósito.
- O histórico é só leitura. Dispensar o laudo é decisão final; não há caminho para
  anexar depois pela UI (o serviço ainda aceita, ver `CAN_ATTACH`).
