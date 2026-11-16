# tatino. v3 — Especificação: aprender qualquer coisa

Rascunho para aprovação (16/11/2026), já com as respostas do Marcelo às decisões. Nada foi codado. O plano de entregas está em [PLANO-V3.md](PLANO-V3.md), e as pendências em [PENDENCIAS.md](../../PENDENCIAS.md) (P43 a P52).

## 0. Decisões

### 0.1 Respondidas pelo Marcelo (16/11; V10, V11 e V15–V18 aceitas como recomendado)

| # | Decisão | Resposta | Como fica |
|---|---|---|---|
| V1 | Quantas idas à IA | ✅ A | Uma ida só: o baralho configurado e os primeiros cartões vêm na mesma resposta |
| V2 | A IA pode perguntar antes | ✅ A | Até 3 perguntas quando o pedido for vago |
| V3 | Entrada "Aprender uma coisa nova hoje" | ✅ A, com ajuste | Campo e botão no topo de Meus baralhos, **e** o botão "Novo baralho" também abre o fluxo com IA (com o campo vazio) |
| V4 | Fluxo manual de criar baralho | ✅ Sai (opção C) | O formulário de criar baralho some de Meus baralhos. Todo baralho novo nasce pelo fluxo com IA |
| V5 | Material (PDF ou texto) | ✅ A | Fica: link "Tenho um material (PDF ou texto)" no fluxo novo |
| V6 | Cartões na primeira leva | ✅ A | 15 |
| V7 | Campos da configuração | ✅ A | Título, objetivo, nível, foco, evitar, temas com descrição. Sem data nem meta: o app não é focado em provas |
| V8 | Nível | ✅ A | Iniciante, intermediário ou avançado; o público vai na frase do objetivo |
| V12 | Evitar cartões repetidos | ✅ A, comprimido | O app manda à IA um resumo comprimido do que o baralho já cobre (seção 5.1), e não as perguntas inteiras |
| V13 | One Piece de fábrica | ✅ B | Fica como está, sem configuração |
| V14 | Versão | ✅ A (entendi o "v4) ok" do fim como V14) | v3.0.0 |
| V10 | Editar a configuração depois | ✅ A | Em Configurar baralho: objetivo, nível, foco e evitar |
| V11 | Baralhos antigos (sem configuração) | ✅ A | Criar com IA como hoje, com "Definir objetivo" opcional |
| V15 | Mote e textos | ✅ A | "Aprenda qualquer coisa" no manifesto, `index.html` e README; sem tocar em `marketing/` |
| V16 | O que sai com o fluxo manual | ✅ A | Só o formulário de criar baralho; "Novo cartão" e "Colar lista" ficam |
| V17 | Sem internet | ✅ A | Aviso "Precisa de internet para falar com a IA" |
| V18 | Limite do resumo comprimido | ✅ A | 3.000 caracteres |

### 0.2 Data da prova

Fora da v3 (pedido do Marcelo, 16/11): o app não é focado em provas. A configuração do baralho não tem data nem meta, e a instrução à IA não fala de datas. O campo `prova` que já existe nos dados não é tocado pela v3 (ver P53 no PENDENCIAS).

## 1. Escopo

| Item | Dentro da v3 | Fora da v3 |
|---|---|---|
| Fluxo "O que eu quero aprender hoje?" | ✅ | |
| Configuração do baralho (objetivo) guardada e editável | ✅ | |
| Pedido de cartões refinado pelo objetivo | ✅ | |
| Incentivo a mais cartões usando o objetivo | ✅ | |
| Telemetria dos fluxos novos | ✅ | |
| Criar baralho à mão (formulário de hoje) | | Sai (V4) |
| Central de baralhos (Firebase) | | ⏸ Continua adiada em `docs/futuro/central/` |
| IA direto no app (chave) | | Continua só copiar e colar |
| Tipos de cartão novos | | Ficam os quatro de hoje |
| Trilha automática ("próximo tema") | | Ideia para a v3.x (seção 7) |

