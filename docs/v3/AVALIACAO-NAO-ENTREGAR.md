# Avaliação: o enunciado não entrega a resposta (P89)

A regra nova ("## Não entregue a resposta") está em `regraNaoEntregar()`, em `src/core/ia/instrucao.ts`. Ela entra na instrução de cartões, na de formatação ("Já tenho as perguntas") e na de plano. O pedido de "Corrigir cartão" ganhou uma linha com a mesma checagem.

## Gemini (anônimo, gemini.google.com) — 21/11/2026

Cada pedido rodou numa conversa nova, com a instrução gerada por `montarInstrucao` / `montarInstrucaoFormatacao`; o hash SHA-256 conferiu com o texto do app. O formato foi checado com `lerResposta` (regras de `validar.ts`) e o conteúdo, cartão a cartão.

| # | Pedido | Válidos (formato) | Entregam a resposta | Observação |
|---|---|---|---|---|
| 1 | Gerar: "Fotossíntese", 15 cartões, teoria | 15/15 | 0 | c9 (lacunas, "síntese de ATP… é chamada de ____" → fotofosforilação) é de fronteira, porque "síntese de ATP" lembra "fosforilação", mas não entrega |
| 2 | Converter 5 perguntas que entregam a resposta de propósito (1ª versão da regra) | 5/5 | 1 | A da Lei da Inércia continuou com a palavra "inércia" na pergunta; as outras 4 foram reescritas |
| 3 | Mesmas 5, depois de acrescentar "se a resposta é um nome, descreva a ideia sem citar palavra do nome" | 5/5 | 0 | DNA ficou de fronteira: "O que é o ácido desoxirribonucleico?", com o verso começando pelo mesmo nome. A parte a lembrar (a função) não está na pergunta |

Perguntas usadas na conversão:

1. O processo de fotossíntese, que ocorre nos cloroplastos, é chamado de ____. R: fotossíntese
2. Qual o nome da Lei da Inércia de Newton? R: Lei da Inércia (1ª lei de Newton)
3. Qual organela, a mitocôndria, é responsável pela respiração celular? R: mitocôndria
4. O DNA (ácido desoxirribonucleico) é o quê? R: ácido desoxirribonucleico, a molécula que guarda a informação genética
5. A capital do Brasil, Brasília, foi inaugurada em que ano? R: 1960

## ChatGPT (sem login, chatgpt.com) — 21/11/2026

Mesma forma de testar, já com a 2ª versão da regra (a do "nome"), em conversas novas.

| # | Pedido | Válidos (formato) | Entregam a resposta | Observação |
|---|---|---|---|---|
| 4 | Gerar: "Fotossíntese", 15 cartões, teoria | 15/15 | 0 | c14 (lacunas, "a energia luminosa… a quebra da água é chamada de ____" → fotólise) é de fronteira: a frase dá as duas raízes da palavra |
| 5 | Converter as mesmas 5 perguntas | 5/5 | 0 | DNA saiu melhor que no Gemini ("Qual é a molécula que armazena a informação genética?"). No cartão do ano, a outra forma da certa ("No ano de 1960") ficou maior que as erradas, o que já era proibido antes desta mudança |

Nas duas IAs, toda associação veio com a certa no índice 0. Isso não é problema, porque o app embaralha as opções.

Não testado: instrução de plano ("Aprender"), cálculo e "Corrigir cartão".
