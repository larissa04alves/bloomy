---
name: Bloomy
description: PWA mobile-first de bem-estar diário — acolhedora, lilás, arredondada
colors:
  lilac: "#A78BD0"
  lilac-deep: "#8768BC"
  lilac-tint: "#EDE7F8"
  lilac-tint-soft: "#F4EFFA"
  pink: "#F3B6D0"
  pink-deep: "#C76E9E"
  pink-bright: "#E08AB0"
  pink-tint: "#FBEAF2"
  green: "#A8D5BA"
  green-deep: "#4E9C74"
  green-mid: "#7FC4A0"
  green-tint: "#E6F4EC"
  green-tint-soft: "#EAF5EF"
  coral: "#C77E93"
  coral-tint: "#FBECEF"
  bg: "#FBFAFE"
  board: "#E9E2F3"
  ink: "#3B3552"
  ink-soft: "#8A82A0"
  ink-faint: "#A79FB8"
  nav-inactive: "#B3ABC4"
  hairline: "#EAE2F4"
  hairline-soft: "#F1EBF8"
  control-off: "#E2D8F0"
  ring-track: "#DDD1EF"
  overlay: "#2B26406B"
typography:
  display:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
  number:
    fontFamily: "Quicksand, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.2
rounded:
  control: "16px"
  card: "20px"
  card-lg: "26px"
  sheet: "28px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
components:
  button-primary:
    backgroundColor: "{colors.lilac}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    typography: "{typography.title}"
    padding: "14px 22px"
  button-tint:
    backgroundColor: "{colors.lilac-tint}"
    textColor: "{colors.lilac-deep}"
    rounded: "{rounded.pill}"
    typography: "{typography.title}"
    padding: "14px 22px"
  card:
    backgroundColor: "#FFFFFF"
    rounded: "{rounded.card}"
    padding: "16px"
  card-ritual:
    backgroundColor: "{colors.lilac-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-lg}"
    padding: "16px"
  input:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  chip:
    backgroundColor: "{colors.lilac-tint-soft}"
    textColor: "{colors.lilac-deep}"
    rounded: "{rounded.pill}"
    typography: "{typography.body}"
    padding: "8px 14px"
---

# Design System: Bloomy

## 1. Overview

**Creative North Star: "Jardim de bolso"**

Bloomy é um jardim que cabe no bolso: cuidar de si tem o gesto de regar uma plantinha — pequeno, diário, recompensador. A superfície é clara e macia (`bg` quase branco com respiro lilás), tudo é arredondado, as sombras são tingidas de lilás em vez de cinza, e cada domínio do dia tem sua própria cor de canteiro: lilás para o geral e a água, verde para a alimentação, rosa para o treino, coral para os remédios. A densidade é baixa e o toque é grande — o app é feito para visitas de dez segundos com o polegar.

O sistema rejeita explicitamente o que o PRODUCT.md rejeita: nada de prontuário clínico (sem vermelho de alerta, sem jargão), nada de dashboard de performance fitness, nada de gamificação que envergonha, nada de cinza SaaS genérico. A emoção-alvo é alívio e carinho, não urgência.

A tela é uma coluna mobile (342px de conteúdo, ~420px máx.) mesmo no desktop, centrada sobre o fundo `board` lilás claro. Motion é curta e serve estado (150–250ms, ease-out), com `prefers-reduced-motion` sempre respeitado.

**Key Characteristics:**
- Tudo arredondado: nada de canto vivo; do chip (999px) ao bottom sheet (28px).
- Sombras lilás, nunca pretas: profundidade com a cor da marca.
- Tint + profundo: todo fundo tint carrega texto/ícone na variante profunda do mesmo matiz.
- Uma cor por domínio, em todas as telas, sem exceção.
- Pendência neutra: o que falta é tracejado e gentil, nunca vermelho.

## 2. Colors

Paleta pastel de quatro matizes sobre um quase-branco lilás — cada matiz existe em três alturas: cheio, profundo (texto/ícone) e tint (fundo).

### Primary
- **Lilás** (`#A78BD0`): a voz da marca. Botões primários, seleção ativa, barras de progresso, avatar, toggles ligados.
- **Lilás profundo** (`#8768BC`): texto e ícone sobre tints lilás; item ativo da tab bar.
- **Lilás tint** (`#EDE7F8`) e **Lilás tint suave** (`#F4EFFA`): fundos de card de ritual, chips e estados de repouso.

### Secondary
- **Rosa** (`#F3B6D0`) / **Rosa profundo** (`#C76E9E`) / **Rosa vivo** (`#E08AB0`) / **Rosa tint** (`#FBEAF2`): domínio do treino e do mini-diário. O rosa vivo é o botão de ação do domínio Mente.
- **Verdinho** (`#A8D5BA`) / **Verde profundo** (`#4E9C74`) / **Verde médio** (`#7FC4A0`) / **Verde tint** (`#E6F4EC`, `#EAF5EF`): domínio da alimentação e dos checks de "feito".