## 2. Fluxo novo: "Aprender uma coisa nova hoje"

### 2.1 Passo a passo

| Passo | Tela | O que a pessoa faz | O que o app faz |
|---|---|---|---|
| 0 | Meus baralhos | Digita no campo "Aprender uma coisa nova hoje" (ex.: "espanhol para viajar ao México") e toca **Começar**, ou toca **Novo baralho** | Abre a tela Aprender, com o texto preenchido (ou vazio, pelo Novo baralho) |
| 1 | Aprender · O que quer aprender | Confere o texto. Opcional: "Tenho um material" (PDF com nome e páginas, ou texto colado, como no Criar com IA) | Monta a instrução (seção 3) |
| 2 | Aprender · Peça à IA | **Copiar instrução** e um dos atalhos Gemini/ChatGPT/Claude/Copilot (componente `AbrirIA`) | Copia; se a cópia falhar, mostra o texto para selecionar (como hoje) |
| 3 | (na IA) | Cola e responde às perguntas, se a IA fizer alguma (V2) | — |
| 4 | Aprender · Cole a resposta | Cola a resposta final e toca **Montar baralho** | Lê o JSON (seção 4). Se a resposta vier sem JSON e com perguntas, avisa para responder na IA |
| 5 | Aprender · Confira | Vê o cartão do baralho (título, objetivo, nível, temas) com **Editar** e a lista de cartões com "Incluir" (como no Criar com IA). Pode corrigir os cartões com problema pelo pedido de correção que já existe | Valida cada cartão com o validador de hoje |
| 6 | Aprender · Confira | Toca **Criar baralho com N cartões** | Salva o baralho com `objetivo`, temas com descrição e cartões `origem: "ia"`; abre a tela do baralho |
| 7 | Tela do baralho | Estuda (Estudar) | — |

### 2.2 Textos da tela (objetivos, pt-BR)

| Lugar | Texto |
|---|---|
| Campo em Meus baralhos | Rótulo "Aprender uma coisa nova hoje"; exemplo "Ex.: espanhol para viajar, revisão de Cálculo 1, história da arte" |
| Botão | Começar |
| Link do material | Tenho um material (PDF ou texto) |
| Passo 2 | "Copie a instrução e cole na IA{, junto com o PDF}." |
| Passo 4 | "Cole aqui a resposta da IA" · botão **Montar baralho** |
| Aviso de perguntas | "A IA fez perguntas. Responda lá e cole aqui a resposta final." |
| Passo 5 | "{Título} · {N} temas · {M} cartões prontos" · **Editar** |
| Botão final | Criar baralho com {M} cartões |
| Botão abaixo da lista | Novo baralho (abre o mesmo fluxo, com o campo vazio) |
| Sem internet (V17) | Precisa de internet para falar com a IA. |

### 2.3 Erros e casos de borda

| Caso | Comportamento |
|---|---|
| Pedido com menos de 3 letras | Botão Começar desligado |
| Sem internet (V17) | Campo e Novo baralho continuam visíveis; ao tocar, o aviso de internet. Receber baralho e restaurar backup continuam funcionando |
| A IA respondeu sem o bloco `baralho` (só temas e cartões) | Aceita: título = texto digitado (até 40 caracteres), sem objetivo; mostra "Editar" para completar |
| Título igual ao de outro baralho | Aceita (os ids são únicos); o título fica igual |
| Nível fora dos três valores | Ignora o nível |
| Temas sem cartões | Saem do baralho ao salvar (como no Criar com IA) |
| Colou a instrução no lugar da resposta | Mesma detecção de hoje (cartões do exemplo) |
| Saiu da tela no meio | Perde o que foi colado (como no Criar com IA). Guardar rascunho fica para depois, se a telemetria mostrar abandono no passo 4 |

## 3. A instrução de planejamento (prompt novo)

