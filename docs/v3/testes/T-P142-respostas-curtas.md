# Teste P142 — respostas curtas (28/11/2026)

Regra nova "Uma resposta, um fato" (VERSAO_INSTRUCAO 15, VERSAO_PLANO 12), em criar com IA, Aprender, "mais cartões" e renovação, e fora da formatação ("Já tenho as perguntas" mantém as palavras da pessoa). O que a regra pede:
- Resposta de pergunta aberta com até 15 palavras, sem lista.
- Uma resposta com partes vira um cartão por parte, ou colunas.
- Nada de "Cite os 5…".
- Alternativas com até 12 palavras.

A checagem fica em `src/core/ia/tamanho.ts`:
- **O que conta como longa:** resposta acima de 160 caracteres ou com lista dentro (3 ou mais linhas, itens numerados, partes separadas por ";"), e alternativa acima de 120 caracteres.
- **O que acontece:** vira erro, que volta no pedido de correção.

Gemini sem login, levado pelo endereço da aba. **ChatGPT: não testado, pediu login.**

| Teste | Resultado |
|---|---|
| Aprender, "causas e consequências da Primeira Guerra", nível "Já sei bastante" (assunto que costuma dar respostas longas) | 15 cartões na proporção (5/4/2/2/2). As 2 perguntas abertas vieram com respostas de 13 e 20 caracteres ("Guerra total", "Dilema de segurança"); a maior alternativa tem 33. Conteúdo a conferir: "Dilema de segurança" para "o temor de que recuar numa crise enfraqueça a dissuasão" é discutível |
| Renovação de um cartão antigo com resposta em lista ("Quais foram as principais causas…?" → "1) imperialismo; 2) nacionalismo; 3) corrida armamentista; 4) alianças; 5) assassinato em Sarajevo") | A IA dividiu em 5 cartões de alternativas: o original (id mantido) virou "Qual fator… envolveu a disputa por territórios além da Europa?" → Imperialismo, e 4 cartões novos, um por causa. `lerRenovacao` leu tudo sem erro |
| Cartões de fábrica (One Piece, 49) | Nenhum é marcado como longo pela checagem |

A renovação passa a oferecer também os cartões com resposta longa, mesmo os já renovados. O cartão sai curto, porque a leitura recusa resposta longa.
