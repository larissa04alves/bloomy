# Bloomy (Diário)

App de acompanhamento diário de bem-estar: água, refeições, remédios, treino e humor, com tom acolhedor. Este contexto cobre o produto inteiro (apps/web).

## Language

### Núcleo do dia

**Domínio**:
Uma das áreas de cuidado diário — Água, Alimentação, Remédios, Treino, Mente. Cada domínio tem uma cor fixa (lilás, verde, coral, rosa, rosa).
_Avoid_: categoria, módulo

**Dia**:
A data local (fuso de Brasília) a que um registro pertence; vira à meia-noite. Todo registro diário pertence a exatamente um dia.
_Avoid_: data UTC

**Hoje**:
A tela-resumo que agrega os domínios do dia. Não é um domínio — só consome os outros.
_Avoid_: dashboard, home

**Ritual**:
O card de um domínio no grid da tela Hoje.
_Avoid_: widget, atalho

**Pendência**:
Item esperado do dia ainda não registrado. Sempre neutra e gentil — nunca alarme, atraso ou cobrança.
_Avoid_: atrasado, esquecido, falha

**Meta**:
Alvo numérico de um domínio, por dia ou por semana (ex.: 2000 ml/dia, 4 treinos/semana). Definida no onboarding, editável na tela Metas.
_Avoid_: objetivo, desafio

### Corpo

**Registro de água**:
Um evento de hidratação medido em ml, no momento em que aconteceu.
_Avoid_: copo (como unidade de dado)

**Copo**:
Unidade de exibição de água, equivalente a 250 ml. Existe só na apresentação ("5 de 8 copos"), nunca como medida registrada.

**Refeição**:
Registro de alimentação com tipo (Café, Almoço, Jantar, Lanche) e descrição livre.

**Refeição principal**:
Café, Almoço ou Jantar — as únicas que geram pendência. Lanche conta para a meta, mas nunca fica pendente.

**Remédio**:
O cadastro gerenciado de um medicamento — nome, dose, estoque, frequência e horários. Vive na gestão (aba Saúde), não no dia.
_Avoid_: medicamento (na UI), prescrição

**Toma**:
A confirmação de um remédio em um horário previsto de um dia. As tomas esperadas do dia derivam do cadastro; só a confirmação é um fato registrado.
_Avoid_: dose (dose é a quantidade no cadastro, ex.: "1 comprimido")

**Estoque**:
Quantidade restante de um remédio. Diminui a cada toma confirmada; desmarcar devolve.

### Treino e Mente (termos nomeados, modelagem pendente)

**Check-in**:
O registro diário de humor/ansiedade na aba Mente.
_Avoid_: avaliação, score

**Streak**:
Sequência de cumprimento da meta de treino. Celebra — nunca ameaça nem envergonha.
