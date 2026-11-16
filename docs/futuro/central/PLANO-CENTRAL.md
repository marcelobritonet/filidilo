# tatino. — Plano de implementação da Fase 3

> **Plano futuro (adiado em 16/11/2026).** Por ora não haverá central, papéis nem Firebase: cada pessoa cria os próprios baralhos (copiar e colar com uma IA) e envia cartões ou baralhos pelo WhatsApp. Este documento fica como plano para quando a central voltar à pauta.

Cada etapa termina com testes passando, conferência no navegador em tamanho de celular, changelog e release. F0 não depende do Firebase e pode começar já.

| # | Etapa | Entrega | Depende de |
|---|---|---|---|
| F0 | **Entrada dos estudos (K4) + fluxo da chave do Gemini (K3)** | Botão Estudar + Ajustar (Foco, Conteúdo, Temas); criação guiada da chave com "Colar do celular", teste e o passo "Proteja sua chave" | — |
| F1 | **Firebase e novo endereço** | Projeto ligado ao app; publicação automática em `tatino.web.app` pelo GitHub Actions; aviso de mudança no endereço antigo | Projeto Firebase do Marcelo (P28) |
| F2 | **Dados e regras** | Coleções e regras do Firestore, com testes no emulador (quem lê, quem escreve, tamanhos, `nao_listado`) | F1 |
| F3 | **Central para o estudante** | Catálogo, busca, adicionar, aviso de atualização (mescla preservando edições), remoção ao despublicar com o progresso guardado | F2 |
| F4 | **Criadora** | Entrar com Google; publicar, nova versão, listado ou não listado, despublicar; reportes recebidos | F2 |
| F5 | **Admin** | Administrar baralhos (despublicar, republicar, excluir); fila de sugestões (comparar, aprovar → nova versão, recusar); papéis | F4 |
| F6 | **Estudante contribui** | "Sugerir para todos" e reportar para a central, com login anônimo e limites | F3, F5 |
| F7 | **Lançamento** | Hidrodinâmica publicado como não listado; guia de mudança (backup → novo endereço → restaurar); chave da criadora restrita ao novo endereço | F1–F6 |

## O que o Marcelo faz (passo a passo será fornecido)

| # | Ação | Quando |
|---|---|---|
| P28 | Criar o projeto no Firebase (plano Spark, grátis), ativar Authentication (Google e Anônimo) e Firestore, e registrar um app web. A configuração do app não é segredo e pode vir para mim. | Antes da F1 |
| P29 | Criar no GitHub o segredo de publicação do Firebase (conta de serviço) para o GitHub Actions. Eu explico; quem cola o segredo é você. | F1 |
| P30 | Cadastrar o próprio uid como `admin` no console (uma vez) e me dizer o e-mail Google da criadora | F4/F5 |

## Riscos

| Risco | Mitigação |
|---|---|
| Regras mal escritas expõem escrita | Regras versionadas e testadas no emulador em cada mudança (F2) |
| Sem validação no servidor (plano grátis) | Só a criadora e o admin publicam; os apps deles validam antes de gravar; as regras limitam tamanho e campos |
| Spam de sugestões anônimas | Nada fica público sem aprovação; uma sugestão pendente por cartão por aparelho |
| A estudante perder dados na mudança de endereço | Backup antes; guia passo a passo; o endereço antigo continua funcionando até ela confirmar |
| Cota grátis do Firestore | 50 mil leituras por dia: o catálogo é lido uma vez por abertura e as versões só ao adicionar ou atualizar |
| Material de terceiros | Fonte obrigatória, não listado por padrão para conteúdo de apostila, despublicação com remoção dos aparelhos |