### Tertiary
- **Coral-remédio** (`#C77E93`) / **Coral tint** (`#FBECEF`): exclusivo do domínio de remédios.

### Neutral
- **Tinta** (`#3B3552`): texto principal e o fundo escuro do timer de descanso. Um roxo-escuro, não um preto.
- **Tinta suave** (`#8A82A0`): texto secundário. Em corpo pequeno de leitura, escurecer até AA (ver Do's).
- **Tinta apagada** (`#A79FB8`): placeholder e terciário, nunca para informação essencial.
- **Fundo** (`#FBFAFE`): fundo das telas. **Board** (`#E9E2F3`): fundo fora da coluna do app no desktop.
- **Hairlines** (`#EAE2F4`, `#F1EBF8`): bordas de 1px; divisórias e borda superior da tab bar.
- **Nav inativa** (`#B3ABC4`), **Controle desligado** (`#E2D8F0`), **Trilho de anel** (`#DDD1EF`).
- **Overlay** (`#2B2640` a 42%): escurecimento sob bottom sheets.

### Named Rules
**A Regra do Sem-Vermelho.** Vermelho de alerta é proibido na experiência diária. Pendência é neutra (tracejado + tinta suave); erro real de formulário usa o coral `#C76E93` profundo, nunca um vermelho de sistema.
**A Regra do Tint + Profundo.** Sobre qualquer fundo tint, texto e ícone usam a variante profunda do mesmo matiz — nunca cinza, nunca a variante cheia.
**A Regra da Cor por Domínio.** Lilás = geral/água, verde = alimentação, rosa = treino/mente, coral = remédios. Um botão de modal de refeição é verde; um chip de remédio é coral. Sem trocas.

## 3. Typography

**Display Font:** Quicksand (com system-ui, sans-serif)
**Body Font:** Nunito (com system-ui, sans-serif)

**Character:** dois arredondados humanistas que soam como caderno de carinho — Quicksand dá títulos e números macios e geométricos; Nunito dá corpo legível e amigável. Nada de fonte de sistema fria, nada de display apertado.

### Hierarchy
- **Display** (Quicksand 700, 23–24px, lh 1.25): saudação da tela Hoje e título de cada tela.
- **Title** (Quicksand 700, 15px): título de card e rótulo de seção.
- **Number** (Quicksand 700, 30–44px, lh 1.1): números de stepper e do timer — o maior elemento da tela quando aparece.
- **Body** (Nunito 600, 12–14px, lh 1.5): corpo, metadados, subtítulos de card.
- **Label** (Nunito 700–800, 10px): rótulos da tab bar (800 quando ativo, 600 inativo).

### Named Rules
**A Regra do Quicksand-para-destaque.** Quicksand aparece só em título, número e label de destaque; todo texto corrido é Nunito. Misturar os dois papéis achata a hierarquia.

## 4. Elevation

Sistema levemente elevado com sombras **sempre tingidas de lilás** (`rgba(120,86,164,…)`) ou de tinta (`rgba(59,53,82,…)`) — nunca preto puro. Cards flutuam de leve sobre o fundo; o botão primário carrega um brilho lilás; o bottom sheet projeta para cima. Hairlines de 1px complementam onde sombra seria demais (tab bar, divisórias de lista).

### Shadow Vocabulary
- **Card** (`box-shadow: 0 6px 18px rgba(120,86,164,.06)`): cards brancos em repouso; a variante `0 5px 16px rgba(120,86,164,.05)` para cards menores.
- **Botão primário** (`box-shadow: 0 8px 20px rgba(167,139,208,.35)`): só no botão lilás cheio e no tile de humor selecionado.
- **Bottom sheet** (`box-shadow: 0 -12px 40px rgba(59,53,82,.25)`): modais ancorados embaixo.
- **Device/coluna** (`box-shadow: 0 22px 50px rgba(120,86,164,.16)`): a coluna do app sobre o board no desktop.

### Named Rules
**A Regra da Sombra Lilás.** Toda sombra carrega o matiz da marca. Se aparecer `rgba(0,0,0,…)` numa sombra, está errado.

## 5. Components

Vocabulário macio e consistente: mesma forma de botão, mesmo chip de ícone e mesmo card em todas as telas.

### Buttons
- **Shape:** pill (999px) para ações; raio 16px para botões-bloco em sheets.
- **Primary:** lilás `#A78BD0`, texto branco Quicksand 700, sombra lilás de botão; cada modal usa a cor do seu domínio (verde `#7FC4A0` refeição, coral `#C77E93` remédio, rosa `#E08AB0` mente).
- **Hover / Focus:** hover escurece para o profundo do matiz (~150ms ease-out); foco com anel 2px `lilac` afastado 2px.
- **Tint (secundário):** fundo tint + texto profundo do mesmo matiz ("+ Adicionar", "Entrar com e-mail").
- **Tracejado (criativo):** borda dashed `hairline` + texto tinta suave, para "Nova meta" / "Adicionar exercício".
- **Disabled:** tint com texto `ink-faint`; nunca cinza de sistema.

### Chips
- **Chip de ícone:** quadrado 42px raio 14, fundo branco (sobre tint) ou tint (sobre branco), ícone Phosphor Fill na cor profunda do domínio.
- **Chip de escolha:** pill, tint no repouso, cheio + texto branco quando selecionado (frequência 1x/2x/3x, dias da semana, atalhos de ml).

### Cards / Containers
- **Corner Style:** 22–26px cards grandes; 13–20px cards pequenos e linhas de lista.
- **Background:** branco sobre `bg`, ou tint do domínio (grid de rituais).
- **Shadow Strategy:** sombra Card (ver Elevation); cards tint podem dispensar sombra.
- **Border:** nenhuma, exceto o card pendente (dashed `hairline`).
- **Internal Padding:** 14–16px; conteúdo de tela com padding `12–14px 22px`.

### Inputs / Fields
- **Style:** fundo branco, borda 1px `hairline`, raio 13–16px, placeholder `ink-faint`, texto `ink`.
- **Focus:** borda muda para `lilac` + anel suave `lilac-tint`.
- **Segmentos:** grupo pill (Café/Almoço/Jantar/Lanche); selecionado = cheio do domínio.
- **Toggle:** 46×27, knob 21px branco; ON = trilho `lilac`, OFF = trilho `control-off`.

### Navigation
- **Bottom tab bar**, 5 itens (Hoje, Corpo, Treino, Mente, Saúde), fundo branco, borda superior 1px `hairline-soft`, ~60px de altura, fixa.
- **Ativo:** ícone Phosphor **Fill** + label Nunito 800/10px em `lilac-deep`. **Inativo:** ícone Regular + 600/10px em `nav-inactive`. Sem badge, sem indicador extra.

### Bottom Sheet (componente-assinatura)
Todo fluxo de "adicionar" é um sheet ancorado embaixo: overlay `#2B2640` 42%, painel branco raio `28px 28px 0 0`, grabber 40×5 `control-off`, header com chip de ícone do domínio + título, botão primário na cor do domínio. Nunca modal centrado.

### Mood tiles (componente-assinatura)
Fileira de 5 tiles 52×52 raio 16 com faces Phosphor. Selecionado = fundo `lilac`, ícone branco, sombra de botão; repouso = `lilac-tint-soft` com ícone `#C7BEDA`.

## 6. Do's and Don'ts

### Do:
- **Do** usar Phosphor Icons — **Fill** para estados ativos e destaque, **Regular** para nav inativa. Nunca outro icon set.
- **Do** manter toda ação diária a ≤2 toques da tela Hoje, com tap target ≥44px.
- **Do** escurecer o texto secundário para ~`#6F6787` quando for corpo de leitura ≤14px (o `#8A82A0` do hifi fica abaixo de AA sobre `#FBFAFE`); manter `#8A82A0` apenas em metadados grandes/bold ou não-essenciais.
- **Do** mostrar progresso pelo que foi feito ("5 de 8 copos", barra 62%) e tratar pendência com card tracejado neutro.
- **Do** fornecer alternativa `prefers-reduced-motion` (crossfade ou corte seco) para toda transição.
- **Do** centrar o app numa coluna ~420px sobre o `board` lilás no desktop — sem layout desktop alternativo.

### Don't:
- **Don't** parecer **app clínico/hospitalar**: sem vermelho de alerta, sem jargão médico, sem densidade de prontuário (anti-referência do PRODUCT.md).
- **Don't** parecer **fitness agressivo** (Strong/Hevy): sem dashboard de PRs nem gráficos intimidadores — treino é ritual.
- **Don't** usar **gamificação punitiva** (Duolingo): o streak `fire` celebra, nunca ameaça; sem notificação chantagista.
- **Don't** regredir ao **SaaS genérico**: nada dos tokens cinza shadcn default, tabelas densas ou tom B2B.
- **Don't** usar sombra preta, canto vivo, `border-left` colorido como acento, gradient text ou glassmorphism.
- **Don't** usar modal centrado onde o padrão é bottom sheet, nem inventar affordances fora do vocabulário (mesmo botão, mesmo chip, mesmo card em toda tela).
- **Don't** usar cinza sobre fundo tint — a Regra do Tint + Profundo manda usar a variante profunda do matiz.
