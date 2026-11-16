# tatino. — Especificação da Fase 3: a central de baralhos

> **Plano futuro (adiado em 16/11/2026).** Por ora não haverá central, papéis nem Firebase: cada pessoa cria os próprios baralhos (copiar e colar com uma IA) e envia cartões ou baralhos pelo WhatsApp. Este documento fica como plano para quando a central voltar à pauta.

Uma **central** pública, dentro do app, onde qualquer pessoa adiciona baralhos ao aparelho sem criar conta. A criadora (esposa do Marcelo) gera os baralhos com o Gemini e publica. O Marcelo administra: despublica, exclui e aprova as sugestões dos estudantes.

## 1. Decisões

| # | Tema | Decisão |
|---|---|---|
| C1 | Plataforma | **Firebase**, plano Spark (grátis, sem cartão): Hosting, Authentication e Firestore. Sem Cloud Functions, que não fazem parte do plano grátis. |
| C2 | Edição local de baralho baixado | **Livre.** Atualizações da central preservam os cartões que o estudante editou (mesma regra da v1.3.0). |
| C3 | Sugestões | O estudante pode **"Sugerir para todos"** um cartão editado ou novo; a sugestão vai para a **fila de aprovação** do admin. Aprovada, entra numa nova versão do baralho. |
| C4 | Despublicar e excluir | O admin despublica ou exclui qualquer baralho. A criadora despublica os dela. |
| C4b | Quem já baixou | O baralho **some do aparelho na próxima abertura com internet**, com o aviso "removido da central". O progresso fica guardado, caso o baralho volte. |
| C5 | Reportes | Vão **direto para a criadora**, pela central (não mais pelo WhatsApp) |
| C7 | Direitos autorais | Todo baralho cita a fonte. Material de terceiros pode ser despublicado a qualquer momento. |
| C8 | Material de terceiros | Entra na central como **não listado** (abre por link, não aparece no catálogo) até o autor do material autorizar |
| C9 | Chave do Gemini | Só a criadora tem, e só no aparelho dela: fluxo de criação no app (K3) e chave restrita no Google ao Gemini e ao endereço do app |
| C10 | Sincronizar progresso entre aparelhos | **Depois** (Drive do próprio usuário). Fora desta fase. |
| C11 | Conta para sugerir ou reportar | **Sem conta**: login anônimo invisível do Firebase. O spam é contido pela aprovação do admin e pelos limites das regras. |
| C12 | Endereço | O app muda para **`tatino.web.app`** (grátis, só dele). O endereço antigo do GitHub Pages passa a mostrar o aviso de mudança. A estudante leva os dados por backup e restauração, uma vez. |
| K4 | Entrada dos estudos | Um botão **Estudar**, com uma linha de resumo, e **Ajustar** numa folha que sobe de baixo: Foco (Prova · Revisão do dia), Conteúdo (Tudo · Teoria · Cálculo) e Temas. Sai o cartão "Exercícios de cálculo". |

## 2. Papéis

| Papel | Quem | Pode | Entra com |
|---|---|---|---|
| Estudante | Qualquer pessoa | Ver o catálogo, adicionar baralhos, estudar offline, editar no aparelho, sugerir cartões, reportar erros | Nada (anônimo, só ao sugerir ou reportar) |
| Criadora | Esposa | Criar com IA, publicar, publicar nova versão, despublicar os dela, ler e resolver os reportes dos baralhos dela | Google + papel `criadora` |
| Admin | Marcelo | Tudo da criadora, em qualquer baralho, mais excluir, aprovar ou recusar sugestões e definir papéis | Google + papel `admin` |

Os papéis ficam no Firestore (`papeis/{uid}`) e só o admin os altera. O primeiro admin é cadastrado à mão no console do Firebase.

## 3. Dados (Firestore)

