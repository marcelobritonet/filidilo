# Cores

Uma paleta, cinco temas. As cores são só as cinco da logo; cada tema troca qual delas é fundo e qual é a cor viva. O ícone do app é sempre Noite.

## Paleta da logo

| Cor | Hex | Token | Papel |
|---|---|---|---|
| Noite | `#0B1E3F` | `marca-noite` | Fundo do tema Noite e do ícone do app; texto nos temas claros |
| Cobalto | `#1F4FD1` | `marca-cobalto` | Anel do ocelo; ação no tema Cobalto |
| Turquesa | `#13A3A0` | `marca-turquesa` | A gota do símbolo; ação no Noite e no Lagoa; barras de progresso; folgas da ofensiva |
| Bronze | `#C9933A` | `marca-bronze` | Anel do ocelo; conquistas em todos os temas |
| Névoa | `#EEF3FB` | `marca-nevoa` | Texto nos temas escuros; brilho do ocelo |

## Temas

Escolhidos em Preferências → Temas; a escolha fica fixa. Quem nunca escolheu abre no Areia ou no Noite, conforme o modo claro ou escuro do aparelho.

| Tema | Tipo | Família dos neutros | Botão e seleção | Barras | Quadrado da logo |
|---|---|---|---|---|---|
| **Lagoa** | claro | Turquesa quase cinza (fundo `#EBF4F4`) | Turquesa escura `#0D7776` | `#118D8B` | Noite |
| **Areia** (padrão claro) | claro | Creme na matiz do Bronze (fundo `#F6F2EA`) | Noite `#0B1E3F` | Turquesa escura `#0E7F7C` | Noite |
| **Noite** (padrão escuro) | escuro | Noite (fundo `#0B1E3F`) | Turquesa `#13A3A0` | `#4FD1CC` | Noite (some no fundo, de propósito) |
| **Cobalto** | escuro | Azul-marinho entre Noite e Cobalto (fundo `#131C30`) | Cobalto `#1F4FD1` (seleção `#3A68E6`) | Turquesa `#2FBFBB` | `#081121` (Noite mais escura) |
| **Pavão** | escuro | Turquesa até quase preto (fundo `#092525`) | Turquesa clara `#56D2D0` | a mesma | `#051514` (o tom mais escuro do tema) |

Regras de cada tema (revisão de 24/11/2026):
- Toda cor é uma das cinco da logo ou um tom dela (mesma matiz, só muda claridade e saturação). Fora disso, só os estados (acerto, erro, atenção).
- Uma família de neutros por tema: fundo, cartão, área recuada, campo e bordas mudam só a claridade. Nada de "três azuis".
- Uma cor de ação por tema (botão, seleção, foco, links). Turquesa pode aparecer na barra. Bronze só em conquistas.
- Placeholder (`--placeholder`) e botão desativado (`--accent-off`) têm cores próprias, da família do tema, sem transparência.
- O quadrado atrás do símbolo (`--simbolo-fundo`) é Noite, ou o tom mais escuro do tema quando o fundo não é Noite. O ícone do app instalado continua Noite.

Valores completos de cada tema: `src/ui/estilo.css`.

**Cor viva (`--sel`)**: item selecionado (preenchido, com `--sel-ink` por cima), anel de foco, contorno das caixas de destaque e do selo da ofensiva com o dia garantido. É ela que dá vida aos detalhes: sem cor viva, o tema fica lavado.

O tema Névoa (fundo Névoa, ação Cobalto) foi testado e retirado em 24/11/2026. A paleta Dia antiga (Anil `#3A5BD9`, Céu `#BFD6FF`, Água `#8FE0D6`, Mel `#FFD27A`, Ardósia `#2B3350`, Neve `#F7F9FF`) saiu da interface em 24/11/2026: não é da logo. Os tokens continuam em `tokens.json` só para peças de divulgação antigas.

## Tokens de função

A interface usa só estes nomes (em `src/ui/estilo.css`); cada um muda de valor com o tema.

