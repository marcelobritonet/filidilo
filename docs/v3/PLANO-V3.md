# tatino. v3 — Plano de implementação

Rascunho para aprovação (16/11/2026). Segue as respostas do Marcelo de 16/11 (seção 0.1 da [SPEC-V3.md](SPEC-V3.md)) e as opções recomendadas que ele aceitou.

Cada entrega termina com `npm test` passando e conferência no navegador em tamanho de celular. Commit, push e lançamento só quando o Marcelo pedir ("lance"). Lançamento: tudo junto como **v3.0.0** (V14).

## Entregas

| # | Entrega | O que inclui | Arquivos | Depende de |
|---|---|---|---|---|
| E0 | **Rascunho e avaliação da instrução de planejamento** | `montarPlano` com o exemplo testado; rodar em 8 pedidos variados (seção "Pedidos de teste") nas 4 IAs; medir % de respostas lidas e % de cartões válidos; ajustar até ≥ 90% válidos e 100% com o bloco `baralho` | `src/core/ia/plano.ts`, `plano.test.ts`, regras comuns extraídas de `instrucao.ts` | Decisões V1, V2, V6, V7 |
| E1 | **Dados: objetivo e descrição dos temas** | Tipos `Objetivo`, `Nivel`, `Tema.descricao`; validação; envio e recebimento (o objetivo de quem recebe fica); `semear` levando o objetivo; testes de compatibilidade com baralhos e backups antigos | `types.ts`, `validar.ts`, `compartilhar.ts`, `baralhos.ts`, testes | — |
| E2 | **Criar com IA refinado** | `VERSAO_INSTRUCAO = 3`: seção do objetivo, temas com descrição, frentes já existentes, prioridade e nível; "Gerado por IA"; `corrigir.ts` com objetivo; eventos com `com_objetivo` | `instrucao.ts`, `corrigir.ts`, `cobertos.ts` (novo, resumo comprimido do que o baralho já cobre), `CriarComIA.tsx`, `ia.test.ts` | E1 |
| E3 | **Fluxo "O que você quer aprender hoje?"** | Campo "Aprender uma coisa nova hoje" em Meus baralhos; "Novo baralho" abrindo o mesmo fluxo; formulário manual removido; aviso sem internet; tela `aprender` (passos 1 a 5, com PDF ou texto opcional); `lerPlano` e aviso de perguntas; cartão do baralho editável na conferência; criar e abrir o baralho; eventos `aprender_*` | `Baralhos.tsx`, `Aprender.tsx` (novo), `App.tsx` (tela nova), `resposta.ts`, `estilo.css` | E0, E1 |
| E4 | **Editar objetivo em Configurar baralho** | Objetivo, Nível, Foco e Evitar; "Definir objetivo" para baralhos sem objetivo; evento `objetivo_editado` | `ConfigBaralho.tsx`, `CriarComIA.tsx` | E1 |
| E5 | **Incentivo usando o objetivo** | Texto do "Que tal mais cartões?" com o objetivo; aviso "Quer subir de nível?" com 80% dominados; sugestão do tema com poucos cartões depois da primeira sessão | `Sessao.tsx`, `Inicio.tsx` | E2 |
| E6 | **Mote e textos** | "Aprenda qualquer coisa" no manifesto (`vite.config.ts`) e no `index.html`; README e CHANGELOG da v3.0.0 (sem tocar em `marketing/`) | `vite.config.ts`, `index.html`, `ConfigBaralho.tsx`, `README.md`, `CHANGELOG.md` | E3 |
| E8 | **Tirar a data da prova** | Campo em Configurar baralho, contagem "Faltam N dias" (Meus baralhos e tela do baralho), `textoContagem`, textos ("data da prova" no Importar etc.); `prova` fica no tipo só como campo antigo ignorado, para arquivos e backups velhos continuarem válidos | `types.ts`, `estado.ts`, `Baralhos.tsx`, `Inicio.tsx`, `ConfigBaralho.tsx`, `Importar.tsx` | — |
| E7 | **Teste com gente de verdade** | Marcelo e a estudante criam 2 ou 3 baralhos pelo fluxo novo (um com PDF de aula, um de assunto livre) e contam o que travou | — | E3 a E6 publicadas |

Ordem sugerida: E1 → E0 → E2 → E3 → E4 → E5 → E6 → E7. (A entrega do One Piece com objetivo saiu: V13-B.) E0 e E1 podem andar juntas.

## Pedidos de teste (E0)

| # | Pedido | O que conferir |
|---|---|---|
| T1 | "espanhol para viajar ao México" | Nível iniciante; nada de gramática pesada |
| T2 | "revisão de Cálculo 1" (com PDF de aula) | Cartões de cálculo válidos; fonte com página |
| T3 | "aprender inglês" | A IA faz perguntas (V2) |
| T4 | "história da arte, do Renascimento ao Impressionismo" | Temas em ordem cronológica |
| T5 | "regras do xadrez para ensinar meu filho de 8 anos" | Linguagem simples; nível iniciante |
| T6 | "One Piece até o fim do East Blue, sem spoilers" | "evitar" preenchido; nenhum spoiler nos cartões |
| T7 | "farmacologia de antibióticos para a residência" | Nível avançado; sem dados inventados |
| T8 | "Python básico para automatizar planilhas" | Código curto em texto; sem tipo `calculo` |

Métricas por IA (Gemini, ChatGPT, Claude, Copilot), registradas em `docs/v3/AVALIACAO-PLANO.md`: resposta lida (sim/não), bloco `baralho` presente, cartões válidos / total, temas na ordem, perguntas feitas quando devia (só T3).

## Testes automáticos novos

| Teste | Onde |
|---|---|
| O exemplo da instrução de planejamento passa no validador | `plano.test.ts` |
| `lerPlano` com resposta completa, sem `baralho`, com nível inválido e com limites estourados | `ia.test.ts` |
| Aviso de perguntas: resposta só com perguntas; resposta com perguntas e JSON (lê o JSON) | `ia.test.ts` |
| Instrução de cartões com e sem objetivo | `ia.test.ts` |
| Resumo comprimido: exemplo da spec ("unidade força SI"), repetidos, limite de 3.000 caracteres e "(e mais N)" | `cobertos.test.ts` |
| Baralho e backup antigos (sem objetivo) continuam válidos | `baralhos.test.ts`, `compartilhar.test.ts` |
| Receber atualização mantém o objetivo de quem recebe | `compartilhar.test.ts` |

## Riscos do plano

| Risco | Mitigação |
|---|---|
| E0 mostrar que 1 ida (V1-A) gera planos ruins | Trocar para 2 idas (V1-B) antes da E3; a tela Aprender só ganha um passo a mais |
| Resumo comprimido perder informação e a IA repetir cartões | Na E0/E2, pedir mais cartões para um baralho de 40 e contar repetidos; se passar de 10%, subir para 8 palavras por cartão |
| Mudar a primeira tela confundir quem já usa | A lista de baralhos continua igual, logo abaixo do campo novo; "Novo baralho" continua no mesmo lugar |
| Sem o formulário manual, não dá para criar baralho sem internet | Aviso claro (V17); estudar, receber e backup continuam offline |
