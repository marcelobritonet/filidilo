# Instruções para agentes (Claude, Copilot, Codex e outros)

Leia antes de mexer no projeto. Vale para qualquer sessão, de qualquer IA.

## Por onde começar

| Passo | O quê |
|---|---|
| 1 | `PENDENCIAS.md` é a fonte da verdade. A ordem é do mais recente para o mais antigo: item novo entra no topo, com o próximo número `P…`. Altere ali o que for acrescentado, concluído ou removido. |
| 2 | Pode haver outra sessão trabalhando nesta mesma pasta. Antes de commitar, rode `git status` e `git diff` e adicione só os seus arquivos. Na `PENDENCIAS.md`, mude só as suas linhas: nunca reescreva o arquivo a partir de uma cópia antiga. |
| 3 | Textos para a pessoa em pt-BR. Pendências, opções e decisões em tabelas, uma linha por item. |

## Testar sem sujar as estatísticas

O app manda eventos anônimos ao PostHog (`src/core/telemetria.ts`). Teste não pode virar dado de uso.

| Onde o teste roda | Manda eventos? | O que fazer |
|---|---|---|
| Computador: `npm run dev` ou `npm run preview` (localhost) | **Não.** Sem `VITE_POSTHOG_KEY` a telemetria fica desligada | Nada. É o lugar preferido para testar. Nunca crie um `.env` com `VITE_POSTHOG_KEY`. |
| Site publicado (https://marcelobritonet.github.io/tatino/) num celular ou navegador | **Sim** | Antes, marque o aparelho como de teste: abra uma vez `https://marcelobritonet.github.io/tatino/?teste=1`. O rodapé passa a mostrar "aparelho de teste" e todo evento vai com `teste: true`. `?teste=0` desmarca. No Android, o app instalado divide os dados com o Chrome; no iPhone, o app da tela inicial é separado do Safari (marque nos dois). |
| Navegador do agente (painel do Claude, Playwright etc.) no site publicado | **Sim** | Prefira o localhost. Se precisar do site publicado, abra primeiro com `?teste=1`. |
| Testes automáticos (`npm test`) | Não | Nada. |
| Conversas com a IA (Gemini, ChatGPT…) para testar instruções | Não | Nada: elas não passam pelo app. Para levar a resposta ao app, use o localhost. |

**Nas consultas do PostHog** (projeto 740606, SQL em us.posthog.com), tire os testes:

```sql
-- eventos reais: sem a marca de teste e sem aparelhos que já foram marcados como teste
select … from events
where coalesce(toString(properties.teste), '') != 'true'
  and distinct_id not in (select distinct_id from events where event = 'aparelho_teste')
```

Todo evento traz `versao` (a versão do app na hora do evento). Eventos de antes da v3.10.4 trazem a versão da hora do envio, e os aparelhos de teste dessa época não estão marcados.

## Testar as instruções da IA

- Gemini anônimo (gemini.google.com) aceita a instrução sem login. Uma conversa nova por pedido.
- A instrução usada no teste precisa ser idêntica à do app: gere com `montarPlano` / `montarInstrucao` (`src/core/ia/`), não reescreva à mão.
- Confira o formato com as regras de `src/core/validar.ts` e revise o conteúdo cartão a cartão: o validador não pega erro de conteúdo.
- Registre o resultado em `docs/v3/AVALIACAO-PLANO.md` (ou num arquivo ao lado) e na `PENDENCIAS.md`.

## Publicar uma versão

**Novidade só é publicada depois de o Marcelo testar.** Entregue pronta e testada em localhost, deixe a pendência como "Aguardando o Marcelo testar" e publique só com o ok dele. Correção de bug pequena, ou quando ele pedir para publicar, segue direto:

| Passo | Comando ou arquivo |
|---|---|
| 1. Verificar | `npm test`, `npm run typecheck`, `npm run build`; mudança visível: testar no navegador em localhost |
| 2. Versão | `npm version X.Y.Z --no-git-tag-version` (SemVer: novidade sobe o do meio, correção o último). Confira antes a última versão em `git log origin/main`, porque outra sessão pode ter publicado |
| 3. Changelog | Seção nova no topo do `CHANGELOG.md`, em pt-BR, escrita para quem usa o app |
| 4. Pendências | Marcar o item como "✅ Publicada na vX.Y.Z (data)" na `PENDENCIAS.md` |
| 5. Commit e push | `git add` só dos seus arquivos; mensagem `vX.Y.Z · resumo`; `git push origin main` (o push publica no GitHub Pages) |
| 6. Release | `gh release create vX.Y.Z --target main --title "vX.Y.Z · resumo" --notes "…"` |
| 7. Conferir | `gh run watch` no workflow "Publicar no GitHub Pages" e a versão nova no rodapé do site no ar |