| Token CSS | Areia | Lagoa | Noite | Cobalto | Pavão | Uso |
|---|---|---|---|---|---|---|
| `--bg` | `#F6F2EA` | `#EBF4F4` | `#0B1E3F` | `#131C30` | `#092525` | Fundo da tela |
| `--surface` | `#FFFDF9` | `#FCFDFD` | `#1A2E51` | `#1C2740` | `#0D3635` | Cartões, blocos, folhas |
| `--surface-subtle` | `#EEE8DD` | `#DCEAEA` | `#122544` | `#263350` | `#0B2D2D` | Áreas recuadas, trilho das barras, alternativas |
| `--campo` | `#FFFDF9` | `#FCFDFD` | `#081730` | `#131C30` | `#071D1D` | Fundo de campo de texto |
| `--borda-campo` | `#8C8270` | `#628D8C` | `#607BA9` | `#5E73A1` | `#318C8A` | Contorno de campo de texto |
| `--border` | `#E3DBCC` | `#CADDDD` | `#2E4266` | `#324162` | `#174F4E` | Contorno decorativo de cartões |
| `--border-control` | `#8C8270` | `#628D8C` | `#607BA9` | `#5E73A1` | `#318C8A` | Contorno de botões secundários e caixas de seleção |
| `--text` | `#0B1E3F` | `#0B1E3F` | `#EEF3FB` | `#EBEFFA` | `#EAF6F6` | Texto principal |
| `--text-muted` | `#4A566C` | `#3B4D6D` | `#B2C1DC` | `#ADB9D1` | `#A8C7C7` | Texto secundário |
| `--placeholder` | `#5E6779` | `#58667E` | `#8B9DBB` | `#8F9CB7` | `#8DB0AF` | Texto de exemplo nos campos |
| `--accent` | `#0B1E3F` | `#0D7776` | `#13A3A0` | `#1F4FD1` | `#56D2D0` | Botão principal |
| `--accent-ink` | `#EEF3FB` | `#FFFFFF` | `#0B1E3F` | `#FFFFFF` | `#071D1D` | Texto do botão principal |
| `--accent-off` | `#DDD8CE` | `#D0E1E1` | `#2C3E5E` | `#33405B` | `#274948` | Botão principal desativado |
| `--accent-off-ink` | `#4F5A6E` | `#476665` | `#A0B0CA` | `#A3ADC2` | `#99B8B7` | Texto do botão desativado |
| `--accent-soft` | `#E5E2DB` | `#D9F2F1` | `#0F3E3D` | `#1E3466` | `#114A49` | Fundo de caixa de destaque |
| `--accent-text` | `#22407A` | `#096D6B` | `#4FD1CC` | `#8AA6F2` | `#85E0DF` | Links |
| `--sel` | `#0B1E3F` | `#0D7776` | `#13A3A0` | `#3A68E6` | `#56D2D0` | Seleção cheia, foco, contorno de destaque |
| `--sel-ink` | `#EEF3FB` | `#FFFFFF` | `#0B1E3F` | `#FFFFFF` | `#071D1D` | Texto sobre a seleção |
| `--barra` | `#0E7F7C` | `#118D8B` | `#4FD1CC` | `#2FBFBB` | `#56D2D0` | Barras de progresso, "hoje" da ofensiva |
| `--gold` | `#C9933A` | `#C9933A` | `#C9933A` | `#D4A24F` | `#C9933A` | Conquistas |
| `--gold-ink` | `#0B1E3F` | `#0B1E3F` | `#0B1E3F` | `#131C30` | `#1E1405` | Texto sobre conquista |
| `--success` | `#2E6A3A` | `#1F6B3F` | `#6FD39A` | `#6FD39A` | `#7FD9A0` | Acerto |
| `--danger` | `#A3322B` | `#A8242D` | `#F2928F` | `#F29A9A` | `#FF9C8F` | Erro, apagar |
| `--warning` | `#855200` | `#885207` | `#EBBD62` | `#E8BE6A` | `#E9C26E` | Prazo, folgas |
| `--simbolo-fundo` | `#0B1E3F` | `#0B1E3F` | `#0B1E3F` | `#081121` | `#051514` | Quadrado atrás do símbolo |

