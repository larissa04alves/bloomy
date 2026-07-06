# Handoff: Diário — App de acompanhamento diário

## Overview
"Diário" é um app **mobile** de acompanhamento do dia a dia, com tom acolhedor (nada clínico, sem julgamento). O princípio central é **separar o que se faz todo dia** (registrar, marcar, checar) **do que se gerencia de vez em quando** (cadastrar remédio, agendar consulta).

Navegação principal (bottom tab, 5 abas):
- **Hoje** — resumo do dia (a tela aberta ~90% das vezes)
- **Corpo** — hidratação, alimentação e remédios do dia
- **Treino** — lista de treinos + treino em andamento
- **Mente** — check-in de humor/ansiedade + mini-diário (linguagem acolhedora)
- **Saúde** — consultas, exames e agenda de remédios (gestão)

Além das abas, o pacote inclui: **Login**, **Onboarding** (3 passos), **Modais de adicionar** (água, refeição, remédio, consulta, treino), **Lembretes/Notificações** e **Minhas metas**.

## About the Design Files
Os arquivos deste bundle são **referências de design feitas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos, **não** código de produção para copiar diretamente. A tarefa é **recriar estes designs no ambiente do codebase de destino** (React Native, Flutter, SwiftUI, etc.), usando os padrões e bibliotecas já estabelecidos ali. Se ainda não houver ambiente, escolha o framework mais apropriado (para um app mobile deste tipo, React Native/Expo ou Flutter são boas opções) e implemente os designs nele.

- `Diario App.dc.html` — arquivo-fonte do design (componente streaming; contém todas as telas + a lógica interativa do fluxo de treino).
- `Diario App (standalone).html` — versão única autossuficiente (abre offline em qualquer navegador; boa para visualizar e para importar no Figma via plugin **html.to.design**).

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamento e raios são finais. Recrie a UI fielmente usando as bibliotecas/padrões do codebase. Os ícones usam a fonte **Phosphor Icons (peso Fill)** — no app de destino, use o pacote Phosphor equivalente (`phosphor-react-native`, `phosphor-flutter`, etc.) ou o icon set já adotado, mantendo o estilo preenchido e arredondado.

## Design Tokens

### Cores
| Papel | Hex |
|---|---|
| Fundo do app (telas) | `#FBFAFE` |
| Fundo do "board" (fora do device) | `#E9E2F3` |
| Texto principal (tinta) | `#3B3552` |
| Texto secundário | `#8A82A0` |
| Texto terciário / placeholder | `#A79FB8` |
| **Lilás — principal** | `#A78BD0` |
| Lilás profundo (texto/ícone sobre tint) | `#8768BC` |
| Lilás tint (fundo de card/chip) | `#EDE7F8` / `#F4EFFA` |
| **Rosa** | `#F3B6D0` |
| Rosa profundo | `#C76E9E` / `#E08AB0` |
| Rosa tint | `#FBEAF2` |
| **Verdinho** | `#A8D5BA` |
| Verde profundo | `#4E9C74` / `#7FC4A0` |
| Verde tint | `#E6F4EC` / `#EAF5EF` |
| Rosa-remédio / coral | `#C77E93` |
| Rosa-remédio tint | `#FBECEF` |
| Borda de device / hairline | `#EAE2F4` / `#F1EBF8` |
| Overlay de modal (dim) | `rgba(43,38,64,.42)` |
| Fundo escuro (timer de descanso) | `#3B3552` |

### Tipografia
- **Títulos / números / labels de destaque:** `Quicksand` (500/600/700).
- **Corpo / metadados:** `Nunito` (400/600/700/800).
- Escala usada: saudação 23px/700; título de tela 24px/700; título de card 15px/700 (Quicksand); rótulo de seção 15px/700; corpo 12–14px/600 (Nunito); labels de nav 10px/700–800; números grandes de stepper 30–44px/700.

