# Teste P138 — variações da pergunta (28/11/2026)

Instrução gerada com `montarInstrucao({ origem: 'tema', assunto: 'Sistema solar, ensino fundamental', quantidade: 10, mistura: 'teoria' })` (VERSAO_INSTRUCAO 12), colada sem login no Gemini (gemini.google.com, modo Auto) e no ChatGPT (chat temporário), uma conversa nova por pedido.

Rodada 1 só no Gemini, com a 1ª versão da regra. Ela mostrou dois erros, e a regra foi ajustada antes da rodada 2:
- **Forma da certa com descrição:** "Júpiter, o gigante gasoso", "Saturno, o dos anéis brilhantes".
- **Erradas de outra categoria:** luas (Titã, Io, Fobos) numa pergunta sobre planetas.

Os ajustes da regra:
- **Na instrução:** "as 2 outras formas têm o tamanho da certa… nunca acrescente descrição", "nunca complete com itens de outra categoria" e "leia cada enunciado com a resposta".
- **No app:** descarta a outra forma que for mais longa que todas as erradas (antes só em questão de prova) ou que só mude na pontuação ("Júpiter.").

## Formato (rodada 2, regra final)

| Item | Gemini | ChatGPT |
|---|---|---|
| JSON abre e o app lê sem erro | Sim | Sim |
| Enunciados por cartão (frente + `outrasFrentes`) | 4 em todos | 4 em todos |
| Variantes do V/F | 3, com verdadeiras e falsas | 4, com verdadeiras e falsas |
| Erradas nas alternativas | 12, todas planetas ou planetas anões | 12, todas planetas ou planetas anões |
| Outras formas da certa | "o planeta Saturno", "Saturno (sexto planeta)": o app descartou as duas (mais longas que as erradas) | "o planeta Marte", "Marte, planeta": o app descartou as duas |
| Tipos (10 cartões) | 3 conceito, 2 vf, 2 associacao, 3 lacunas | 3 conceito, 3 vf, 2 associacao, 2 lacunas |

## Conteúdo, cartão a cartão

| IA | Cartão | Problema |
|---|---|---|
| Gemini | Netuno (associacao) | O enunciado "Qual planeta azulado fica mais longe do Sol do que Urano?" torna certas as erradas Plutão, Éris, Makemake e Haumea. A regra já proíbe ("nenhuma errada pode virar certa em outro enunciado"), mas a IA não cumpriu e o app não consegue conferir |
| Gemini | Demais 9 | Certos. Os enunciados perguntam o mesmo fato por outro caminho (posição, exemplo, característica) |
| ChatGPT | Planetas rochosos (conceito) | A resposta é uma lista ("Planetas telúricos ou rochosos: Mercúrio, Vênus, Terra e Marte") e a pergunta já diz "rochosas". Fica para a P142 (respostas curtas) |
| ChatGPT | Satélite/Lua (lacunas) | "satélite natural da Terra" entrega a 1ª lacuna (regra antiga, não é da P138) |
| ChatGPT | Sistema Solar (vf) | As variantes falam de fatos vizinhos (8 planetas, a Lua não é estrela), não do mesmo fato |
| ChatGPT | Demais 7 | Certos |

## No app (localhost, 375×812)

- Resposta colada com 5 cartões das duas IAs: a conferência mostra "Também pode aparecer como" e "Outras afirmações"; o "resposta": "false" entre aspas numa variante foi lido como falso.
- Em 14 aparições no modo Livre, o mesmo cartão voltou com outro enunciado e outras 3 erradas. No V/F, a afirmação sorteada trouxe a resposta e a explicação dela ("Mercúrio fica mais distante do Sol do que Vênus" → Falso, com a explicação da variante).
- Editar um cartão de alternativas (explicação) manteve `outrasFrentes`, as 13 opções e as variantes dos V/F.
- Sem erros no console.

## Os outros fluxos (28/11, a pedido do Marcelo)

A instrução foi gerada pelo próprio app em localhost (`import()` do módulo pelo Vite). Ela foi levada à aba da IA pelo endereço (`#zz=…`), sem colar à mão, e o endereço foi limpo antes do envio. Só no Gemini: o ChatGPT passou a pedir login (veja abaixo).

