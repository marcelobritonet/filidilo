# Changelog

Mudanças do Tatino, da mais recente para a mais antiga. As versões seguem [SemVer](https://semver.org/lang/pt-BR/): o número do meio sobe a cada etapa nova, o último a cada correção. A versão em uso aparece no rodapé de todas as telas.

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
- Hidrodinâmica deixa de ser fixo no app: é instalado uma vez e vira um baralho comum. **O progresso da fase 1 é mantido.**

## [1.0.0] — 2026-11-15

Fase 1: primeira versão publicada.

### Novo
- PWA instalável e **offline**: celular e computador, sem login.
- Baralho de **Hidrodinâmica / Fenômenos de Transporte**: 190 cartões dos 6 temas prioritários da prova, cada um com apostila e página.
- **Modo prova** (20 cartões, começando pelos errados e pelos temas prioritários), **revisão espaçada** (FSRS) e **exercícios de cálculo** com números sorteados, correção com ±2% e resolução passo a passo.
- Reportar erro em qualquer cartão, revisão de conteúdo (✓/⚠/📝), backup e envio de reportes pelo WhatsApp.
- Publicação automática no GitHub Pages.

[1.5.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.5.0
[1.4.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.4.0
[1.3.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.3.0
[1.2.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.2.0
[1.1.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.1.0
[1.0.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.0.0