## Contraste

Nos cinco temas, todo texto passa de 4,5:1 sobre o fundo em que aparece, e contornos de controle, seleção e barras passam de 3:1. Conferido com script em 24/11/2026 (pares: texto, texto secundário e placeholder sobre fundo, cartão, área recuada e campo; texto de botão, de botão desativado, de seleção e de conquista; links sobre fundo, cartão e destaque; estados sobre o fundo suave deles e sobre o cartão).

## Regras

- `acao` aparece uma vez por tela, no botão que a pessoa mais provavelmente vai tocar.
- `conquista` só para o que foi conquistado. Não use bronze em botões, links ou avisos.
- Estado nunca só por cor: acerto leva ✓ e a palavra, erro leva ✕ e a palavra, aviso leva a frase inteira.
- Turquesa e bronze nunca são cor de texto sobre fundo claro (2,7:1 a 3:1).
- Cobalto não serve para texto sobre Noite (2,4:1): use `acao-texto`.
- Sem degradês na interface, com uma exceção: o estilo Suave (seção abaixo). Os anéis do ocelo são cores chapadas lado a lado, nunca misturadas.

## Estilo Suave (P121)

Além do tema de cor, há o **estilo**, escolhido em Preferências → Estilo e gravado em `tatino-estilo` (`data-estilo` na raiz; `src/ui/tema.ts` e `index.html`): **Suave** (padrão) ou **Clássico** (cartões com borda e cores chapadas, o visual de antes). Qualquer estilo combina com qualquer tema. Por ora o Suave muda só a tela Meus baralhos (`[data-estilo='suave'] .meus-baralhos`), no jeito do "Now brief": saudação grande, frases de seção fora dos cartões, cartões sem borda com cantos de 28px, botões em pílula. A saudação e as frases de seção aparecem nos dois estilos.

| Token | Claros (Areia, Lagoa) | Escuros (Noite, Cobalto, Pavão) | Uso |
|---|---|---|---|
| `tom-mistura` | 16% | 24% | quanto da cor do baralho entra no fundo do cartão |
| `tom-4` | Noite | metade Turquesa, metade Cobalto | quarta cor do revezamento (a Noite some no fundo escuro) |
| `tom-5` | Névoa | Névoa a 50% da superfície | quinta cor (com 24% cheia, o texto secundário ficava em 3,6:1) |
| `grad-destaque` | Turquesa 18% → Cobalto 14% sobre a superfície | a cor viva do tema (`sel`) 12% → 26% sobre a superfície (Pavão: 8% → 17%, porque a Turquesa clara pesa mais) | cartão de destaque |
| `brilho` | sombra Turquesa suave | sombra da cor viva do tema | em volta do cartão de destaque |
| `fundo-grad` | superfície sutil (70%) no topo → `bg` em 420px | superfície (55%) no topo → `bg` | fundo da tela, sempre da família de neutros do tema |
| `accent-soft` (só no Suave, escuros) | — | a cor viva do tema 22% sobre a superfície | número do passo, item selecionado suave, avisos |

Regras:
- Cartão de baralho: cor da logo pela posição na lista (Turquesa, Cobalto, Bronze, `tom-4`, `tom-5`), misturada à superfície em 160°, sumindo até 75% do cartão. Organizar muda a ordem e, com ela, as cores.
- Nos escuros, nada de Turquesa e Cobalto misturados no mesmo degradê nem cor de destaque fora da família do tema: puxava para o verde sobre o azul (relato do Marcelo, 24/11).
- Texto e texto secundário conferidos por script sobre o ponto mais forte de cada degradê, nos cinco temas: todos ≥ 4,5:1.
- A barra de domínio continua `barra`; o botão principal continua `acao`.