| Fluxo | Instrução | Gemini | ChatGPT |
|---|---|---|---|
| Criar do zero (Aprender) | `montarPlano`, fotossíntese 9º ano, iniciante | Formato certo: 15 cartões, 3-4 enunciados, 3 variantes, 12 erradas. Conteúdo certo. Pontos fracos: enunciados quase sinônimos no c1; variantes falsas absurdas ("serve só para esfriar as folhas"); erradas completadas com itens fracos para chegar a 12 ("Hidrônio" entre os gases, "Fruto seco" e "Casca do fruto" entre as partes da planta) | **Não testado: pediu login.** Na 1ª tentativa, começou o JSON e trocou a resposta por "Entre para criar e baixar arquivos"; na 2ª, a página abriu direto no login |
| Já tenho as perguntas | `montarInstrucaoFormatacao`, 5 itens de biologia (1 definição, 1 V/F, 1 resposta curta, 1 questão de prova com gabarito, 1 "onde fica") | 1ª rodada: trocou "O que é a mitocôndria?" por "Qual estrutura…", e a resposta (uma definição) deixou de combinar. 2ª rodada (regra "a frente é a da pessoa"): manteve a frente, mas os outros enunciados pediam o nome. **3ª rodada (regra final: pergunta aberta da pessoa sem `outrasFrentes`):** certo. Questão de prova com as 4 alternativas originais, sem `outrasFormas` e com 3 enunciados; V/F com 3 variantes; respostas da pessoa mantidas | Não testado: pediu login |
| Texto colado | `montarInstrucao` texto, Revolução Francesa, 6 cartões, teoria | Formato certo. Conteúdo: 1 errada parcialmente certa ("queda do Diretório" para o 18 de Brumário, que derrubou o Diretório); variantes do V/F sobre fatos vizinhos (a crise financeira num cartão sobre a Bastilha) | Não testado: pediu login |
| Mesma conversa ("mais cartões") | Conversa aberta com a **instrução antiga (v11)**, que gerou 5 cartões sem variações; depois `montarMaisDoMaterial` novo, com as regras por extenso | A IA perguntou a quantidade (sugeriu 12, limite 30) e, com "5", mandou os cartões **com** as variações: 4 enunciados, 4 variantes, 12 erradas. Erradas completadas com grupos de outras épocas (cartistas, mencheviques, bolcheviques) | Não testado: pediu login |
| PDF/imagem | `montarInstrucao` arquivo | Não testado: o navegador do agente não anexa arquivo. As regras são as mesmas do texto colado; muda só a seção "Material" | Não testado |

### O que mudou por causa destes testes
- `montarMaisDoMaterial` traz as regras dos 3 tipos com variações e a seção "Variações" por extenso, e diz para usá-las mesmo que a primeira instrução não pedisse.
- `montarInstrucaoFormatacao`: "A frente é a pergunta da pessoa: não a troque por outra. No tipo conceito, não crie outrasFrentes."

### Até 12 erradas (decisão do Marcelo, 28/11)
A regra passou de "1 certa e 12 erradas" para "1 certa e **até** 12 erradas". Ela pede só erradas boas, da mesma categoria e que quem estuda poderia escolher: "é melhor 6 erradas boas que 12 com itens fracos ou de outra categoria". Teste no Gemini com os dois casos que tinham enchido as erradas:

| Caso | Antes (12 erradas) | Depois (até 12) |
|---|---|---|
| Criar do zero, fotossíntese | "Hidrônio" entre os gases; "Fruto seco" e "Casca do fruto" entre as partes da planta | 3 cartões de alternativas, com 6 erradas cada, da mesma categoria (açúcares: amido, sacarose, frutose…; gases) |
| Texto colado, Revolução Francesa | Cartistas, mencheviques e bolcheviques entre os grupos | 5 erradas, todas personagens da revolução (Luís XVI, Robespierre, La Fayette, Marat, Danton) |

Com 5 ou 6 erradas, cada aparição ainda sorteia 3 delas, e a combinação muda de uma vez para outra.

### O que continua
- **Variantes do V/F:** às vezes falam de fatos vizinhos, e não do mesmo fato.
- **ChatGPT:** os fluxos novos não foram testados nele (pediu login). Precisa de um teste do Marcelo ou de liberar o acesso.
