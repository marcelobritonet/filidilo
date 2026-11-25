# Filidilo

Antes se chamava **tatino.**. O endereço e o repositório já usam o nome novo; os identificadores internos (banco, chaves do aparelho, formato dos arquivos) continuam com o nome antigo, para ninguém perder dados.

No ar: https://filidilo.britin.workers.dev/

**Aprenda qualquer coisa.** Flashcards offline (PWA) para estudar o que você quiser. Funciona no celular e no computador, instalável pelo navegador, sem login.

- **Aprender uma coisa nova hoje**: diga o que quer aprender; a IA (copiar e colar no Gemini, ChatGPT, Claude ou Copilot) monta o baralho com objetivo, nível, temas e cartões. Pode anexar um PDF ou texto de aula.
- **Objetivo do baralho**: nível, foco e o que evitar, editáveis em Configurar baralho. A IA usa isso ao criar mais cartões e evita repetir o que já existe.
- **Sem data da prova**: o app não é focado em provas. Não há criação manual de baralho; todo baralho novo nasce pelo fluxo com IA. Cartões podem ser escritos à mão ou colados como lista.
- **Estudar** por tempo (o fio no topo encurta) ou até X acertos (o fio enche), escolhendo os temas. Ordem única: errados, vencidos hoje (FSRS, `ts-fsrs`), nunca vistos, difíceis e acertados.
- **Respostas**: acertei, acertei no chute (não conta acerto) ou errei; "Não sei" antes de ver a resposta, em todos os tipos de cartão.
- **Exercícios de cálculo**: números sorteados, resposta digitada, tolerância de ±2% e resolução passo a passo.
- **Corrigir cartão com IA**, com antes e depois. **Enviar** cartão ou baralho por link e QR code (vale 2 horas) ou como arquivo pelo WhatsApp; receber abrindo o link ou pelo Compartilhar → Filidilo.
- **Comemorar e compartilhar**: no fim da sessão, comemoração e imagem do resultado (Story 9:16 ou Quadrado, desenhada no aparelho em `src/ui/desenho.ts`, conteúdo em `src/core/artes.ts`) para WhatsApp e story; sequência de dias, conquistas e "Sua semana" (`src/core/conquistas.ts`, conquistas comemoradas guardadas em `meta`, chave `marcos`); "Desafiar amigos" com um cartão (link de 7 dias) e "Indicar o Filidilo".
- **Backup** em arquivo; tudo fica só no aparelho.

## Visual

Marca e tokens do kit de marca (`src/assets/brand/`, `src/ui/estilo.css`). Aparência: sistema, claro ou escuro (`src/ui/tema.ts`, chave `tatino-theme` no `localStorage`). Ícones do PWA gerados do `simbolo.svg` e do `simbolo-maskable.svg`.

## Rodar

Antes de testar ou publicar, leia o [AGENTS.md](AGENTS.md): como testar sem sujar as estatísticas e o passo a passo de cada versão.


```bash
npm install
npm run dev        # http://localhost:5173/filidilo/
npm test           # núcleo + validação do baralho + gabaritos dos cálculos
npm run build      # gera dist/ (PWA)
```

## Baralhos

Os baralhos ficam no aparelho (IndexedDB, tabela `baralhos`). Baralhos que vêm com o app ficam em `src/decks/<id>/`: `baralho.json` (temas) + `partes/*.json` (cartões, um arquivo por tema). Tipos: `conceito`, `vf`, `associacao`, `calculo`. Formato em `src/core/types.ts`; `npm test` recusa baralho inválido.

Cartões de cálculo usam expressões avaliadas por um avaliador seguro (`src/core/expr.ts`, sem `eval`). Marcadores `{nome}` e `{nome:casas}` no texto são trocados pelos valores sorteados.

## Estatísticas de uso

O app manda eventos anônimos ao PostHog (projeto na região EUA): nome do evento e números, sem cookies, sem nome ou e-mail e nunca o texto dos cartões. Um id aleatório por aparelho; fila no aparelho para quando estiver sem internet. Código e lista de eventos em `src/core/telemetria.ts` e nas chamadas `evento(...)`. A pessoa desliga em Preferências. A chave pública vem da variável `VITE_POSTHOG_KEY` do repositório (GitHub → Settings → Secrets and variables → Actions → Variables), passada no build pelo `deploy.yml`. Sem ela (no computador ou em cópias do repositório), nada é enviado. Para testar no site publicado sem contar como uso real, abra uma vez com `?teste=1` (detalhes no [AGENTS.md](AGENTS.md)).

## Envio por link

Enviar um baralho ou cartão sobe o mesmo JSON do arquivo para um worker do Cloudflare (`worker/`, KV com validade de 2 horas; 7 dias no desafio, com `?validade=7d`) e gera o link `…/filidilo/?b=<código>` com QR code (`src/ui/EnviarModal.tsx`, `src/core/link.ts`). O conteúdo some sozinho depois de 2 horas; só quem tem o código (10 caracteres aleatórios) abre, e não há listagem. Limite de 1 MB e de 20 links por minuto por IP.

- **Publicar o worker**: push na `main` que mexe em `worker/` roda `.github/workflows/deploy-worker.yml`. Precisa dos segredos `CLOUDFLARE_API_TOKEN` (permissões Workers Scripts e Workers KV Storage: Edit) e `CLOUDFLARE_ACCOUNT_ID`. O namespace KV é criado no primeiro deploy.
- **Ligar no app**: a variável `VITE_LINKS_URL` do repositório (ex.: `https://filidilo-links.<sua-conta>.workers.dev`), passada no build pelo `deploy.yml`. Sem ela, só aparece "Enviar como arquivo".
- **Rodar no computador**: `cd worker && npm install && npx wrangler dev --port 8787` e, noutro terminal, `VITE_LINKS_URL=http://127.0.0.1:8787 npm run dev`.

## Versões

Histórico em [CHANGELOG.md](CHANGELOG.md) e nas [releases](https://github.com/marcelobritonet/filidilo/releases). A versão vem do `package.json` e aparece no rodapé do app. Para lançar: subir a versão no `package.json`, escrever a seção no changelog, fazer o commit, criar a tag `vX.Y.Z` e a release.

Para gerar o arquivo de um baralho do repositório: `npm run exportar-baralho -- <id>` (sai em `dist-baralhos/`).

## Publicar

Push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml` (em *Settings → Pages*, a fonte deve ser **GitHub Actions**).

Especificação e plano: `SPEC-FASE2.md` e `PLANO-FASE2.md`; a central de baralhos foi descartada (plano antigo em `docs/futuro/central/`, só histórico). Pendências: `PENDENCIAS.md`.
