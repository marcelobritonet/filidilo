# Tipografia

Duas famílias do Google Fonts, gratuitas e com acentos completos do português.

| Família | Token | Para quê | Pesos |
|---|---|---|---|
| **Sora** | `display` | Nome da marca, títulos, a pergunta do cartão, números grandes | 600, 700 |
| **Inter** | `texto` | Todo o resto: resposta, botões, listas, ajuda | 400, 600, 700 |

Sora é geométrica e redonda, combina com os círculos do ocelo. Inter é feita para tela pequena e lê bem em 14px.

## Escala

| Estilo | Família | Tamanho / linha | Peso | Onde |
|---|---|---|---|---|
| `nome-marca` | Sora | 36 / 36 | 700, -0,03em | Só o logotipo |
| `numero-destaque` | Sora | 44 / 46 | 700 | Placar final, dias da ofensiva, conquistas |
| `titulo-tela` | Sora | 32 / 38 | 700 | Um por tela |
| `frente-cartao` | Sora | 28 / 38 | 600 | A pergunta |
| `titulo-secao` | Sora | 22 / 28 | 600 | Blocos, nome do baralho |
| `verso-cartao` | Inter | 19 / 29 | 400 | A resposta |
| `corpo` | Inter | 17 / 27 | 400 | Texto da interface |
| `botao` | Inter | 17 / 20 | 600 | Rótulos de botão |
| `legenda` | Inter | 14 / 20 | 400 | Contagens, ajuda |
| `rotulo` | Inter | 12 / 14 | 700, 0,1em, maiúsculas | PERGUNTA, RESPOSTA |

## Regras

- Texto do app em 17px no mínimo para leitura corrida; nunca abaixo de 14px.
- Frases em caixa de frase ("Meus baralhos", não "Meus Baralhos").
- Maiúsculas só no estilo `rotulo`, com até duas palavras.
- Números que se alinham em coluna (contagens, placar, horas) usam algarismos tabulares (`font-variant-numeric: tabular-nums`).
- Fórmulas do cartão (KaTeX) mantêm a fonte própria do KaTeX, no tamanho do texto ao redor.
- Itálico só para termos estrangeiros e nomes de obras.
