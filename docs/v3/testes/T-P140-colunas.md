# Teste P140 — ligar colunas (28/11/2026)

Instrução do plano (`montarPlano`, VERSAO_PLANO 10, com as regras de VERSAO_INSTRUCAO 13), com o pedido "Quero revisar autores e obras do Romantismo e do Realismo brasileiros para o vestibular", nível "Boas noções". Levada ao Gemini sem login pelo endereço da aba; a resposta voltou ao app em localhost pelo mesmo caminho.

**ChatGPT: não testado, pediu login.**

| Rodada | Resultado no Gemini |
|---|---|
| 1 (regra inicial) | 15 cartões, 2 de "colunas" (obra ↔ autor; obra ↔ característica), com 3 enunciados a mais e 6 pares cada. **Erro:** "José de Alencar" duas vezes à direita (Iracema e Lucíola). O app recusou o cartão ("itens da direita repetidos") e ofereceu o pedido de correção. Os outros 14 entraram |
| 2 (regra com "nenhum item se repete… dois livros do mesmo autor não entram no mesmo cartão") | 2 cartões de colunas (poeta ↔ traço; obra ↔ foco da crítica), sem item repetido. Conteúdo certo, com um detalhe: "Mulato" em vez de "O Mulato" |

## No app (localhost, 375×812)

- **Sessão:** o cartão aparece como "Ligue as colunas", com 4 pares sorteados e a direita embaralhada. Na volta seguinte vieram outro enunciado e outros 4 pares.
- **Ligar:** toca à esquerda e depois à direita; o mesmo número aparece nos dois itens, e o app escolhe sozinho o próximo item solto da esquerda. "Conferir" só fica ativo com tudo ligado.
- **Conferir com 2 pares trocados:** "✕ Não foi dessa vez", e a folha lista os 4 pares certos, com ✓ nos que a pessoa acertou e ✕ nos que errou, mais "Continuar · este cartão volta daqui a pouco".
- **Defeitos achados e corrigidos:**
  - Tocar no item que o app já tinha escolhido o desmarcava.
  - As duas colunas tinham alturas diferentes e as linhas não se alinhavam: virou uma grade única, linha a linha.
  - A hifenização automática quebrava palavras curtas.
- **Lista de cartões e conferência:** mostram o comando, os outros enunciados e todos os pares.
- **Baralho recebido com um tipo de cartão que a versão não conhece** (de uma versão futura): o cartão fica de fora e o resto entra (teste em `compartilhar.test.ts`). Na sessão, um cartão de tipo desconhecido mostra um aviso em vez de ficar vazio.

## Limite conhecido

- **Versões até a v3.38.0** não conhecem "colunas":
  - Um baralho enviado com esse tipo é recusado nelas.
  - Um cartão que chega pela sincronização aparece vazio na sessão, até o app atualizar (o PWA atualiza ao abrir).