### Raio de canto
- Device (moldura): `38px`
- Cards grandes: `22–26px`
- Cards pequenos / inputs: `13–20px`
- Chips / pills: `999px`
- Bottom sheet (modais): `28px 28px 0 0`

### Sombras
- Device: `0 22px 50px rgba(120,86,164,.16)`
- Card: `0 6px 18px rgba(120,86,164,.06)` / `0 5px 16px rgba(120,86,164,.05)`
- Botão primário lilás: `0 8px 20px rgba(167,139,208,.35)`
- Bottom sheet: `0 -12px 40px rgba(59,53,82,.25)`

### Device / grid
- Largura de tela: **342px**, altura **748px** (proporção de celular). Status bar fake no topo, bottom tab fixa embaixo (`≈` 60px), conteúdo com scroll entre eles. Padding de conteúdo: `12–14px 22px`.

## Screens / Views

### Bottom tab bar (repetida em todas as telas do app)
5 itens distribuídos (space-around): **Hoje** (`house`), **Corpo** (`heartbeat`), **Treino** (`barbell`), **Mente** (`smiley`), **Saúde** (`first-aid-kit`). Ativo: cor `#8768BC`, ícone Fill, label 800/10px. Inativo: cor `#B3ABC4`, ícone regular, 600/10px. Borda superior `1px #F1EBF8`, fundo branco.

### 1. Hoje
- **Propósito:** resumo gentil do dia.
- **Layout:** saudação + avatar (círculo 46px, `#A78BD0`) no topo; seletor de humor; grid 2×2 de "rituais"; card de próxima consulta.
- **Humor:** título "Como você está?" + "registrado ✓" (lilás); fileira de 5 tiles 52×52 raio 16 com faces Phosphor (`smiley-sad`, `smiley-meh`, `smiley`, `smiley-wink`, `heart`). Selecionado = fundo `#A78BD0`, ícone branco, sombra lilás; demais = fundo `#F4EFFA`, ícone `#C7BEDA`.
- **Grid de rituais (2×2):** cada card = fundo tint + chip de ícone branco 42px raio 14 + título (Quicksand 15/700) + subtítulo + ação/barra.
  - Hidratação (tint `#EDE7F8`, `drop` `#8768BC`) — "5 de 8 copos" + barra 62% (`#A78BD0`).
  - Alimentação (tint `#E6F4EC`, `fork-knife` `#4E9C74`) — "2 refeições · faltou o jantar" + "+ Adicionar".
  - Treino (tint `#FBEAF2`, `barbell` `#C76E9E`) — "Peito e tríceps" + "▶ Iniciar".
  - Remédios (tint `#FBECEF`, `pill` `#C77E93`) — "1 de 3 tomados" + "✓ Marcar".
- **Próxima consulta:** card branco, chip `calendar-heart`, "Dra. Marina · Nutricionista", à direita "qui, 9 / 14h".

### 2. Corpo
- **Propósito:** o físico do dia (água, alimentação, remédios).
- **Layout:** título + subtítulo; card-resumo de 3 colunas (Água 5/8, Refeições 2/3, Remédios 1/3, tint `#EDE7F8`); seção Hidratação (8 gotas `drop`, 5 preenchidas lilás + botão "Adicionar copo"); lista de refeições (Café/Almoço feitos com check verde, Jantar pendente em card tracejado); lista de remédios de hoje (com check ou círculo vazio).

### 3. Treino (lista)
- **Propósito:** escolher o treino do dia.
- **Layout:** título; card-resumo rosa "3 treinos essa semana" + streak (`fire`) + semana em bolinhas; lista de treinos (Peito e tríceps, Costas e bíceps, Pernas, Cardio leve) — cada card: chip de ícone + nome + "N exercícios · min" + botão redondo de play.

