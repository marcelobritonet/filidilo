# Forma, ícones e movimento

## Formas da marca

Três formas, todas saídas da pena: o **círculo** (o ocelo), a **gota** (a pena) e os **anéis** (círculos um dentro do outro). Use-as como elemento gráfico em lugar de ilustração:

- **Anéis que se completam** mostram progresso: cada dia ou cada etapa acende um anel.
- **O ocelo sozinho** marca conquistas e o dia da ofensiva.
- **O leque** (penas com a ponta para baixo, abertas a partir de um ponto) é o desenho da ofensiva longa. Veja abaixo.
- **A gota** de ponta para cima aparece só no símbolo. Não a use como forma de botão ou cartão.

## Ofensiva: o leque no lugar do fogo

O app não usa fogo. Nada de chama, 🔥, brasa ou "sequência de fogo". A ofensiva é um pavão abrindo a cauda: quanto mais dias seguidos, mais o leque abre.

| Dias seguidos | Desenho no selo | Arquivo |
|---|---|---|
| 0, ou hoje ainda sem sessão | Ocelo apagado: contorno tracejado em `borda-controle`, sem cor | `ocelo-apagado.svg` |
| 1 a 6 | Ocelo aceso, com os quatro anéis | `ocelo.svg` |
| 7 a 29 | Leque de 3 penas | `leque-3-penas.svg` |
| 30 ou mais | Leque de 5 penas, aberto | `leque-5-penas.svg` |

- **A pena do leque** é a gota do símbolo virada de ponta para baixo, com o ocelo em cima, como a pena da cauda do pavão. As penas saem do mesmo ponto, separadas por 36°, e cada uma tem um contorno de 4 unidades na cor do fundo (`fundo`) para não se fundirem.
- **O número de dias** vem sempre ao lado do desenho, em Sora Bold. O desenho não substitui o número.
- **A semana** na ofensiva usa um ocelo pequeno por dia: aceso no dia com sessão; só o anel `conquista` (bronze no tema Noite, mel no Dia) no dia salvo por folga; anel tracejado em `acao` no dia de hoje ainda aberto; contorno em `borda` nos dias vazios.
- **Folga** é uma pena guardada: o contorno da gota, cheio em `conquista` quando a folga está guardada e vazio quando não está. Ela substitui o escudo.
- **Em risco** (falta a sessão de hoje): o desenho do selo fica apagado, mas mantém a forma do estágio, e o número continua visível. Nada pisca em vermelho.
- **Ao terminar a sessão do dia**, o ocelo acende do centro para fora (600ms). Ao mudar de estágio (7 e 30 dias), as penas novas abrem a partir do centro (400ms).
- O leque é desenho da ofensiva, não é logo: não o use no lugar do símbolo nem com o nome.

## Cantos e espaços

| Token | Valor | Onde |
|---|---|---|
| `raio-sm` | 12px | Botões pequenos, campos, avisos |
| `raio-md` | 16px | Botões, alternativas, linhas de lista |
| `raio-lg` | 24px | Cartão de estudo, blocos, folhas |
| `raio-pilula` | 999px | Chips e selos |

O espaçamento anda em passos de 4px (`espaco-1` a `espaco-12`). Margem lateral de 16px no celular; o conteúdo vai até 640px de largura e fica centralizado em telas maiores. Alvos de toque têm pelo menos 44 × 44px.

## Sombras e bordas

Uma sombra só (`sombra-cartao`) para o que se levanta do fundo: o cartão de estudo e os blocos. A folha que sobe da base usa `sombra-folha`. Fora isso, separe com `borda`. Campos e controles usam `borda-controle`, que tem contraste suficiente para ser visto.

## Ícones

- Ícones de linha, traço de 1,6px num quadro de 24px, pontas e cantos arredondados, na cor do texto (`currentColor`).
- Sempre acompanhados de texto; o ícone sozinho é escondido de leitores de tela.
- O app já tem cinco: revisar, entender, praticar, avançar e enviar. Ícones novos seguem o mesmo traço.
- Sem emoji como enfeite. ✓ e ✕ continuam como sinais de acerto e erro.

## Movimento

- Curto e com motivo: 150–300ms, saída suave (`ease-out`).
- O momento da marca é o **anel que acende**: ao terminar uma sessão, o ocelo do dia se preenche do centro para fora, em 600ms. Nos dias 7 e 30, o leque abre as penas novas.
- A folha sobe da base em 250ms; o cartão vira em 300ms.
- Com "reduzir movimento" ligado, tudo aparece no estado final, sem animação e sem piscar.

## Mascote

Por enquanto o Filidilo não tem mascote. Não desenhe pavões nem personagens; use o ocelo, os anéis e o leque de penas.
