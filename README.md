# tatino.

No ar: https://marcelobritonet.github.io/tatino/

**Aprenda qualquer coisa.** Flashcards offline (PWA) para estudar o que você quiser. Funciona no celular e no computador, instalável pelo navegador, sem login.

- **Aprender uma coisa nova hoje**: diga o que quer aprender; a IA (copiar e colar no Gemini, ChatGPT, Claude ou Copilot) monta o baralho com objetivo, nível, temas e cartões. Pode anexar um PDF ou texto de aula.
- **Objetivo do baralho**: nível, foco e o que evitar, editáveis em Configurar baralho. A IA usa isso ao criar mais cartões e evita repetir o que já existe.
- **Sem data da prova**: o app não é focado em provas. Não há criação manual de baralho; todo baralho novo nasce pelo fluxo com IA. Cartões podem ser escritos à mão ou colados como lista.
- **Estudar** por tempo (o fio no topo encurta) ou até X acertos (o fio enche), escolhendo os temas. Ordem única: errados, vencidos hoje (FSRS, `ts-fsrs`), nunca vistos, difíceis e acertados.
- **Respostas**: acertei fácil, com dificuldade, no chute (não conta acerto), não sabia, errei; "Não sei" em V/F e alternativas.
- **Exercícios de cálculo**: números sorteados, resposta digitada, tolerância de ±2% e resolução passo a passo.
- **Corrigir cartão com IA**, com antes e depois. **Enviar** cartão ou baralho pelo WhatsApp; receber pelo Compartilhar → tatino.
- **Backup** em arquivo; tudo fica só no aparelho.

## Visual

Marca e tokens do kit de marca (`src/assets/brand/`, `src/ui/estilo.css`). Aparência: sistema, claro ou escuro (`src/ui/tema.ts`, chave `tatino-theme` no `localStorage`). Ícones do PWA gerados do `simbolo.svg` e do `simbolo-maskable.svg`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173/tatino/
npm test           # núcleo + validação do baralho + gabaritos dos cálculos
npm run build      # gera dist/ (PWA)
```

## Baralhos

Os baralhos ficam no aparelho (IndexedDB, tabela `baralhos`). Baralhos que vêm com o app ficam em `src/decks/<id>/`: `baralho.json` (temas) + `partes/*.json` (cartões, um arquivo por tema). Tipos: `conceito`, `vf`, `associacao`, `calculo`. Formato em `src/core/types.ts`; `npm test` recusa baralho inválido.

Cartões de cálculo usam expressões avaliadas por um avaliador seguro (`src/core/expr.ts`, sem `eval`). Marcadores `{nome}` e `{nome:casas}` no texto são trocados pelos valores sorteados.

## Estatísticas de uso

O app manda eventos anônimos ao PostHog (projeto na região EUA): nome do evento e números, sem cookies, sem nome ou e-mail e nunca o texto dos cartões. Um id aleatório por aparelho; fila no aparelho para quando estiver sem internet. Código e lista de eventos em `src/core/telemetria.ts` e nas chamadas `evento(...)`. A pessoa desliga em Aparência. A chave pública vem da variável `VITE_POSTHOG_KEY` do repositório (GitHub → Settings → Secrets and variables → Actions → Variables), passada no build pelo `deploy.yml`. Sem ela (no computador ou em cópias do repositório), nada é enviado.

## Versões

Histórico em [CHANGELOG.md](CHANGELOG.md) e nas [releases](https://github.com/marcelobritonet/tatino/releases). A versão vem do `package.json` e aparece no rodapé do app. Para lançar: subir a versão no `package.json`, escrever a seção no changelog, fazer o commit, criar a tag `vX.Y.Z` e a release.

Para gerar o arquivo de um baralho do repositório: `npm run exportar-baralho -- <id>` (sai em `dist-baralhos/`).

## Publicar

Push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml` (em *Settings → Pages*, a fonte deve ser **GitHub Actions**).

Especificação e plano: `SPEC-FASE2.md` e `PLANO-FASE2.md`, central de baralhos (futuro) em `docs/futuro/central/`. Pendências: `PENDENCIAS.md`.
