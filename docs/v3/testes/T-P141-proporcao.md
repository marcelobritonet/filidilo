# Teste P141 — proporção dos tipos com números exatos (28/11/2026)

Instruções geradas pelo app em localhost (VERSAO_INSTRUCAO 14, VERSAO_PLANO 11) e levadas ao Gemini sem login pelo endereço da aba. **ChatGPT: não testado, pediu login.**

Antes, a regra dizia "cerca de 25% conceito…" (somava 95%), e o plano não tinha proporção nenhuma: a IA caía na pergunta aberta. Agora o app calcula a quantidade de cada tipo (`src/core/ia/proporcao.ts`, maior resto) e pede os números exatos, com a contagem feita antes de responder.

| Pedido | Pedido ao Gemini | Veio |
|---|---|---|
| Criar com IA, assunto "Sistema solar", 15 cartões, só teoria | 5 alternativas, 4 V/F, 2 lacunas, 2 colunas, 2 abertas | **Exato:** 5 / 4 / 2 / 2 / 2 |
| Aprender, fotossíntese 9º ano, 1ª versão (cálculo incluído com "troque se não houver contas") | 4 / 3 / 2 / 2 / 2 + 2 cálculos | Exato, mas **inventou 2 cálculos** ("moléculas de oxigênio liberadas") num assunto sem contas |
| Aprender, fotossíntese, versão final (no plano, cálculo só "se o assunto pedir contas") | 5 / 4 / 2 / 2 / 2 | **Exato, sem cálculo** |
| Aprender, juros compostos (assunto com contas) | 5 / 4 / 2 / 2 / 2, trocando 2 alternativas por cálculo | **3 alternativas, 4 V/F, 2 lacunas, 2 colunas, 2 abertas e 2 cálculos**; os 15 passaram no validador do app |

## Conteúdo

- Um cartão de colunas ambíguo no sistema solar: "Planeta → Gira em torno de uma estrela" também serve para "Asteroide". A regra já pede "qualquer combinação de 4 com uma resposta só"; fica para observar.

## Telemetria

`ia_resposta_lida` e `aprender_resposta_lida` passam a levar a contagem por tipo (`tipo_associacao`, `tipo_vf`…) e a versão da instrução, para ver no PostHog se as IAs cumprem a proporção.
