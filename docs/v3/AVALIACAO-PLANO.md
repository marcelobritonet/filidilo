# Avaliação da instrução de planejamento (P44 / E0)

Os 8 pedidos de teste do PLANO-V3, com a instrução do "Aprender" na v3.10.4 (plano v4, instrução v7).

## Gemini (anônimo, gemini.google.com) — 21/11/2026

Cada pedido foi rodado numa conversa nova, com a instrução idêntica à do app. A validação de formato usou as regras de `validar.ts`; as contas dos 2 cartões de cálculo foram conferidas à mão. O conteúdo foi revisado cartão a cartão.

| # | Pedido | Nível | Resposta lida | Bloco `baralho` | Válidos (formato) | Temas | O que conferir | Conteúdo |
|---|---|---|---|---|---|---|---|---|
| T1 | espanhol para viajar ao México | iniciante | Sim | Sim | 15/15 | 4 | Iniciante, sem gramática pesada: ✅ ("evitar": subjuntivo) | Sem erros |
| T2 | revisão de Cálculo 1 (sem PDF) | noções | Sim | Sim | 15/15 | 4 | Cálculo válido: ✅ (2 contas certas). Fonte com página: não testado, sem PDF | Sem erros; alternativas do c3 repetem "0/0" de 3 jeitos |
| T3 | aprender inglês | do zero | Perguntas | — | — | — | A IA faz perguntas: ✅ (3 perguntas) | O app **não reconhecia** essas perguntas (terminavam com exemplo entre parênteses); corrigido na v3.11.1 |
| T4 | história da arte, do Renascimento ao Impressionismo | noções | Sim | Sim | 15/15 | 6 | Temas em ordem cronológica: ✅ | Sem erros; alternativa fraca no c6, lacuna do c8 aceita outras palavras |
| T5 | regras do xadrez para ensinar meu filho de 8 anos | iniciante | Sim | Sim | 15/15 | 3 | Linguagem simples: ✅ | c12 impreciso ("atacado no lance seguinte") |
| T6 | One Piece até o fim do East Blue, sem spoilers | noções | Sim | Sim | 15/15 | 4 | "evitar" preenchido e sem spoilers: ✅ | **2 errados**: c5 (quem comeu Akuma no Mi afunda; marcado como falso) e c7 (frase contraditória sobre o corpo de borracha) |
| T7 | farmacologia de antibióticos para a residência | já sei bastante | Sim | Sim | 15/15 | 4 | Nível avançado, sem dados inventados: ✅ | **2 discutíveis**: c2 (cefepime para AmpC com MIC baixo é aceito pela IDSA; marcado como falso) e c9 (ceftarolina e E. faecalis) |
| T8 | Python básico para automatizar planilhas | iniciante | Sim | Sim | 15/15 | 4 | Sem tipo `calculo`: ✅. Código curto: nenhum trecho de código | Sem erros; algumas alternativas absurdas ("Comentário", "Caminho de pasta") |

**Resultado no Gemini**

| Métrica | Meta (PLANO-V3) | Resultado |
|---|---|---|
| Respostas lidas | — | 7 de 7 que deviam trazer JSON; o T3 fez perguntas, como esperado |
| Bloco `baralho` presente | 100% | 100% (7/7) |
| Cartões válidos (formato) | ≥ 90% | **100%** (105/105) |
| Temas na ordem | — | Sim nos 7 |
| Perguntas quando devia (T3) | Sim | Sim, mas o app só passou a reconhecê-las na v3.11.1 |
| Cartões com conteúdo certo (revisão) | — | ~95%: 3 errados (T5 c12, T6 c5, T6 c7) e 2 discutíveis (T7 c2, c9) em 105 |

## Falta

| IA | Quem roda |
|---|---|
| ChatGPT | Marcelo |
| Claude | Marcelo |
| Copilot | Marcelo |

Para rodar: no app, "Aprender" → digitar o pedido → escolher o nível da tabela → "Copiar instrução" → colar numa conversa nova da IA → colar a resposta no passo 3. Use um aparelho marcado como teste (`?teste=1`, P79) ou o app no computador (`npm run dev`), para não sujar as estatísticas.
