# Teste P139 — renovar os cartões que já existem (28/11/2026)

Pedido gerado com `montarRenovacao` (`src/core/ia/renovar.ts`), a partir do baralho de fábrica One Piece em localhost, e levado ao Gemini sem login pelo endereço da aba (`#zz=…`). A resposta voltou ao app pelo mesmo caminho e foi colada na tela "Renovar cartões".

**ChatGPT: não testado, pediu login** (o mesmo bloqueio da P138).

## Rodada 1 — Marinha (15 cartões, 1 bloco)

| Item | Resultado |
|---|---|
| Ids | Os 15 voltaram com o mesmo id; nenhum faltou |
| Alternativas e V/F | Ganharam 3 enunciados, as erradas (5 a 7 por cartão, da mesma categoria) e 3 variantes no V/F |
| Pergunta aberta ("Quem é Coby?", "O que é um caçador de piratas?") | **Errado:** os outros enunciados pediam o nome ("Qual jovem ex-servo de Alvida…?"), e a resposta era a descrição. 5 de 6 perguntas abertas |
| No app | 15 renovados e salvos; tema marcado "✓ Renovado"; ids, total de cartões (49) e marcas mantidos |

**Ajuste:** na renovação, a pergunta aberta não ganha outros enunciados (o app tira, se vierem). A IA deve preferir trocá-la por alternativas: com resposta curta, as erradas são outros do mesmo tipo; com resposta descritiva, a certa é a descrição em até 12 palavras, as erradas são descrições de outros do mesmo assunto e os enunciados citam o termo ("Qual destas frases descreve Coby?").

## Rodada 2 — Lore (16 cartões, 2 blocos na mesma conversa)

| Item | Resultado |
|---|---|
| Bloco 1 (15) | Todos voltaram. As perguntas abertas viraram "Qual destas frases descreve Gol D. Roger / o One Piece / a Red Line / os Reis do Mar?", com 5 descrições erradas plausíveis, e os enunciados citam o termo. V/F com 3 variantes |
| Parte nova | 1 cartão "novo-1" (Calm Belt), que entrou no tema como cartão novo |
| Bloco 2 (1) | O pedido curto ("Próximo bloco…") funcionou na mesma conversa: Shichibukai renovado do mesmo jeito |
| No app | A tela mostrou "bloco 1 de 2 · Copie o pedido e cole numa conversa nova" e, depois de salvar, "bloco 2 de 2 · Cole na mesma conversa"; no fim, "✓ O tema Lore está renovado". O baralho foi de 49 para 50 cartões |
| Estudo | Os cartões renovados aparecem com outros enunciados e outras alternativas (modo Livre, 5 cartões) |

## Pontos de conteúdo que ficam

- Forma da certa com outra construção ("Subir a Reverse Mountain" entre erradas no gerúndio, "Atravessando…"): destoa. Vale uma regra "mesma construção das erradas" numa próxima mudança de instrução.
- Formas longas ("Rei dos Piratas, único a chegar ao fim da Grand Line") são cortadas pelo app quando passam das erradas.
- Sem erros no console.