Arquivo novo `src/core/ia/plano.ts`, com `VERSAO_PLANO = 1` e `montarPlano(pedido)`. Mesmo estilo da instrução de hoje: seções curtas, regras claras e um exemplo testado pelo validador.

### 3.1 Seções da instrução

| Seção | Conteúdo |
|---|---|
| Papel | "Você é um professor que monta um plano de estudo em flashcards para o app tatino." |
| Pedido | O texto da pessoa, entre linhas `===` |
| Material | Se houver (mesmo texto de hoje para PDF/texto); senão, "use conhecimento consolidado" |
| Antes de responder (V2) | "Se o pedido for vago demais para montar um bom plano (não dá para saber o nível, o objetivo ou o recorte), faça até 3 perguntas curtas, numa mensagem só, e espere. Senão, responda direto." |
| Planejar | Interpretar o objetivo; escolher o **nível**; definir **foco** (2 a 5 itens), **evitar** (opcional), de 3 a 8 **temas** na ordem em que se aprende, com uma descrição de 1 frase cada |
| Cartões | 15 cartões (V6) distribuídos pelos temas, começando pelos primeiros; adequados ao nível; tipos de acordo com o assunto (calculo só se houver contas; para idiomas, conceito e associacao) |
| Formato | O JSON da seção 3.2 e as regras de cada tipo de cartão, as mesmas de `instrucao.ts` (reaproveitadas de uma função comum, para não divergir) |
| Regras | Português do Brasil (menos o conteúdo do idioma estudado); uma ideia por cartão; nada de spoilers ou do que estiver em "evitar"; JSON válido |
| Exemplo | Um exemplo curto de outro assunto, testado pelo validador |

### 3.2 Formato da resposta

```json
{
  "baralho": {
    "titulo": "Espanhol para viagem",
    "objetivo": "Conversar o básico numa viagem ao México",
    "nivel": "iniciante",
    "foco": ["frases de sobrevivência", "números e preços", "pedir comida"],
    "evitar": ["gramática formal"]
  },
  "temas": [
    { "id": "saudacoes", "nome": "Saudações", "descricao": "Cumprimentar, se apresentar e agradecer" }
  ],
  "cartoes": [ { "id": "c1", "tipo": "conceito", "tema": "saudacoes", "frente": "…", "verso": "…" } ]
}
```

| Campo | Obrigatório | Limite |
|---|---|---|
| `baralho.titulo` | sim (senão, usa o texto digitado) | até 40 caracteres |
| `baralho.objetivo` | não | 1 frase, até 160 caracteres |
| `baralho.nivel` | não | `iniciante`, `intermediario` ou `avancado` |
| `baralho.foco` / `evitar` | não | até 5 itens de até 60 caracteres |
| `temas[].descricao` | não | até 120 caracteres |

## 4. Dados

### 4.1 Tipos (`src/core/types.ts`)

```ts
export type Nivel = 'iniciante' | 'intermediario' | 'avancado'

export interface Objetivo {
  /** O que a pessoa digitou em "O que você quer aprender hoje?". */
  pedido?: string
  /** O objetivo em 1 frase, como a IA (ou a pessoa) definiu. */
  resumo?: string
  nivel?: Nivel
  foco?: string[]
  evitar?: string[]
}

// Tema ganha: descricao?: string
// Baralho ganha: objetivo?: Objetivo
```

| Item | Decisão |
|---|---|
| Compatibilidade | Tudo opcional: baralhos, backups e arquivos de hoje continuam válidos sem migração |
| Validação (`validar.ts`) | Aceita `objetivo` ausente; se presente, confere tipos e limites; nível fora da lista é erro do arquivo de fábrica, mas na leitura da IA é só ignorado |
| Enviar baralho | O objetivo vai junto (faz parte do baralho) |
| Receber atualização do mesmo baralho | Como o nome: o objetivo de quem recebe fica; só entra se não houver |
| Backup | Vai junto, sem mudança |
| Fábrica (V13-B) | One Piece fica sem configuração; `semear` não muda |

### 4.2 Leitura da resposta (`src/core/ia/resposta.ts`)

