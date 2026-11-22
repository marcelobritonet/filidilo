# Teste P99: baralho a partir de arquivo (PDF, foto ou print) (22/11/2026)

A instrução foi gerada com `montarPlano({ pedido: '', nivel: 'iniciante', origem: 'arquivo' })` (VERSAO_PLANO 8, VERSAO_INSTRUCAO 11) e colada numa conversa nova de cada IA, sem login. O exemplo de formato do fim foi colado em JSON compacto; as regras são as do app.

O navegador do agente não consegue anexar arquivo. Por isso o material (2 páginas de "Aula 3 - Dinâmica") foi colado como texto, avisando que não dava para anexar.

## Resultado por etapa

| Etapa | Gemini (anônimo) | ChatGPT (sem login) |
|---|---|---|
| 1. Instrução sem anexo | Pediu o arquivo numa frase ("anexe o PDF ou as fotos… pelo clipe 📎") e não criou cartões | Pediu o arquivo numa frase e não criou cartões |
| 2. Material enviado | "Li as 2 páginas sobre Dinâmica… Nenhuma parte ficou ilegível. Quantos cartões você quer? Sugiro 12." | "Li as 2 páginas da Aula 3 — Dinâmica. O conteúdo está legível… Quantos cartões você quer? Sugiro 18 cartões." |
| 3. Resposta "12" | 12 cartões num bloco JSON | 12 cartões num bloco JSON |
| Fonte | Todos com "Aula 3 - Dinâmica" e a página certa (1 ou 2) | Todos com "Aula 3 - Dinâmica" e a página certa |
| Formato (leitor do app) | `lerPlano`: 11 de 12 válidos. c12 (cálculo) usa `F_{\text{at}}` e o app acusa "marcador sem valor {at}"; o pedido de correção resolve | Conferido por script: 12 cartões, temas existentes, fonte com página. O validador completo não foi rodado |
| Conteúdo | Bom. c8 (lacunas) repete "atrito" na frase com a resposta "atrito" (entrega a resposta) | c5 (lacunas) ruim ("Um newton equivale a ____ multiplicado por ____" → "kg·m/s²", "1"); c12 traz em "outrasFormas" a própria pergunta; c11 junta duas perguntas |
| Anexar arquivo sem login | **Não dá**: "Faça login para… adicionar arquivos" | **Não dá**: "Entre para enviar um arquivo" |

## Conclusões

| # | Conclusão |
|---|---|
| 1 | O fluxo novo funciona nas duas IAs: pedem o arquivo, contam o que leram e perguntam a quantidade antes de mandar o JSON. |
| 2 | O app reconhece a mensagem "Quantos cartões você quer? Sugiro N." como pergunta da IA, e não como erro (`parecePerguntas`, corrigido neste item). |
| 3 | Gemini e ChatGPT só aceitam anexo com conta. A tela agora avisa isso e oferece a opção Texto para quem não tem conta. |
| 4 | Os erros de conteúdo (palavra da lacuna repetida, "outrasFormas" que entrega a resposta, `{at}` do LaTeX) não vêm desta mudança: são das regras gerais (P89/P90). |
| 5 | **Não testado:** anexar um PDF e uma foto de verdade (precisa de login). Fica para o Marcelo. |

## Depois do teste (22/11)

A pedido do Marcelo, o app deixou de pedir nome e páginas. Agora, na etapa 2, a instrução também manda a IA perguntar "Quer usar o material todo ou só algumas páginas?", e o texto diz "imagens" no lugar de "fotos ou prints". Reteste da versão final, com a mesma instrução do app (o hash do texto antes do exemplo confere) e o mesmo material colado:

| Etapa | Gemini (anônimo) | ChatGPT (sem login) |
|---|---|---|
| Sem anexo | "Por favor, anexe o PDF ou as imagens do material (pelo botão + ou pelo clipe 📎)." | Pediu o PDF ou as imagens pelo botão + ou pelo clipe |
| Material enviado | Disse o que leu e perguntou "Quer usar o material todo ou só algumas páginas? Quantos cartões você quer? Sugiro 12." | Disse o que leu e fez as duas perguntas ("Sugiro 20 cartões") |
| Resposta "Só a página 2. 10 cartões." | 10 cartões, todos da página 2, fonte "Aula 3 - Dinâmica" | 10 cartões, todos da página 2, JSON válido |
| Conteúdo | Bom; dois cálculos com `F_{at}` em LaTeX, que o app pede para corrigir (P89/P90) | Quase todos do tipo conceito; alguns entregam pista na pergunta (regras gerais, não desta mudança) |
