# Changelog

Mudanças do Tatino, da mais recente para a mais antiga. As versões seguem [SemVer](https://semver.org/lang/pt-BR/): o número do meio sobe a cada etapa nova, o último a cada correção. A versão em uso aparece no rodapé de **Meus baralhos** e de **Backup e reportes**.

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

[1.3.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.3.0
[1.2.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.2.0
[1.1.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.1.0
[1.0.0]: https://github.com/marcelobritonet/tatino/releases/tag/v1.0.0
