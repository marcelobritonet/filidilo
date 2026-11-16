# Tatino — Especificação da Fase 2

Transformar o Tatino num app de estudo para **qualquer disciplina**, sem reescrever o app: criar, importar, compartilhar e gerar baralhos com IA (Gemini).

## 1. Escopo e público

- **Uso exclusivo da estudante.** Sem contas, sem multiusuário, sem uso aberto (fica para depois).
- Ela não programa: nenhuma tela mostra JSON. Tudo por botões, formulários e prévias.
- Cada parte é publicada direto na `main` assim que fica pronta (G12).

## 2. Baralhos

| Item | Decisão |
|---|---|
| Onde ficam | No aparelho (IndexedDB). Não existe baralho "oficial": todos são dela e editáveis (G1). |
| Baralho de exemplo | Pré-instalado na primeira abertura, como baralho comum. O progresso atual é mantido, porque as chaves já são `baralho/cartão`. |
| Vários baralhos | Tela **Meus baralhos**: lista com progresso e data da prova; botões **+ Novo baralho** e **Criar com IA**. |
| Configurar | Nome, temas, tema prioritário ("cai na prova") e data da prova (G11). |
| Duplicar e excluir | Duplicar copia os cartões, não o progresso. Excluir pede confirmação e permite desfazer por alguns segundos. |
| Compartilhar | Gera um arquivo `nome.tatino.json` e abre o compartilhamento do Android (WhatsApp etc.). Do outro lado: segurar o arquivo → Compartilhar → tatino. (G7; o botão "Abrir baralho recebido" foi removido na v1.6.1). |
| Atualização (H4) | Importar um arquivo com o **mesmo id** de baralho atualiza por `id` de cartão: troca os não editados, **mantém os que ela editou**, acrescenta os novos e não apaga nada. Mostra um resumo antes de aplicar. |

## 3. Cartões

| Item | Decisão |
|---|---|
| Formulário | Criar e editar **conceito, V/F e alternativas**. Cálculo: ver, excluir e trocar o tema; a criação é pela IA (G3). |
| Colar lista (G8) | Uma linha por cartão: `Pergunta — Resposta` (aceita `—`, `-`, `;` ou tab). Vira cartões de conceito, com prévia. |
| Metadados novos | `origem` (`manual`, `ia`, `importado`), `editado` e `atualizadoEm`. São opcionais, e o formato da fase 1 continua válido. |

## 4. Criar com IA (o harness)

### 4.1 Fluxo

| Passo | O que acontece |
|---|---|
| 1. Origem | PDF da aula, texto colado ou um tema descrito ("Leis de Newton, nível ensino médio") |
| 2. Opções | Quantidade (10/20/40), mistura (teoria, cálculo ou misto), páginas (opcional), baralho de destino (novo ou existente) |
| 3. Geração | **Gemini direto** (um botão), ou **copiar e colar** no app do Gemini quando não houver chave ou a cota acabar |
| 4. Validação | Mesmo verificador da fase 1: ids, temas e opções, e cada cálculo sorteado 60 vezes |
| 5. Correção | Se houver erro: no modo direto, a IA é chamada de novo **uma vez** com a lista de erros; no copiar e colar, o app mostra a mensagem pronta para colar no Gemini |
| 6. Prévia | Lista com caixinhas. Cálculos aparecem com um exemplo resolvido. Ela desmarca o que não quer. |
| 7. Salvar | Ids novos; `origem: "ia"`; fonte = nome do PDF e página |

### 4.2 Peças do harness

| Peça | Descrição |
|---|---|
| Instruções versionadas | `prompts/` com uma por objetivo (PDF, texto, tema, cálculo), regras de formato, exemplos bons e ruins e exigência de citar a página |
| Esquema de resposta | No modo direto, a resposta estruturada do Gemini (JSON Schema) reduz erros de formato |
| Extração tolerante | Aceita JSON dentro de blocos de código ou com texto em volta |
| Avaliação | Script local que roda o harness em PDFs de aula reais e mede o % de cartões válidos de primeira e quantos citam página. Usa a chave do Gemini por variável de ambiente, nunca no repositório. |

### 4.3 Gemini direto

| Item | Decisão |
|---|---|
| Chave | Chave **gratuita** do Google AI Studio, colada uma vez em **Configurações** e guardada **só no aparelho** (nunca no repositório nem no site) |
| Chamada | Do navegador direto para a API do Gemini, sem servidor nosso |
| PDF | Enviado ao Gemini, que lê texto e imagens (slides só de imagem também funcionam) |
| Cota | Limites do plano gratuito, a confirmar na implementação. Quando estoura, o app oferece o copiar e colar. |
| Privacidade | No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos. Aceitável para material de aula; a tela avisa. |

## 5. Sincronização (por último, opcional — H3)

| Item | Decisão |
|---|---|
| Como | Botão "Entrar com Google"; um arquivo na pasta oculta do app (`appDataFolder`) no Drive dela |
| Mescla | Histórico de revisões por `id` (já só por acréscimo); cartões e baralhos pelo `atualizadoEm` mais recente |
| Quando | Ao abrir o app e ao terminar uma sessão; botão "Sincronizar agora" |
| Pré-requisito | Projeto grátis no Google Cloud (Marcelo, com passo a passo), em modo de teste, com vocês dois como testadores |
| Corte | Se complicar, fica para depois sem afetar o resto |

## 6. Fora da fase 2

Contas e multiusuário, uso aberto, Cloudflare/servidor próprio, importação do Anki, compartilhamento por link, notificações.

## 7. Pronto quando

1. Ela cria um baralho de outra disciplina **sem ajuda**: do PDF à prévia e daí ao estudo.
2. O baralho existente continua com o progresso intacto depois da atualização.
3. Compartilhar e abrir um baralho pelo WhatsApp funciona, e a atualização preserva as edições dela.
4. O harness atinge ≥ 90% de cartões válidos de primeira em PDFs de aula reais.
5. (Opcional) O mesmo progresso aparece no celular e no notebook.