### 4. Treino (em andamento) — INTERATIVO
Fluxo com estados (ver "Interactions"):
- **Lista de exercícios:** header (voltar, "Peito e tríceps", "X de 5 exercícios", chip de timer `24:12`), hint "Toque num exercício...", lista de 5 exercícios (chip `barbell` + nome + "N séries · carga"; à direita `check-circle` verde se concluído, senão `caret-right`); no fim, botão **Concluir treino**.
- **Exercício / séries:** header (voltar, nome, "Série X de N"), faixa "Último treino: 40 kg · 10 reps", lista de séries (Série N + chip reps + chip kg + botão **Feito** ou `check-circle` verde). Linha da série atual destacada com fundo `#EDE7F8`.
- **Timer de descanso** (overlay ancorado embaixo, fundo `#3B3552`): anel + "DESCANSO mm:ss" + botão "Pular".
- **Concluído:** check grande verde, "Treino concluído!", 2 stats (exercícios, duração), botão "Voltar ao início".

### 5. Mente
- **Propósito:** espaço seguro, acolhedor.
- **Layout:** título "Seu espaço" + subtítulo gentil; card de humor (tint lilás, 5 faces, uma selecionada); card "E a ansiedade hoje?" (trilho degradê verde→rosa com knob branco/lilás, rótulos Tranquilo/Agitado); card mini-diário (tint rosa, textarea placeholder + botão "Salvar registro" rosa `#E08AB0`); lista "Seus registros" (data + humor + trecho).

### 6. Saúde
- **Propósito:** gestão médica.
- **Layout:** título; card-resumo "Próxima consulta em 3 dias"; seção Consultas (Dra. Marina, Dr. Paulo); seção Exames (Hemograma "resultado disponível", Vitamina D "a agendar"); seção "Agenda de remédios" com "+ Cadastrar" (Vitamina D, Magnésio).

### 7. Login / cadastro
- Fundo `radial-gradient(120% 55% at 50% 0%, #EFE6FA, #FBFAFE 62%)`. Logo (quadrado 78px raio 24 `#A78BD0` com `heart` branco), wordmark "Diário" 32/700, tagline, 3 dots (lilás/rosa/verde). Rodapé: botão **Continuar com Google** (branco, borda `#E6DEF2`, ícone `google-logo`), botão **Entrar com e-mail** (tint), texto de termos.

### 8. Onboarding (3 passos separados)
Cada passo é uma tela: barra de progresso de 3 segmentos + "Passo N de 3" + "Pular"; hero (círculo 112px com ícone), pergunta (Quicksand 24/700), subtítulo, controle, botão de avançar (+ "Voltar" nos passos 2–3).
1. **Água** — círculo lilás `drop`; stepper (– 8 copos +, "≈ 2 litros"); fileira de 8 gotas.
2. **Refeições** — círculo verde `fork-knife`; stepper (– 3 +); chips Café/Almoço/Jantar.
3. **Dias de treino** — círculo rosa `barbell`; seletor de 7 dias (4 selecionados rosa `#E08AB0`); "4 dias por semana"; botão "Começar a usar".

### 9. Modais de adicionar (bottom sheet sobre a tela escurecida)
Padrão: overlay `rgba(43,38,64,.42)` + sheet branco (raio topo 28) com "grabber" (40×5 `#E2D8F0`), header (chip de ícone + título) e botão primário na cor do domínio.
- **Água** (botão lilás): stepper grande "250 ml" + atalhos 200/250/500/Garrafa.
- **Refeição** (botão verde `#7FC4A0`): segmento Café/Almoço/Jantar/Lanche; input "O que você comeu?"; Horário + Foto.
- **Remédio** (botão `#C77E93`): Nome; Dose/Estoque; frequência 1x/2x/3x; chips de horário (09:00 + adicionar).
- **Consulta** (botão lilás): Profissional; Data/Hora; Local; toggle "Lembrar 1 dia antes".
- **Treino** (botão lilás): Nome; foco Peito/Costas/Pernas/Cardio; lista de exercícios + "Adicionar exercício" (tracejado).

