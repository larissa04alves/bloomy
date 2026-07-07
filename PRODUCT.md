# Product

## Register

product

## Users

Público geral (produto aberto) que quer acompanhar o próprio dia a dia — água, refeições, remédios, treino, humor — sem culpa e sem burocracia. Contexto de uso: celular, várias visitas curtas ao longo do dia (abrir, registrar em segundos, fechar). A aba **Hoje** é a tela aberta ~90% das vezes. O job to be done: "me ajudar a cuidar de mim sem me cobrar".

## Product Purpose

Bloomy é uma PWA mobile-first de acompanhamento diário de bem-estar: hidratação, alimentação, remédios, treino, humor/mini-diário e agenda de saúde (consultas, exames, remédios cadastrados). O princípio estrutural do produto: **separar o que se faz todo dia** (registrar, marcar, checar — abas Hoje, Corpo, Treino, Mente) **do que se gerencia de vez em quando** (cadastrar, agendar — aba Saúde e modais). Sucesso = o registro diário ser tão leve que vira hábito.

No desktop, o app permanece uma coluna mobile (~420px) centrada sobre o fundo lilás claro — não há layout desktop alternativo. Tema light apenas, por ora; dark mode é extensão futura da paleta, não requisito.

O nome do produto e wordmark é **Bloomy** (o protótipo em `docs/` usa "Diário" como placeholder de wordmark; substituir por "Bloomy" mantendo o visual).

## Brand Personality

Acolhedor, leve, encorajador. **Cuidado que parece carinho, não prontuário.** Celebra o que foi feito; nunca cobra o que faltou. Linguagem de amigo, não de médico nem de coach — PT-BR, diminutivos bem-vindos ("Verdinho"), zero jargão médico ou fitness.

## Anti-references

- **App clínico/hospitalar** (MyTherapy, apps de farmácia): tom de prontuário, alertas vermelhos, jargão médico, densidade de formulário.
- **Fitness agressivo** (Strong, Hevy): dashboard de performance, PRs, gráficos intimidadores. Treino aqui é ritual, não competição.
- **Gamificação punitiva** (Duolingo): streaks que envergonham, notificações chantagistas, badges infladas. O streak existe (`fire`), mas celebra — nunca ameaça.
- **SaaS genérico**: visual shadcn-default cinza, tabelas densas, tom corporativo B2B.

## Design Principles

1. **Todo dia ≠ de vez em quando.** Ações diárias moram nas abas do dia e ficam a ≤2 toques da tela Hoje; gestão mora em Saúde e nos modais de bottom sheet.
2. **Celebrar, nunca cobrar.** Progresso é mostrado pelo que foi feito ("5 de 8 copos"), pendência é neutra (card tracejado), nunca vermelha nem alarmante.
3. **Registro em segundos.** Steppers grandes, atalhos prontos (200/250/500ml), chips de escolha rápida — digitação é último recurso.
4. **Fidelidade ao handoff.** `docs/README.md` + protótipos HTML são hifi finais: cores, tipografia, raios e espaçamentos se recriam fielmente, não se reinterpretam.
5. **Cada domínio tem sua cor.** Lilás = geral/água, verde = alimentação, rosa = treino, coral = remédios — consistente em chips, tints e botões de modal, em todas as telas.

## Accessibility & Inclusion

WCAG AA pragmático: contraste AA (4.5:1) em texto de leitura — onde o hifi conflitar (ex.: texto secundário `#8A82A0` em corpo pequeno), escurecer o mínimo necessário e sinalizar a mudança; foco visível em tudo que é interativo; `prefers-reduced-motion` respeitado em toda animação; tap targets ≥44px. Idioma: PT-BR.
