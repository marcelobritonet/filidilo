# Teste P90 — questões de múltipla escolha em "Já tenho as perguntas" (21/11/2026)

Instrução gerada com `montarInstrucaoFormatacao({ texto, novo: {} })` (VERSAO_INSTRUCAO 8), colada no Gemini anônimo (gemini.google.com, modo Auto). O exemplo de formato no fim foi encurtado; as regras são as do app.

Material: Questão 31 (BWM, gabarito B), Questão 32 (MARPOL, gabarito C), Questão 33 (SOLAS, letras minúsculas, sem gabarito).

| Questão | Tipo | Frente limpa (sem cabeçalho e alternativas) | Opções | Correta | Conteúdo |
|---|---|---|---|---|---|
| 31 BWM | associacao | Sim | 4 originais | 1 (B, pelo gabarito) | Certo: Plano de Gerenciamento da Água de Lastro |
| 32 MARPOL | associacao | Sim | 4 originais | 2 (C, pelo gabarito) | Certo: lixo |
| 33 SOLAS | associacao | Sim | 4 originais | 1 (resolvida, com explicação) | Certo: Capítulo III (salvatagem) |

- JSON abriu direto; `lerPlano` leu os 3 cartões sem erro; temas por sigla (bwm, marpol, solas).
- Localhost: a resposta antiga (cartão "conceito" com as alternativas na frente e verso "B) …") foi convertida pelo app em cartão de escolha com a B marcada.

## ChatGPT (chatgpt.com, sem login, 21/11/2026)

Instrução idêntica à publicada na v3.13.1, gerada com `montarInstrucaoFormatacao` a partir do HEAD (sem as regras da P89, que ainda não foram publicadas). Mesmo material do teste no Gemini.

| Questão | Tipo | Frente limpa | Opções | Correta | Conteúdo |
|---|---|---|---|---|---|
| 31 BWM | associacao | Sim | 4 originais | 1 (B, pelo gabarito) | Certo |
| 32 MARPOL | associacao | Sim | 4 originais | 2 (C, pelo gabarito) | Certo |
| 33 SOLAS | associacao | Sim | 4 originais | 1 (resolvida, com explicação) | Certo |

- JSON abriu direto; `lerPlano` leu os 3 cartões sem erro.
- **Problema de conteúdo:** o ChatGPT preencheu "outrasFormas" (opcional para questões de prova) com frases longas que denunciam a certa entre opções curtas: "Documento que estabelece os procedimentos de gerenciamento da água de lastro a bordo." (repete palavras da pergunta) e "Resíduos e materiais descartados pelos navios." (contra "óleo", "esgoto"). O app alterna as formas da certa, então às vezes a certa aparece assim. O Gemini não preencheu.

## P92: sem "outrasFormas" e sem erradas novas (21/11/2026)

Instrução da v3.13.3 (VERSAO_INSTRUCAO 10, com as regras da P89), gerada com `montarInstrucaoFormatacao` e conferida pelo tamanho (11.880 caracteres) antes de colar. Mesmo material.

| Rodada | IA | Instrução | Resultado |
|---|---|---|---|
| 1 | ChatGPT | Só "Não use outrasFormas aqui" | 3 de 3 certos, sem outrasFormas |
| 2 | Gemini | Só "Não use outrasFormas aqui" | Questão 33 (sem gabarito) foi para "naoConvertidos" |
| 3 | Gemini | + "nunca mande para naoConvertidos por falta de gabarito" | 3 de 3 certos, 33 resolvida e explicada |
| 4 | ChatGPT | Idem rodada 3 | 3 de 3 certos, mas criou 2 erradas novas por questão e uma outraForma longa na 32 (a regra geral "1 certa e 5 ou 6 erradas" venceu a exceção) |
| 5 | ChatGPT | Final: exceção também na regra geral dos tipos | 3 de 3 certos, 4 alternativas originais, sem outrasFormas |
| 6 | ChatGPT | Final | Idem |
| 7 | Gemini | Final | Idem |

- Nas rodadas 5 e 6 o ChatGPT reescreveu um pouco a pergunta da 33 ("equipamentos de salvatagem"), sem mudar o sentido, pela regra da P89 de não entregar a resposta.
- Rodada 6: o ChatGPT mostrou um convite para entrar ou se cadastrar; deu para fechar e seguir sem login.
