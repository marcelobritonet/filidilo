# Cores

Duas paletas, as duas azuis. A **Noite** veste o tema escuro e é a cor de identidade da marca (o ícone do app é sempre Noite). O **Dia** veste o tema claro, mais macio e pastel.

## Paleta Noite

| Cor | Hex | Token | Papel |
|---|---|---|---|
| Noite | `#0B1E3F` | `marca-noite` | Fundo do tema escuro e do ícone do app |
| Cobalto | `#1F4FD1` | `marca-cobalto` | Anel do ocelo; grandes áreas em divulgação |
| Turquesa | `#13A3A0` | `marca-turquesa` | A gota do símbolo; ação no tema escuro |
| Bronze | `#C9933A` | `marca-bronze` | Anel do ocelo; conquistas |
| Névoa | `#EEF3FB` | `marca-nevoa` | Texto sobre Noite; brilho do ocelo |

Proporção numa tela escura: cerca de 70% noite, 20% das superfícies azuladas, 7% turquesa, 3% bronze.

## Paleta Dia

| Cor | Hex | Token | Papel |
|---|---|---|---|
| Anil | `#3A5BD9` | `marca-anil` | Ação no tema claro |
| Céu pastel | `#BFD6FF` | `marca-ceu` | Preenchimentos de apoio |
| Água | `#8FE0D6` | `marca-agua` | Progresso e acerto em áreas grandes |
| Mel | `#FFD27A` | `marca-mel` | Conquistas |
| Ardósia | `#2B3350` | `marca-ardosia` | Texto |
| Neve | `#F7F9FF` | `marca-neve` | Fundo do tema claro |

Proporção numa tela clara: cerca de 75% neve e branco, 15% céu e água, 7% anil, 3% mel.

## Tokens de função

A interface usa estes nomes; cada um muda de valor com o tema.

| Token | Noite | Dia | Uso |
|---|---|---|---|
| `fundo` | `#0B1E3F` | `#F7F9FF` | Fundo da tela |
| `superficie` | `#12295A` | `#FFFFFF` | Cartões, blocos, folhas |
| `superficie-sutil` | `#0F244D` | `#EEF3FB` | Áreas recuadas |
| `texto` | `#EEF3FB` | `#2B3350` | Texto principal |
| `texto-suave` | `#A9B8D9` | `#5A6480` | Texto secundário |
| `acao` / `sobre-acao` | `#13A3A0` / `#06142B` | `#3A5BD9` / `#FFFFFF` | Botão principal e o texto dele |
| `acao-texto` | `#4FD1CC` | `#3A5BD9` | Links |
| `conquista` / `sobre-conquista` | `#C9933A` / `#06142B` | `#FFD27A` / `#2B3350` | Selos e recordes |
| `foco` | `#4FD1CC` | `#3A5BD9` | Anel de foco |
| `sucesso` | `#7DD3A8` | `#1F7A5C` | Acerto |
| `perigo` | `#F2A08F` | `#B4402F` | Erro, apagar |
| `atencao` | `#E8C26A` | `#8A5A00` | Prazo, folgas |

## Contraste

Todos os pares de texto passam de 4,5:1 nos dois temas.

| Par | Noite | Dia |
|---|---|---|
| `texto` sobre `fundo` | 14,8:1 | 11,8:1 |
| `texto` sobre `superficie` | 12,7:1 | 12,4:1 |
| `texto-suave` sobre `superficie` | 7,1:1 | 5,9:1 |
| `sobre-acao` sobre `acao` | 5,9:1 | 5,7:1 |
| `acao-texto` sobre `superficie` | 7,6:1 | 5,7:1 |
| `sobre-conquista` sobre `conquista` | 6,8:1 | 8,7:1 |
| `sucesso` sobre `sucesso-suave` | 6,5:1 | 4,6:1 |
| `perigo` sobre `perigo-suave` | 6,1:1 | 4,7:1 |

## Regras

- `acao` aparece uma vez por tela, no botão que a pessoa mais provavelmente vai tocar.
- `conquista` só para o que foi conquistado. Não use bronze ou mel em botões, links ou avisos.
- Estado nunca só por cor: acerto leva ✓ e a palavra, erro leva ✕ e a palavra, aviso leva a frase inteira.
- Água, céu e turquesa nunca são cor de texto sobre fundo claro.
- Cobalto não serve para texto sobre Noite (2,4:1): use `acao-texto`.
- Sem degradês na interface. Os anéis do ocelo são cores chapadas lado a lado, nunca misturadas.