### 10. Lembretes e notificações
- **Notificações (lock screen):** wallpaper `linear-gradient(160deg,#C9B6E6,#E9DDF3 52%,#F3D9E6)`, relógio grande, pilha de cards de notificação (`rgba(255,255,255,.9)`, raio 20) — água, remédio, treino, check-in da mente.
- **Lembretes (ajustes):** lista de linhas com chip de ícone + título + horário + **toggle** (ON = `#A78BD0` com knob à direita; OFF = `#E2D8F0` com knob à esquerda, tamanho 46×27, knob 21). Nota final sobre notificação com app fechado.

### 11. Minhas metas
- **Propósito:** painel de gestão das metas (alvo + progresso), acessado pelo perfil.
- **Layout:** header (voltar + "Minhas metas"); card-resumo com **anel** `conic-gradient(#8768BC 0% 82%, #DDD1EF 82% 100%)` + "Você está no ritmo / 5 de 6 metas em dia"; cards por meta (Hidratação, Alimentação, Treino, Check-in da mente, Remédios) com chip de ícone + nome + "Meta: ..." + pill de ajuste (valor + `pencil-simple`) e indicador de progresso (barra de hoje / dias da semana / streak `fire` / "em dia"); botão tracejado "Nova meta".

## Interactions & Behavior
Todas as telas são estáticas, **exceto o "Treino em andamento"**, que é uma máquina de estados:
- `view`: `'lista' | 'ex' | 'fim'`.
- Tocar num exercício → `view='ex'` (abre séries do exercício).
- Tocar **Feito** numa série → incrementa séries concluídas do exercício + inicia timer de descanso.
- Timer de descanso: conta regressiva de `restSeconds` (padrão 45) até 0; botão "Pular" encerra. Só aparece se `autoRest` estiver ligado.
- Botão **Concluir treino** → `view='fim'` (tela de resumo); "Voltar ao início" reseta tudo.
- Transições sem animação especial; o descanso é um overlay ancorado ao rodapé do device.

Nas demais telas, os botões (Adicionar/Marcar/Iniciar/steppers/toggles) são **mock** — no app real devem abrir os modais correspondentes ou alterar estado.

## State Management (para o fluxo de Treino)
- `view` ('lista' | 'ex' | 'fim'), `activeEx` (índice), `done` (mapa exercício→nº de séries feitas), `resting` (bool), `restLeft` (segundos).
- Dados de exemplo: 5 exercícios de "Peito e tríceps" (Supino reto 4×, Supino inclinado 4×, Crucifixo 3×, Tríceps corda 4×, Tríceps francês 3×), cada um com carga/reps "último treino".
- Props ajustáveis expostas: `userName` (padrão "Alex", usado nas saudações e no resumo), `restSeconds` (15–120, padrão 45), `autoRest` (bool, padrão true).

## Assets
- **Ícones:** Phosphor Icons (peso **Fill** para ativos/destaque, **Regular** para nav inativa). Nomes usados incluem: `heart, drop, fork-knife, barbell, pill, house, heartbeat, smiley (+ -sad/-meh/-wink), first-aid-kit, calendar-heart, calendar-blank, coffee, bowl-food, moon-stars, check-circle, check-fat, plus/plus-circle, minus, play/play-circle, timer, clock, clock-counter-clockwise, fire, arrow-left, caret-right, flag-checkered, google-logo, envelope-simple, camera, bell-ringing, pencil-simple, lock-simple, carrot, stethoscope, test-tube, drop-half, cell-signal-full, wifi-high, battery-full`.
- **Fontes:** Google Fonts — Quicksand, Nunito.
- Sem imagens raster; nenhum asset proprietário.

## Files
- `Diario App.dc.html` — fonte do design (todas as telas + lógica do treino).
- `Diario App (standalone).html` — versão única offline (visualização / import no Figma).
