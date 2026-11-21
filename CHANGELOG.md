# Changelog

Mudanças do Tatino, da mais recente para a mais antiga. As versões seguem [SemVer](https://semver.org/lang/pt-BR/): o primeiro número sobe quando o jeito de usar muda, o do meio a cada novidade, o último a cada correção. A versão em uso aparece no rodapé de todas as telas.

## [3.13.3] — 2026-11-21

**Questões de prova ficam com as alternativas originais, sem pistas da certa.**

### Corrigido
- Em "Já tenho as perguntas", o ChatGPT às vezes criava uma "outra forma" da alternativa certa, mais longa que as erradas (por exemplo, "Resíduos e materiais descartados pelos navios" no meio de "óleo" e "esgoto"), o que entregava a resposta. Agora a IA usa só as alternativas da questão, e o app descarta essa outra forma quando ela é mais longa que todas as erradas.
- A IA também não cria mais alternativas erradas a mais nessas questões.
- Questão sem gabarito não fica mais de fora: a IA resolve, marca a certa e explica.

## [3.13.2] — 2026-11-21

**Cartões da IA que não entregam a resposta na pergunta.**

### Corrigido
- Os cartões criados com IA às vezes traziam a resposta na própria pergunta: o termo pedido no enunciado, a palavra da lacuna repetida na frase, a sigla já por extenso. A instrução que você cola na IA agora pede para conferir cada cartão e reescrever a pergunta quando der para acertar sem saber o conteúdo.
- Em "Já tenho as perguntas", se uma pergunta sua entrega a resposta, a IA reescreve só a pergunta. A resposta continua com as suas palavras.
- "Corrigir cartão" também confere isso.

## [3.13.1] — 2026-11-21

**Questões de prova com alternativas viram cartão de escolha.**

### Corrigido
- Em "Já tenho as perguntas", questões com alternativas (A, B, C, D) às vezes viravam um cartão de pergunta e resposta com as alternativas e o "Questão 31 | …" no meio do texto. Agora viram cartão de "Escolha a alternativa correta": só a pergunta em cima e cada alternativa num botão. Se a IA errar o formato mesmo assim, o app arruma sozinho ao ler a resposta.
- Questões sem gabarito também entram: a IA marca a certa e explica por quê.
- Um cartão que já ficou assim pode ser consertado em "Corrigir cartão": o pedido para a IA agora transforma em cartão de escolha.

## [3.13.0] — 2026-11-21

**Ofensiva diária: um motivo para estudar todo dia, sem pressão.**

### Novo
- **Ofensiva**: conta os dias seguidos em que você terminou pelo menos uma sessão (sair pelo X não conta). O selo 🔥 com o número fica no topo de Meus baralhos.
- **Fio do dia**: enquanto falta a sessão de hoje, um fio no topo encolhe até a meia-noite e o cartão "Falta uma sessão hoje" mostra a semana, quanto tempo resta e o botão Estudar (abre o último baralho estudado). A partir das 21h, o fio e a chama piscam devagar (com "reduzir movimento", não piscam).
- **Hoje garantido**: ao terminar a primeira sessão do dia, o fim da sessão mostra "🔥 N dias · Hoje garantido", e em Meus baralhos o fio e o cartão somem e o selo fica verde com ✓.
- **Folgas** (até 2): cobrem um dia sem sessão, e a ofensiva continua. Você ganha uma ao criar um baralho, ao criar cartões com IA (uma por dia para cada um) e a cada 7 dias seguidos.

### Mudou
- A sequência das conquistas e das imagens de compartilhar passou a ser a da ofensiva (dias com sessão concluída). Na primeira vez, os dias em que você já tinha estudado contam.
- O backup leva a ofensiva e as folgas.

## [3.12.0] — 2026-11-21

**Você escolhe a ordem dos baralhos.**

### Novo
- Em Meus baralhos, toque em "Organizar" (acima da lista) e arraste cada baralho pela alça ⠿ para pôr na frente os que mais usa. "Pronto" fecha. A ordem fica guardada neste aparelho. Com teclado, a alça sobe e desce com as setas.
- Depois de organizar, baralho novo (criado, recebido ou duplicado) aparece no topo da lista. Quem nunca organizou continua vendo a lista em ordem alfabética.

## [3.11.2] — 2026-11-21

**O ícone do tatino. aparece na aba de todos os navegadores.**

### Corrigido
- O Safari e alguns leitores de link não usam ícone em SVG e mostravam uma letra ou um globo na aba. Agora o app também tem o ícone em PNG (16 e 32 px) e em `favicon.ico`, e o endereço dos ícones mudou para o navegador não reaproveitar o ícone antigo guardado.

## [3.11.1] — 2026-11-21

**O app reconhece quando a IA faz perguntas com exemplos.**

### Corrigido
- Quando a IA responde com perguntas em vez dos cartões, e cada pergunta termina com um exemplo entre parênteses ("Qual é o seu objetivo? (ex.: viajar, trabalho)"), o app mostrava erro de JSON. Agora mostra "A IA fez perguntas. Responda lá e cole aqui a resposta final."

## [3.11.0] — 2026-11-21

**Comemorar e compartilhar o estudo: imagem para WhatsApp e story, sequência de dias, conquistas e desafio com um cartão.**

### Novo
- **Comemoração no fim da sessão**: quando bate a meta, acerta 80% ou mais (com 10 respostas ou mais) ou ganha uma conquista, aparece confete (sem confete com "reduzir movimento") e o título comemora.
- **Compartilhar resultado**: no fim da sessão, uma imagem com a porcentagem de acerto, os acertos, o tempo e a sequência de dias, nos formatos Story (9:16) e Quadrado. A caixa "Mostrar o nome do baralho" tira o nome da imagem e do texto. No celular abre o Compartilhar (WhatsApp, Instagram…) com a imagem e o texto com o link do app; no computador, baixa a imagem e copia o texto. A imagem é desenhada no aparelho.
- **Sequência de dias**: "🔥 N dias" em Meus baralhos e no fim da sessão. Se ainda não estudou hoje, a sequência de ontem continua valendo.
- **Conquistas**: primeira sessão, primeira meta, 3/7/14/30/60/100 dias seguidos, 100/500/1.000/5.000 cartões respondidos e baralho dominado (5 cartões ou mais). Cada uma comemora uma vez; quem já estudava antes desta versão não recebe as que já tinha.
- **Desafiar amigos**: no Enviar de um cartão (no estudo e na lista), uma imagem com a pergunta, sem a resposta, e QR code. Junto vai só o cartão ou o baralho inteiro (sem o progresso). O link do desafio vale 7 dias, para durar mais que o story. Quem abre responde o cartão primeiro e depois escolhe se salva. Cartões de cálculo ficam de fora, porque sorteiam números a cada vez.
- **Sua semana**: de domingo a terça, Meus baralhos mostra os 7 dias da semana, quantos cartões foram respondidos e o botão "Compartilhar minha semana" (o selo de dias abre a qualquer hora).
- **Indicar o tatino.**: em Meus baralhos e em Aparência, uma imagem de convite com o link e o QR code do app.

## [3.10.4] — 2026-11-21

**Estatísticas mais limpas: aparelho de teste e versão certa em cada evento.**

### Melhorado
- Abrir o app com `?teste=1` no fim do endereço marca o aparelho como de teste: as estatísticas desse aparelho ficam marcadas para sair das contas, e o rodapé mostra "aparelho de teste". `?teste=0` desmarca.
- Cada evento das estatísticas leva a versão do app do momento em que aconteceu (antes ia a versão do momento do envio).

## [3.10.3] — 2026-11-21

**Os cartões criados pela IA aparecem numa tela própria para conferir.**

### Corrigido
- Depois de colar a resposta da IA (Aprender e Criar com IA), os cartões apareciam embaixo dos passos e era preciso rolar a tela para achá-los. Agora abre a tela "Confira os cartões", já no topo, com o botão de salvar preso no rodapé.
- O ← e o voltar do Android levam de volta aos passos sem perder os cartões lidos; "Ver N cartões lidos" reabre a conferência.
- Cartões com problema: a nova resposta da IA é colada ali mesmo, no campo abaixo de "Copiar pedido de correção".

## [3.10.2] — 2026-11-21

**Aviso para conferir os cartões nos níveis mais difíceis.**

### Melhorado
- Na conferência dos cartões criados pela IA (Aprender e Criar com IA), os níveis "expert" e "extremo" mostram: "Nesse nível a IA erra mais. Confira cada cartão e desmarque o que parecer errado. Se achar um erro depois, use “Corrigir cartão” durante o estudo."

## [3.10.1] — 2026-11-21

**A IA erra menos nos níveis altos.**

### Melhorado
- As instruções para a IA pedem para conferir que nenhuma alternativa errada também responde à pergunta, que cada lacuna tenha uma resposta certa clara e, nos níveis expert e extremo, só criar cálculo com alguma sutileza, nunca a aplicação direta de uma fórmula.
- No fim, a IA revisa cada cartão "como um professor que corrige prova" e corrige ou tira o que estiver errado, sem deixar dúvidas como "Espere" no texto.
- Fórmulas sempre com os dois `$`.

## [3.10.0] — 2026-11-21

**Arquivar baralho: terminou de estudar, tira da lista sem perder nada.**

### Novo
- Em Configurar baralho, "Arquivar baralho" (acima de "Excluir baralho"), com Desfazer no aviso. O baralho sai de Meus baralhos, mas os cartões e o progresso ficam guardados.
- Em Meus baralhos, os arquivados ficam numa linha discreta no fim, "Arquivados (N)", que abre uma lista compacta. Um baralho arquivado abre e estuda normalmente, e mostra "Baralho arquivado · Desarquivar".
- Arquivar vale só para este aparelho: ao enviar o baralho, quem recebe ganha ele na lista principal. O backup guarda quais estão arquivados.

## [3.9.1] — 2026-11-21

**O ChatGPT deixou de ser recusado na hora de colar a resposta.**

### Corrigido
- O Tatino recusava respostas do ChatGPT com "Não encontrei um JSON válido" quando o JSON vinha fora do bloco de código ou copiado pelo botão "Copiar" da mensagem. Agora ele conserta sozinho o que essa cópia estraga: `&#x20;` e outras entidades HTML, escapes de Markdown (`\_`, `\*`, `\[`), espaços especiais e invisíveis, barra simples de LaTeX (`\Delta`) e quebra de linha no meio de um texto. Uma resposta que já estava certa não muda.
- Resposta cortada no meio agora dá uma mensagem própria, que pede à IA o resto em outro bloco.

### Melhorado
- As instruções para a IA (Criar com IA, Já tenho as perguntas, Aprender e Corrigir cartão) ganharam a seção "Entrega": um único bloco de código JSON na conversa, sem Canvas nem arquivo, barras dobradas, sem entidades HTML, conferir o JSON antes de responder e dividir em blocos de até 25 cartões quando não couber.

## [3.9.0] — 2026-11-21

**Depois da primeira sessão, o app sugere o tema que ficou com poucos cartões.**

### Novo
- Num baralho criado em "Aprender", o fim da primeira sessão sugere o primeiro tema do plano que ainda tem poucos cartões (abaixo da média do baralho e menos de 8). O botão abre o Criar com IA já com esse tema. Nas sessões seguintes, volta a sugerir o tema em que você mais errou ou o objetivo do baralho.

## [3.8.3] — 2026-11-21

**Menos uma pergunta para quem já tem as perguntas.**

### Melhorado
- Em "Já tenho as perguntas", o passo 1 não pergunta mais "Quanto você já sabe sobre isso?". A IA só converte as suas perguntas, então o nível não mudava nada. Se quiser, defina o nível em "Editar", na conferência, ou depois, em Configurar baralho.

## [3.8.2] — 2026-11-21

**A folha de resultado com a cara certa.** A v3.8.1 saiu sem os estilos novos.

### Corrigido
- A pergunta na folha de resultado aparece num bloco discreto, separado da resposta, e a alça mostra o texto "Ver o cartão" / "Ver o resultado" num tamanho fácil de tocar.

## [3.8.1] — 2026-11-21

**A pergunta continua à vista.** Depois de responder, a folha de resultado cobria o cartão e não dava mais para ler a pergunta.

### Melhorado
- A pergunta aparece no topo da folha de resultado, junto com a resposta e a explicação (pergunta e resposta, alternativas, verdadeiro ou falso e cada etapa do cálculo; nas lacunas a frase completa já mostra a pergunta).
- A alça da folha ganhou texto ("Ver o cartão" / "Ver o resultado"), para ficar claro que dá para recolher e ver o cartão inteiro.

## [3.8.0] — 2026-11-21

**Leve o baralho com o progresso.** Quem estuda em mais de um aparelho pode enviar o baralho junto com o que já estudou.

### Novo
- Em Enviar baralho, a caixa "Incluir meu progresso" (desmarcada) leva junto o que você já estudou, por link ou por arquivo, para continuar noutro aparelho seu. Ela só aparece se algum cartão já foi estudado.
- Quem recebe vê "Trazer o progresso" (já marcado). O estado mais recente de cada cartão vence e nada é apagado, como no Restaurar backup. Vale também para "Importar como baralho separado".
- Se você já tem o baralho igual, o botão vira "Trazer o progresso".

## [3.7.1] — 2026-11-21

**Frases de completar reconhecidas.** Em "Já tenho as perguntas", a IA agora sabe que pode transformar uma frase de completar num cartão de lacunas.

### Corrigido
- A instrução de "Já tenho as perguntas" lista o tipo "lacunas" entre os tipos que a IA pode escolher. Antes ele só aparecia no formato da resposta.

## [3.7.0] — 2026-11-21

**Baralho novo com as suas perguntas.** Quem já tem perguntas e respostas prontas pode criar um baralho do zero com elas, sem passar por um baralho existente.

### Novo
- Em Novo baralho (tela Aprender), o passo 1 ganhou o seletor "Quero aprender" | "Já tenho as perguntas". Nesse modo: cole a lista em qualquer formato, dê um nome ao baralho se quiser, e a IA só formata, sem inventar. Ela também sugere título e objetivo.
- O nível é opcional nesse modo; dá para ajustar depois em Configurar baralho.
- Os itens que a IA não conseguiu converter aparecem na conferência como "ficaram de fora".

## [3.6.3] — 2026-11-21

**Temas novos não somem mais.** Depois de criar cartões com IA, a tela Configurar baralho abria com a lista de temas antiga, e "Salvar alterações" apagava os temas novos.

### Corrigido
- Configurar baralho mostra os temas e as contagens atualizados logo depois de criar cartões com IA, e "Salvar alterações" só fica ativo quando algo muda.
- Em "Já tenho as perguntas", o passo 2 não pede mais para mandar o PDF junto.
- Contagem de tema com um cartão: "1 cartão", não "1 cartões".

## [3.6.2] — 2026-11-21

**"Não sei" nas lacunas.** No nível fácil, as lacunas ganharam o botão "Não sei", como as alternativas.

### Corrigido
- Nas lacunas com alternativas, "Não sei" mostra a frase completa e conta como erro; o cartão volta mais tarde na sessão.

## [3.6.1] — 2026-11-21

**Sorteio mais justo.** A posição da alternativa certa já mudava a cada vez, mas nas lacunas algumas ordens saíam mais que outras.

### Corrigido
- Todo sorteio do app (ordem das alternativas, opções das lacunas, ordem dos cartões, valores dos cálculos) usa o mesmo embaralhamento, em que todas as ordens têm a mesma chance, e o gerador aleatório do navegador, mais uniforme que o comum.

## [3.6.0] — 2026-11-21

**Complete a frase.** Novo tipo de cartão com lacunas, como "A Terra gira em torno do ____." E, no estudo, dá para corrigir um cartão você mesmo, sem IA.

### Novo
- **Cartão de lacunas**: escreva `____` onde a palavra falta e a resposta de cada lacuna (com `/` para sinônimos, ex.: "Sol/astro-rei"). Nos níveis do zero a boas noções, você escolhe a palavra entre alternativas, uma lacuna por vez. Do bastante ao extremo, pensa na resposta e revela.
- A IA também cria cartões de lacunas (cerca de 10% no modo misto e também no modo teoria), e o editor de cartão ganhou o tipo "Lacunas".
- **Corrigir eu mesmo**: no estudo, "Corrigir cartão" abre o editor; ao salvar, você volta à sessão com o cartão já corrigido.

### Corrigido
- Ao receber um baralho igual ao que você já tem, o app mostra "Baralho recebido · Ele já está em Meus baralhos" com o botão "Abrir baralho", em vez de um resumo vazio.

## [3.5.1] — 2026-11-21

**A versão nova chega sozinha.** Quem já tinha o app aberto continuava na versão antiga até tocar em "Atualizar".

### Corrigido
- O app procura versão nova ao voltar para ele e a cada hora, sem precisar recarregar.
- Na tela inicial, a versão nova entra sozinha. Nas outras telas (sessão, editor…) aparece o aviso "Atualizar", para não recarregar no meio do uso.

## [3.5.0] — 2026-11-21

**Já tem as perguntas? Só falta formatar.** Quem já tem perguntas e respostas, em qualquer formato, pode colá-las em Criar com IA e pedir à IA que só as converta nos cartões do tatino, sem inventar conteúdo.

### Novo
- **Criar com IA → Já tenho as perguntas**: cole a lista ou o texto como estiver (numerada, "P:/R:", tabela etc.). A instrução pede à IA que mantenha as palavras originais e escolha o tipo de cartão.
- Itens que não encaixam em nenhum tipo, ou que não têm resposta, aparecem na confira como "ficaram de fora", em vez de virar cartão sem sentido.

### Mudou
- O fluxo "Criar do zero" continua igual. Colar a resposta, validar e salvar são os mesmos nos dois modos.

## [3.4.0] — 2026-11-19

**Envie por link ou QR code.** Enviar um baralho ou um cartão agora gera um link que vale 2 horas, com QR code para ler com a câmera de outro celular. Quem abre o link cai no tatino. com o resumo de sempre (adicionar, atualizar ou importar como baralho separado). Funciona no Android, no iPhone e no computador, com ou sem o app instalado.

### Novo
- **Enviar → link e QR code**: botões Compartilhar link (ou Copiar link no computador) e o horário em que o link deixa de valer.
- **Abrir link** (`…/tatino/?b=<código>`): baixa o baralho ou o cartão e mostra o resumo de importação. Link vencido avisa "Este link expirou".
- O conteúdo fica 2 horas num serviço do Cloudflare (pasta `worker/`) e some sozinho. Só quem tem o link abre; não há lista de links.

### Mudou
- **Enviar como arquivo** continua, embaixo do link, e é o caminho sem internet.

## [3.3.0] — 2026-11-16

**O app acompanha o seu ritmo.** Ao criar cartões com IA, o tatino olha o desempenho recente do baralho e sugere o nível dos próximos cartões: um degrau mais fácil se você está errando muito, um degrau acima se está acertando quase tudo e achando fácil.

### Novo
- **Sugestão de nível em Criar com IA**: "Vamos tentar algo mais fácil?" ou "Você está indo bem. Vamos nos aprofundar e subir de nível?", com o motivo (quantas respostas acertou nas últimas 40). Os cartões já saem no nível sugerido.
- Para voltar ao nível atual é só tocar no botão. Sem respostas suficientes (menos de 15), o app não sugere nada.

### Mudou
- Nada muda no estudo nem nos baralhos existentes. A sugestão só aparece ao criar cartões e pode ser desfeita.

## [3.2.0] — 2026-11-16

**Você diz quanto já sabe.** Ao aprender uma coisa nova, a pessoa escolhe o próprio nível antes de pedir a instrução, e a IA ajusta a dificuldade e o tom dos cartões.

### Novo
- **Quanto você já sabe sobre isso?** Seis opções, do zero ao extremo: "Não sei absolutamente nada. Vou começar do zero.", "Sei pouco. Sou iniciante.", "Tenho boas noções.", "Já sei bastante sobre o assunto.", "Nível expert. Quero me aperfeiçoar." e "Nível extremo. Provavelmente vou errar todas.". A instrução só sai depois de escolher uma.
- A instrução explica para a IA o que cada nível pede: do zero explica cada termo; boas noções pergunta o porquê e o como; expert vai a casos difíceis e pegadinhas de prova; extremo vai a casos-limite, sempre com resposta certa.

### Mudou
- Os níveis antigos (iniciante, intermediário e avançado) viraram: iniciante continua iniciante, intermediário vira "Boas noções" e avançado vira "Já sei bastante". Baralhos, backups e arquivos compartilhados antigos continuam abrindo.
- O nível é o que a pessoa escolheu, não o que a IA sugere.
- Em **Configurar baralho** e na revisão, o campo se chama "Quanto você já sabe".

## [3.1.0] — 2026-11-16

**Instale o tatino. na tela inicial.** Abre em tela cheia e funciona sem internet.

### Novo
- **Convite para instalar**: um cartão discreto em Meus baralhos, a partir da 2ª abertura e no máximo uma vez por semana. Dá para responder **Agora não** (volta depois de uma semana) ou **Não perguntar mais**.
- **Instalar o app** em **Aparência**, sempre disponível até o app estar instalado. No iPhone e em outros navegadores, mostra os passos para instalar pelo menu do navegador.

### Mudou
- Nada para quem já usa: baralhos, cartões e progresso continuam iguais.

## [3.0.0] — 2026-11-16

**Aprenda qualquer coisa.** Em **Meus baralhos**, diga o que quer aprender hoje e a IA monta o baralho inteiro: objetivo, nível, temas e os primeiros cartões. O baralho nasce configurado para o que você quer, não só com a lista de cartões.

**O que muda para quem já usava:** baralhos, cartões e progresso continuam iguais (nada se perde). Saiu o formulário de criar baralho à mão e a data da prova; o que já estava salvo com data da prova continua funcionando, só que a data não aparece mais.

### Novo
- **Aprender uma coisa nova hoje**: campo no topo de Meus baralhos (e o botão **Novo baralho** abre o mesmo fluxo). Você escreve o assunto, copia a instrução para a IA, cola a resposta e confere os cartões antes de criar. Dá para anexar um PDF ou um texto de aula.
- **Objetivo do baralho**: nível (iniciante, intermediário ou avançado), foco, o que evitar e uma frase de objetivo. Fica em **Configurar baralho**, onde dá para editar tudo.
- **Subir de nível**: quando você já domina 80% ou mais dos cartões de um baralho (pelo menos 10), a tela do baralho sugere cartões um nível acima.
- Fim de sessão com objetivo: "Quer avançar em …? A IA cria mais 15 cartões." quando não há um tema com mais erros.
- Sem internet, o fluxo Aprender avisa "Precisa de internet para falar com a IA." e não abre.
- Novo mote "Aprenda qualquer coisa" na descrição do app instalado, na página e no README.

### Mudou
- **Criar com IA** usa o objetivo e o nível do baralho e não repete o que ele já tem (o resumo do que já existe vai junto na instrução). Ao vir do fim de uma sessão, a IA recebe o tema em que você errou mais.
- Sem objetivo, o Criar com IA mostra um link discreto **Definir objetivo**.
- **Corrigir cartão com IA** leva o objetivo e o nível, para a correção não sair do recorte.
- A fonte padrão dos cartões criados pela IA é "Gerado por IA".

### Removido
- Criar baralho à mão (Meus baralhos → Novo baralho com disciplina, temas e data). O botão agora abre o fluxo com IA.
- Data da prova: o campo sumiu da criação de baralho e a instrução à IA não fala mais de datas.

## [2.4.0] — 2026-11-16

### Novo
- **Estatísticas de uso anônimas** (PostHog, servidor nos EUA): o app conta quais funções são usadas (estudo, respostas, Criar com IA, enviar, receber, backup etc.) para orientar as próximas melhorias. Sem cookies, sem nome ou e-mail e nunca o texto dos cartões. Uso sem internet é enviado depois. Dá para desligar em **Aparência → Enviar estatísticas de uso**.

### Mudou
- Rodapé: "seus cartões ficam neste aparelho".

## [2.3.0] — 2026-11-16

### Novo
- **Alternativas que mudam**: cartões de alternativas podem ter mais de 4 opções e uma segunda forma de dizer a resposta certa. Cada vez que o cartão aparece, o app mostra 4: uma das formas da certa e 3 erradas sorteadas. Assim não dá para decorar a "cara" da resposta. Cartões antigos, com 4 opções, continuam funcionando como antes.
- **Sem alternativas quando já domina**: um cartão de alternativas que você já domina aparece sem as opções. Você pensa na resposta, toca em Mostrar resposta e diz como foi.
- O Criar com IA e o Corrigir com IA já pedem o formato novo: 1 certa, 5 ou 6 erradas e outra forma da certa, sem deixar a certa maior ou mais detalhada que as erradas.
- No editor de cartão, campo "Outra forma de dizer a correta" e até 8 alternativas.
- **One Piece atualizado** no formato novo. Quem já tem o baralho recebe a atualização sozinho, com o progresso mantido; cartões que você editou não são trocados.

## [2.2.0] — 2026-11-16

### Novo
- **Ícone de enviar** à vista: no estudo, no canto superior direito de cada cartão (envia aquele cartão); na tela do baralho, ao lado do nome (envia o baralho inteiro). Os botões de Configurar baralho continuam.

### Corrigido
- One Piece: uma alternativa errada que citava algo de mais adiante na história foi trocada.

## [2.1.2] — 2026-11-16

### Removido
- Aviso "Recebeu um cartão ou baralho?…" em Meus baralhos. Receber pelo Compartilhar do Android continua funcionando.

## [2.1.1] — 2026-11-16

### Corrigido
- **One Piece sem spoilers**: o baralho foi revisado para ficar no começo da história (o East Blue), com o perfil de cada personagem e as regras do mundo, sem contar o que acontece depois. Saíram 35 cartões que entregavam a história, inclusive alternativas com nomes que só aparecem mais tarde; entraram cartões novos, e os três temas continuam com 49 cartões no total.
- Quem já tinha o baralho recebe a correção sozinho ao abrir o app. Os cartões que a pessoa criou e o progresso nos cartões que ficaram continuam.

## [2.1.0] — 2026-11-16

### Novo
- **Baralho de exemplo One Piece**, com 49 cartões em três temas: Tripulação do Going Merry, Lore e Marinha. Ele vem instalado em quem abre o app pela primeira vez e aparece uma única vez para quem já usava. Como qualquer baralho, dá para editar ou excluir, e ele não volta depois de excluído.

### Removido
- O baralho de exemplo antigo deixou de vir com o app. Quem já tinha continua com ele e com o progresso.

## [2.0.1] — 2026-11-16

### Mudou
- Exemplos dos campos do editor de cartão agora são genéricos ("O que é fotossíntese?", "Aula 4, p. 7").
- Documentação (README, planos e pendências) sem referências a um curso ou disciplina específicos.

## [2.0.0] — 2026-11-16

**Cada um monta o seu.** O tatino. deixa de ser o app de um baralho e passa a ser o lugar onde cada pessoa cria, envia e estuda os próprios baralhos, com uma interface bem mais simples.

**O que muda para quem já usava:** baralhos e progresso continuam iguais (nada se perde). Mudou o jeito de estudar (um botão **Estudar**, por tempo ou até acertar), as opções de resposta e onde ficam os cartões (em **Configurar baralho**). Saíram o Gemini direto (chave no app), reportar erro, as marcações de revisão e o "cai na prova".

A central de baralhos ficou como plano futuro em `docs/futuro/central/`.

### Novo
- **Novo baralho num passo só**: disciplina, temas (um por linha) e data da prova.
- **Enviar um cartão** pelo WhatsApp (Cartões → Enviar). Quem recebe escolhe em qual baralho guardar; temas de mesmo nome são aproveitados.
- **Enviar baralho** direto na tela do baralho.
- **Abrir a IA de sua escolha**: atalhos para Gemini, ChatGPT, Claude e Copilot, visíveis direto em Criar com IA e em Corrigir cartão.
- **Estudar pergunta como estudar**: ao tocar em Estudar, sobe uma folha "Como estudar?" com o **modo**, o **conteúdo** (se houver cálculo) e os **temas já marcados**; é preciso marcar pelo menos um tema. A última escolha fica lembrada por baralho. Tocar em **Começar** abre o estudo.
- **Modo "Até acertar"** (5, 10, 20 ou 30 acertos): o fio no topo **enche** a cada acerto e a sessão termina com "Meta atingida!".
- **Modo "Por tempo"** (5, 10, 15 ou 20 minutos): o fio no topo **encurta** até acabar; ao zerar, a sessão termina e mostra o resultado (com % de acerto).
- **Uma ordem só** para estudar, sem escolher entre "prova" e "revisão": primeiro os errados, depois os que vencem hoje (repetição espaçada), os nunca vistos, os difíceis e, por último, os acertados há mais tempo.
- **Incentivo a criar mais cartões** no fim de cada sessão (por tempo ou por acertos): "Que tal mais cartões?" sugere o tema em que você teve mais dificuldade e abre o Criar com IA já com esse assunto preenchido.
- **Corrigir cartão com IA**: na sessão ("Corrigir cartão" ou "Cartão errado? Corrigir" no resultado) e no editor ("Corrigir com IA"). O app monta o pedido com o cartão, a disciplina e o tema; você diz o que parece errado (opcional), cola na IA, cola a resposta de volta, compara **antes e depois** e salva. Na sessão, o cartão corrigido volta para ser respondido de novo.

### Mudou
- **Criar com IA** só por copiar e colar (Gemini, ChatGPT ou Claude), dentro do baralho, com textos curtos: Material → Peça à IA → Cole a resposta → Confira.
- Tela do baralho enxuta: progresso e **Estudar**. **Configurar baralho** reúne Cartões (Criar com IA, Ver e editar, Enviar baralho), nome, data da prova, temas, duplicar e excluir. Sai o cartão "Exercícios de cálculo" (virou Conteúdo = Cálculo).
- Rodapé discreto, com **Backup** e **Aparência** lado a lado.
- **Respostas mais claras**, uma por linha: **Acertei, foi fácil** · **Acertei, com dificuldade** · **Acertei no chute** · **Não sabia** · **Errei**. Em alternativas, V/F e cálculo o app já sabe se acertou: se acertou, aparecem só as três primeiras; se errou, só "Continuar".
- **"Não sei"** em V/F e alternativas, discreto, abaixo das opções: mostra a resposta certa e a explicação sem precisar chutar; conta como erro e o cartão volta na mesma sessão.
- **"Acertei no chute" não conta como acerto**: não soma na meta nem na % de acerto, aparece como "chute" no resultado, e o cartão volta mais tarde na mesma sessão.
- Cartões: lista com filtro por tema e, em cada cartão, Editar e Enviar.
- Backup sem a seção de reportes.

### Removido
- **Gemini direto** (chave do Gemini guardada no app), para não manter chave no aparelho. Fica o copiar e colar.
- Reportar erro e as marcações de revisão de conteúdo: agora cada pessoa edita o próprio cartão.
- **"Cai na prova"** nos temas: confundia mais do que ajudava. A instrução da IA não pede mais temas prioritários.

## [1.7.0] — 2026-11-15

Fase 2 · E5: Gemini direto — gerar cartões com um toque.

### Novo
- **Gemini direto** em "Criar com IA": com uma chave gratuita do Google AI Studio, ela escolhe o PDF no celular e toca em **Gerar com o Gemini**. O PDF vai junto, e o Gemini lê também imagens e fórmulas dos slides.
- **Correção automática**: se algum cartão vier com problema, o app pede a correção ao Gemini uma vez, na mesma conversa, e junta os cartões corrigidos à prévia.
- Configuração da chave dentro de "Criar com IA": passo a passo para criar a chave, **Salvar e testar** (confere a chave e escolhe o modelo Flash disponível), trocar ou remover.
- Mensagens claras para chave inválida, cota gratuita esgotada, sem internet e PDF grande demais (limite de 14 MB). O copiar e colar continua disponível.

### Segurança e privacidade
- A chave fica só no aparelho (armazenamento local do navegador), fora do backup, e vai no cabeçalho da chamada, nunca na URL.
- Aviso na tela: no plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos dele.

## [1.6.1] — 2026-11-15

### Removido
- Botão **Abrir baralho recebido** (escolher o arquivo "(Tatino).txt" no seletor de arquivos) e o código dele. Receber um baralho agora é só pelo **Compartilhar → tatino.**, com o app instalado no celular.

## [1.6.0] — 2026-11-15

Abrir baralho recebido direto pelo Compartilhar do Android.

### Novo
- O **tatino.** aparece na lista do **Compartilhar** do Android (com o app instalado). No WhatsApp: segurar o arquivo `… (Tatino).txt` → Compartilhar → **tatino.** O app abre direto no resumo do baralho, com **Adicionar** ou **Atualizar**.
- Também aceita quando o conteúdo chega como texto em vez de arquivo.
- Dicas novas em Meus baralhos e em Compartilhar baralho explicando o caminho.

### Corrigido
- "1 cartões" no resumo de um baralho recebido.

## [1.5.0] — 2026-11-15

Fase 2 · E4: criar cartões com o Gemini; e sessão de estudo mais confortável.

### Novo
- **Criar com IA** (Meus baralhos, tela do baralho e Cartões): a partir de um PDF de aula, de um texto colado ou de um assunto. O app monta a instrução, ela cola no Gemini, cola a resposta de volta e confere a prévia antes de salvar.
- Instrução versionada com formato, regras (fidelidade ao material, página da fonte, tipos e proporções) e exemplos testados pelo validador do app.
- Leitura tolerante da resposta: texto em volta, bloco de código, vírgula sobrando e aspas curvas. Cada cartão é validado separadamente (cálculos sorteados 60 vezes). Os cartões com problema geram um **pedido de correção** pronto para colar no Gemini, e os corrigidos entram na mesma prévia.
- Temas reaproveitados do baralho de destino ou criados; destino pode ser um baralho novo ou um existente.
- **Pular** na sessão: o cartão vai para o fim da sessão sem contar como resposta (no último, a sessão termina). O resumo mostra os pulos.

### Mudou
- **Resultado em folha que sobe de baixo**, como a modal nativa do celular: resposta, explicação, fonte e as avaliações aparecem sem precisar rolar. A alça (ou um toque fora) recolhe a folha para ver o cartão inteiro.
- No cálculo, cada etapa abre a folha com a resolução e o botão "Próxima etapa"; as etapas feitas ficam resumidas no cartão, com a resolução recolhida.

## [1.4.0] — 2026-11-15

Nova identidade visual: **tatino.** — editorial, calma e genérica para qualquer disciplina.

### Novo
- **Marca e ícone do app** com o símbolo da ficha aberta (ícone normal, *maskable* do Android e do iPhone). Sai o ícone antigo com onda.
- **Aparência**: Usar tema do aparelho, Claro ou Escuro. A escolha fica salva no aparelho e é aplicada antes de a tela aparecer (sem piscar). A cor da barra do navegador acompanha o tema.
- **Versão no rodapé de todas as telas.**
- Ícones de linha da marca (Revisar, Entender, Praticar, Avançar) nos modos de estudo, na explicação e no fim da sessão.

### Mudou
- Tipografia: serifada (Georgia) só na marca, nos títulos e nas perguntas; sans-serif nos controles e textos. Perguntas com 26–30 px.
- Paleta papel/verde/coral no claro e grafite/marfim no escuro, com contraste AA conferido.
- Tela do baralho com uma ação principal ("Continuar estudando" ou "Começar uma sessão") e os modos como cartões de ação.
- Sessão: contador "4 de 20", "Reportar erro" depois das avaliações, explicação em destaque e textos de correção claros ("Resposta dentro da tolerância", "Ainda não: veja a resolução").
- Certo e errado não dependem só da cor: alternativas com ✓/✕ e borda diferente; marcações da revisão com texto.
- Emojis usados como ícones foram trocados por texto ou pelos ícones da marca.
- Foco visível pelo teclado e respeito a "reduzir movimento".

## [1.3.0] — 2026-11-15

Fase 2 · E3: compartilhar e atualizar baralhos.

### Novo
- **Compartilhar baralho** (Configurar baralho → 📤): envia um arquivo `… (Tatino).txt` com os cartões, sem o progresso, pelo WhatsApp, e-mail etc. No computador, o arquivo é baixado.
- **Abrir baralho recebido** (Meus baralhos → 📥): adiciona o baralho ou, se ele já existir, mostra o que muda antes de atualizar.
- **Atualização sem perder edições:** corrige os cartões que mudaram, acrescenta os novos, **mantém os cartões que ela editou** e não apaga nada. Nome, data da prova e progresso continuam os dela. Também dá para importar como baralho separado.
- Script `npm run exportar-baralho -- <id>` para gerar o arquivo de atualização de um baralho do repositório.
- Versão do app no rodapé e este changelog.

## [1.2.0] — 2026-11-15

Fase 2 · E2: editor de cartões.

### Novo
- Criar e editar cartões de **pergunta e resposta**, **verdadeiro ou falso** e **alternativas**, com prévia, explicação, fonte e avisos em português.
- "Salvar e criar outro" para escrever vários cartões seguidos.
- Excluir cartão com **Desfazer**.
- **Colar lista**: uma pergunta por linha, separada da resposta por `—`, `;`, tab ou ` - `.
- A tela "Revisar conteúdo" virou **Cartões**, com ✏️ para editar cada cartão.

### Corrigido
- Digitar rápido em várias alternativas podia perder o texto de uma delas.

## [1.1.0] — 2026-11-15

Fase 2 · E1: vários baralhos.

### Novo
- Tela **Meus baralhos**: o app passa a aceitar várias disciplinas.
- Configurar baralho: nome, data da prova, temas e "cai na prova"; duplicar e excluir com **Desfazer**.
- O botão voltar do Android volta uma tela por vez.
- O backup inclui os baralhos.

### Mudou
- O baralho que vinha no app deixa de ser fixo: é instalado uma vez e vira um baralho comum. **O progresso da fase 1 é mantido.**

## [1.0.0] — 2026-11-15

Fase 1: primeira versão publicada.

### Novo
- PWA instalável e **offline**: celular e computador, sem login.
- Um baralho de exemplo com 190 cartões, cada um com a fonte.
- **Modo prova** (20 cartões, começando pelos errados e pelos temas prioritários), **revisão espaçada** (FSRS) e **exercícios de cálculo** com números sorteados, correção com ±2% e resolução passo a passo.
- Reportar erro em qualquer cartão, revisão de conteúdo (✓/⚠/📝), backup e envio de reportes pelo WhatsApp.
- Publicação automática no GitHub Pages.

[2.4.0]: https://github.com/marcelobritonet/tatino/releases/tag/v2.4.0
[2.3.0]: https://github.com/marcelobritonet/tatino/releases/tag/v2.3.0
[2.2.0]: https://github.com/marcelobritonet/tatino/releases/tag/v2.2.0
[2.1.2]: https://github.com/marcelobritonet/tatino/releases/tag/v2.1.2
[2.1.1]: https://github.com/marcelobritonet/tatino/releases/tag/v2.1.1
[2.1.0]: https://github.com/marcelobritonet/tatino/releases/tag/v2.1.0
[2.0.1]: https://github.com/marcelobritonet/tatino/releases/tag/v2.0.1
[2.0.0]: https://github.com/marcelobritonet/tatino/releases/tag/v2.0.0
[1.7.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.7.0
[1.6.1]: https://github.com/marcelobritonet/tatino/releases/tag/v1.6.1
[1.6.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.6.0
[1.5.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.5.0
[1.4.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.4.0
[1.3.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.3.0
[1.2.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.2.0
[1.1.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.1.0
[1.0.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.0.0