| Coleção | Conteúdo | Quem lê | Quem escreve |
|---|---|---|---|
| `baralhos/{id}` | Metadados: título, descrição, disciplina, etiquetas, autora, versão atual, nº de cartões, fonte, `status` (`publicado` · `nao_listado` · `despublicado`), datas | Todos (`publicado` na listagem; `nao_listado` só pelo id) | A autora (os dela) e o admin |
| `baralhos/{id}/versoes/{n}` | Conteúdo da versão n: temas e cartões (o mesmo formato do app). Cada documento tem até 1 MB, o que dá centenas de cartões. | Igual ao baralho | A autora e o admin; uma versão publicada não muda |
| `sugestoes/{id}` | Baralho, cartão original (cópia), cartão sugerido, autor anônimo, `status` (pendente · aprovada · recusada) | Admin; o autor vê as dele | Qualquer um cria (anônimo); só o admin muda o status |
| `reportes/{id}` | Baralho, cartão, motivo, texto, autor anônimo, `status` (aberto · resolvido) | A autora do baralho e o admin | Qualquer um cria; a autora e o admin resolvem |
| `papeis/{uid}` | `admin` ou `criadora` | O próprio usuário e o admin | Só o admin |

As regras do Firestore são a única barreira de segurança, porque a configuração do Firebase no app é pública por natureza. Elas limitam o tamanho dos documentos, os campos permitidos e quem escreve o quê. Ficam versionadas no repositório e testadas no emulador.

## 4. Telas novas

| Tela | Para | Conteúdo |
|---|---|---|
| **Central** | Todos | Catálogo por disciplina, busca, cartão de cada baralho (título, autora, nº de cartões, versão, atualização). Detalhe → **Adicionar**. Precisa de internet. |
| Atualização disponível | Todos | Aviso no baralho baixado: "versão 3 disponível" → resumo (novos, corrigidos, preservados) → Atualizar |
| Sugerir para todos | Estudante | Botão no editor de cartão, para baralhos vindos da central |
| **Entrar** | Criadora e admin | "Entrar com Google" em Configurações; aparece o menu Criar e publicar ou Administrar, conforme o papel |
| **Publicar** | Criadora | Num baralho do aparelho: metadados, validação, **Publicar** ou **Publicar nova versão**, listado ou não listado |
| Meus baralhos publicados | Criadora | Versões, despublicar e republicar, **reportes recebidos** |
| **Administrar** | Admin | Todos os baralhos (despublicar, republicar, excluir), **fila de sugestões** (original × sugerido lado a lado → Aprovar ou Recusar) e papéis |

## 5. Comportamentos

| Situação | O que acontece |
|---|---|
| Abrir o app com internet | Confere em segundo plano os baralhos que vieram da central: versão nova → aviso; despublicado ou excluído → remove do aparelho, guarda o progresso e avisa |
| Sem internet | Estudo normal; a central mostra "sem conexão" |
| Sugestão aprovada | O admin aprova → o app dele valida e grava a versão n+1 com o cartão → quem tem o baralho recebe a atualização |
| Reporte | Vai para a central e também fica na lista local, como hoje |
| Gerar com o Gemini | Igual à v1.7.0, só no aparelho da criadora |

## 6. Fora da fase 3

Publicação aberta a qualquer pessoa, avaliações e comentários, pagamentos, sincronização de progresso (C10), domínio comprado e Cloud Functions.

## 7. Pronto quando

1. Um estudante sem conta abre a central, adiciona um baralho e estuda offline.
2. A criadora gera com o Gemini, publica e publica uma nova versão; quem baixou recebe a atualização sem perder as próprias edições.
3. O admin despublica um baralho e ele some dos aparelhos na próxima abertura com internet, com o progresso guardado.
4. Uma sugestão de estudante é aprovada pelo admin e chega a todos numa nova versão.
5. Os reportes chegam à criadora pela central.
6. As regras do Firestore passam nos testes do emulador: ninguém escreve onde não pode.
7. O app roda em `tatino.web.app`, e o endereço antigo orienta a mudança.
