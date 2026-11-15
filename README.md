# Tatino

No ar: https://marcelobritonet.github.io/tatino/

Flashcards offline (PWA) para estudar qualquer disciplina; começou com Hidrodinâmica / Fenômenos de Transporte. Funciona no celular e no computador, instalável pelo navegador, sem login.

- **Modo prova**: 20 cartões por rodada, começando pelos errados e pelos temas que mais caem.
- **Revisão espaçada**: FSRS (`ts-fsrs`).
- **Exercícios de cálculo**: números sorteados a cada vez, resposta digitada, correção com tolerância de ±2% e resolução passo a passo.
- **Revisar conteúdo**: lista dos cartões com a fonte (apostila e página), para marcar ✓/⚠/📝.
- **Backup e reportes**: o progresso fica só no aparelho; o backup salva um arquivo, e os reportes saem por WhatsApp/e-mail.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173/tatino/
npm test           # núcleo + validação do baralho + gabaritos dos cálculos
npm run build      # gera dist/ (PWA)
```

## Baralhos

Os baralhos ficam no aparelho (IndexedDB, tabela `baralhos`). Hidrodinâmica vem de fábrica e é instalado uma única vez na primeira abertura (`src/core/baralhos.ts`); depois é um baralho comum. A fonte dele é `src/decks/hidrodinamica/baralho.json` (temas) + `partes/*.json` (cartões, um arquivo por tema). Tipos: `conceito`, `vf`, `associacao`, `calculo`. Formato em `src/core/types.ts`; `npm test` recusa baralho inválido.

Cartões de cálculo usam expressões avaliadas por um avaliador seguro (`src/core/expr.ts`, sem `eval`). Marcadores `{nome}` e `{nome:casas}` no texto são trocados pelos valores sorteados.

## Versões

Histórico em [CHANGELOG.md](CHANGELOG.md) e nas [releases](https://github.com/marcelobritonet/tatino/releases). A versão vem do `package.json` e aparece no rodapé do app. Para lançar: subir a versão no `package.json`, escrever a seção no changelog, fazer o commit, criar a tag `vX.Y.Z` e a release.

Correções num baralho do repositório: `npm run exportar-baralho -- hidrodinamica` gera o arquivo em `dist-baralhos/`; ela abre em “Abrir baralho recebido” → Atualizar (as edições dela são preservadas).

## Publicar

Push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml` (em *Settings → Pages*, a fonte deve ser **GitHub Actions**).

Especificação e plano: `SPEC.md` e `PLANO.md` (fase 1), `SPEC-FASE2.md` e `PLANO-FASE2.md` (fase 2). Pendências: `PENDENCIAS.md`.
