# Changelog

Mudanças do Tatino, da mais recente para a mais antiga. As versões seguem [SemVer](https://semver.org/lang/pt-BR/): o primeiro número sobe quando o jeito de usar muda, o do meio a cada novidade, o último a cada correção. A versão em uso aparece no rodapé de todas as telas.

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