| Função | O que faz |
|---|---|
| `lerPlano(dados, pedido)` nova | Lê `baralho`, normaliza (corta limites, ignora nível inválido) e chama a `lerResposta` de hoje para temas e cartões, com um baralho vazio de destino |
| `pareceperguntas(texto)` nova | Sem JSON e com "?" em linhas curtas → devolve o aviso do V2 |
| `lerResposta` | Passa a guardar `descricao` dos temas novos |

## 5. Criar com IA refinado pelo objetivo

Mudanças em `montarInstrucao` (`VERSAO_INSTRUCAO` 2 → 3):

| Item | Hoje | v3 |
|---|---|---|
| Objetivo do baralho | Não existe | Seção "## Objetivo do baralho" com resumo, nível, foco e evitar (quando houver) |
| Temas | Só id e nome | Id, nome e descrição; o tema escolhido (vindo do "Que tal mais cartões?") vai marcado como prioridade |
| Cartões existentes (V12) | Não vão | "Já cobertos (não repita):" com o resumo comprimido da seção 5.1 |
| Prioridade | "Priorize o que é mais cobrado em prova" | "Priorize o que mais serve ao objetivo" (sem objetivo: "o mais importante do assunto") |
| Nível | Não existe | "Escreva para o nível {nivel}" |
| Fonte padrão | "Gerado pelo Gemini" | "Gerado por IA" |
| Origem "Assunto" | Texto livre | Pré-preenchida com o tema fraco **ou**, sem tema fraco, com "Aprofundar: {foco}" |
| Baralho sem objetivo (V11) | — | Instrução igual à de hoje, com as melhorias de repetição e prioridade; aviso discreto "Definir objetivo" na tela |
| Corrigir com IA (`corrigir.ts`) | Não sabe o objetivo | Recebe objetivo e nível, para corrigir sem fugir do recorte (ex.: sem spoilers) |

### 5.1 Resumo comprimido do que o baralho já cobre (V12)

A ideia é mandar à IA só as palavras que identificam o assunto de cada cartão, agrupadas por tema, em vez das perguntas inteiras. A IA entende "unidade força si" tão bem quanto "Qual a unidade de força no SI?".

| Passo | Regra | Exemplo |
|---|---|---|
| 1. Texto de partida | `frente` (ou `titulo`, no cálculo) | "Qual a unidade de força no **SI**?" |
| 2. Limpar | Tira `$…$`, `**`, pontuação e acentos só para comparar | "qual a unidade de forca no si" |
| 3. Tirar palavras vazias | Artigos, preposições e palavras de pergunta (o, a, de, no, que, qual, quais, é, um, uma, para, como, por, quando…) | "unidade forca si" |
| 4. Cortar | Até 5 palavras por cartão, com a grafia original (com acento) | "unidade força SI" |
| 5. Juntar | Sem repetidos; por tema, numa linha, separados por "; " | "Dinâmica: unidade força SI; 2ª lei Newton; atrito estático cinético" |
| 6. Limite (V18) | Até 3.000 caracteres; passando disso, ficam os cartões mais recentes e a linha termina com "(e mais N)" | — |

| Comparação | Perguntas inteiras (V12 original) | Resumo comprimido |
|---|---|---|
| Por cartão | ~80 caracteres | ~20 a 25 caracteres |
| Cartões que cabem em 3.000 caracteres | ~37 | ~130 a 150 |
| Informação para a IA | Pergunta exata | Assunto do cartão; a IA ainda pode perguntar o mesmo assunto de outro jeito, o que é bom para fixar |

Função nova `jaCobertos(baralho)` em `src/core/ia/cobertos.ts`, com teste do exemplo acima e do limite. A instrução diz: "Já cobertos (não repita o mesmo assunto com a mesma pergunta; pode aprofundar):".

## 6. Incentivo a mais cartões

O fluxo de hoje continua. O que muda:

| Lugar | Hoje | v3 |
|---|---|---|
| Fim da sessão, "Que tal mais cartões?" | Tema com mais erros, ou "use outra aula" | Igual, mas o pedido já vai com o objetivo; sem tema fraco, o texto fala do objetivo: "Quer avançar em {objetivo}? A IA cria mais 15 cartões." |
| Tela do baralho | Botão Criar com IA | Igual; quando o baralho tem 80% ou mais dominados, um aviso "Você já domina quase tudo. Quer subir de nível?" que abre o Criar com IA pedindo cartões um nível acima (só no texto do pedido; o nível do baralho só muda se a pessoa editar) |
| Baralho recém-criado pelo fluxo novo | — | Depois da primeira sessão, o "Que tal mais cartões?" sugere o primeiro tema que ainda tem poucos cartões |

## 7. Ideias para depois da v3 (não decidir agora)

| Ideia | Quando pensar |
|---|---|
| Trilha: liberar os temas na ordem do plano e sugerir "próximo tema" | Se a telemetria mostrar baralhos criados pelo fluxo novo sendo estudados por mais de uma semana |
| Guardar rascunho do fluxo Aprender | Se houver abandono no passo "Cole a resposta" (P42) |
| Sugestões de pedidos ("Tente: …") no campo | Se muita gente abrir o campo e não digitar |

## 8. Telemetria (novos eventos)

Mesma regra de hoje: só nomes e números, nunca o texto digitado nem o conteúdo dos cartões.

| Evento | Quando | Propriedades |
|---|---|---|
| `aprender_aberto` | Tocou Começar ou Novo baralho | `de` (`campo` ou `botao`), `tamanho` (faixa do texto: curto/médio/longo) |
| `aprender_material` | Abriu "Tenho um material" | `origem` (`pdf` ou `texto`) |
| `ia_copiado` (já existe) | Copiou a instrução de planejamento | `qual: "plano"`, `origem` (`tema`, `pdf`, `texto`) |
| `aprender_perguntas` | Colou perguntas da IA no lugar da resposta | — |
| `aprender_resposta_lida` | Leu um plano | `temas`, `cartoes`, `com_erro`, `nivel`, `com_baralho` (veio o bloco `baralho`) |
| `aprender_resposta_invalida` | Não achou JSON | — |
| `aprender_config_editada` | Mudou algo no cartão do baralho antes de criar | `campos` (quantos) |
| `aprender_baralho_criado` | Criou o baralho | `temas`, `cartoes`, `desmarcados`, `nivel` |
| `baralho_criado` (já existe) | Criação manual | Sai, junto com o formulário (V4) |
| `ia_copiado` / `ia_cartoes_salvos` (já existem) | Criar com IA | ganham `com_objetivo` e `versao_instrucao` |
| `objetivo_editado` | Salvou mudança no objetivo em Configurar baralho | `nivel_mudou` |
| `sugestao_subir_nivel` | Tocou "Quer subir de nível?" | — |

Funil a montar no PostHog (junto da P42): `aprender_aberto` → `ia_copiado(plano)` → `aprender_resposta_lida` → `aprender_baralho_criado` → `sessao_concluida` no baralho novo.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Resposta longa demais cortada nas IAs grátis | 15 cartões na primeira leva (V6); avaliação nas 4 IAs (PLANO-V3, E0) |
| IA inventa conteúdo em assuntos de nicho | Regra "fiel ao conhecimento consolidado; se não tiver certeza, não crie o cartão"; conferência com "Incluir" |
| Pessoa não entende o vai e vem entre apps | Mesmos passos numerados do Criar com IA, que já foi testado com sucesso (P22) |
| Perguntas da IA (V2) confundirem | Aviso específico ao colar perguntas; instrução pede perguntas numa mensagem só |
| Sem internet não dá para começar um baralho (V17) | Aviso claro; o que já está no aparelho continua funcionando offline |
| Instrução de planejamento e de cartões divergirem | As regras dos tipos de cartão ficam numa função só, usada pelas duas |
