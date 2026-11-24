# Auditoria da telemetria (PostHog) — 24/11/2026

Pendência P119. Código lido na v3.22.0 (`src/core/telemetria.ts` e as ~80 chamadas `evento(...)` em `src/ui/`). Dados do PostHog (projeto 740606) lidos em 24/11 (seção 4).

## 1. Como a telemetria funciona hoje

| Ponto | Como está | Avaliação |
|---|---|---|
| Envio | Fila no `localStorage` (máx. 500), lote de até 100 para `/batch/` 5 s depois do último evento, ao voltar a internet e ao esconder a tela (`keepalive`) | ✅ Bom para PWA offline |
| Identidade | `distinct_id` aleatório por aparelho, `$process_person_profile: false` | ✅ Anônimo; não há perfil de pessoa (ok) |
| Propriedades fixas | `versao` (da hora do evento), `teste: true` em aparelho de teste, `$lib: filidilo` | ⚠️ Falta plataforma, sessão e uuid (achados A2, A3, A7) |
| Desligar | Preferências → "Enviar estatísticas de uso" apaga fila e id | ✅ (o aviso de desligar estava se perdendo: A1, corrigido) |

## 2. Inventário dos eventos

| Área | Eventos (propriedades) |
|---|---|
| Abertura e instalação | `app_aberto {instalado}`, `app_instalado`, `instalar_pedido`, `instalar_aceito`, `instalar_concluido`, `instalar_adiado {definitivo}`, `aparelho_teste {ligado}` |
| Preferências | `tema_escolhido {tema}`, `estatisticas_desligadas`, `estatisticas_ligadas` (novo), `convite_aberto {onde}` |
| Meus baralhos | `progresso_aberto {onde}`, `semana_aberta`, `baralhos_ordenados {total}`, `aprender_aberto {de, tamanho}`, `ofensiva_estudar {sequencia}`, `link_aberto {ok, tipo, motivo}`, `desafio_aberto {junto, tipo}` |
| Tela do baralho | `sessao_iniciada {por, meta, temas, temas_total, cartoes, so_novos, nunca_vistos}`, `baralho_desarquivado`, `sugestao_subir_nivel` |
| Sessão | `resposta {tipo, nota, chute, sem_alternativas}`, `nao_sei {tipo}`, `cartao_pulado {tipo}`, `corrigir_aberto`, `corrigir_manual_aberto`, `cartao_arquivado/desarquivado {onde}`, `sessao_abandonada {respondidos, por}`, `sessao_terminada {respondidos}`, `sessao_concluida {motivo, certos, errados, chutes…}` |
| Fim de sessão | `ofensiva_dia {sequencia}`, `folga_usada {n}`, `folga_ganha {motivo}`, `marco {tipo}`, `comemoracao {motivo}`, `sugestao_mais_cartoes {motivo}`, `ofensiva_perdida {sequencia}` |
| Aprender (baralho novo) | `aprender_modo`, `aprender_nivel {nivel}`, `aprender_material {origem}`, `ia_copiado {qual, origem, modo}`, `aprender_perguntas`, `aprender_resposta_lida`, `aprender_resposta_invalida`, `aprender_config_editada {campos}`, `aprender_baralho_criado` |
| Criar com IA (cartões) | `ia_aberta {ia}`, `ia_copiado {qual, origem, com_objetivo, versao_instrucao}`, `ia_perguntas`, `ia_resposta_lida {cartoes, com_erro}`, `ia_resposta_invalida`, `ia_cartoes_salvos {cartoes, desmarcados…}` |
| Edição | `cartao_salvo {tipo, novo, onde}`, `lista_colada {cartoes}`, `corrigir_salvo {tipo}`, `objetivo_editado`, `baralho_duplicado`, `baralho_excluido {cartoes}`, `baralho_arquivado` |
| Compartilhar e receber | `enviar {o_que, onde, como, progresso}`, `compartilhar_imagem {modelo, formato, como, com_nome, onde}`, `desafio_enviado/respondido/salvo`, `recebido_baralho {acao, novos, atualizados, progresso}`, `recebido_cartoes {cartoes}` |
| Progresso | `progresso_filtro {periodo, baralho}`, `progresso_estudar_tema`, `meta_semana_definida {tipo, n}`, `progresso_compartilhar {bloco}` (P118) |
| Backup | `backup_salvo`, `backup_restaurado` |

## 3. Perguntas × cobertura

| Pergunta | Responde hoje? | Com o quê / o que falta |
|---|---|---|
| Quantos usam por dia/semana, quantos voltam (D1, D7) | ⚠️ | `app_aberto` por `distinct_id` dá. Mas sem saber se a pessoa tem baralho, "abriu" mistura curioso com usuário de verdade (A4) |
| De onde vêm os novos | ❌ | Não há primeira abertura nem origem (A5). Só dá para ver `link_aberto`/`desafio_aberto` no mesmo dia do primeiro `app_aberto` |
| Celular ou computador, iPhone ou Android | ❌ | Sem plataforma (A3). Importa para instalar o app e para o anexo na IA |
| Funil de ativação (abre → cria/recebe baralho → 1ª sessão concluída) | ✅ | `app_aberto` → `aprender_baralho_criado`/`recebido_baralho` → `sessao_concluida` |
| Funil do Aprender e da IA, e onde quebra | ✅ | Bem coberto, inclusive resposta inválida e versão da instrução |
| Quanto tempo se estuda | ❌ | O tempo ativo existe no aparelho (`src/core/sessoes.ts`) mas não vai no evento (A6) |
| Qual modo de estudo funciona (acertos, tempo, livre) | ⚠️ | `sessao_iniciada` tem `por`, `sessao_concluida` não: o cruzamento exige casar eventos (A6) |
| Baralho pronto de fábrica × criado × recebido: qual engaja | ❌ | Nenhum evento de sessão diz a origem do baralho (A6) |
| Ofensiva, folgas e conquistas seguram a pessoa | ✅ | `ofensiva_dia`, `ofensiva_perdida`, `folga_*`, `marco` |
| Viralidade (links, desafios, imagens) | ✅ | `enviar`, `compartilhar_imagem`, `desafio_*`, `link_aberto`. Falta só ligar o envio de um aparelho à chegada em outro (impossível sem identificar; ok assim) |
| O app está quebrando para alguém | ❌ | Nenhum erro é registrado (A8) |
| A pessoa atualiza a versão | ⚠️ | `versao` em todo evento mostra a adoção; o toque em "Atualizar" não tem evento (A9) |
| Os números estão certos | ⚠️ | `estatisticas_desligadas` nunca chegava (A1) e lotes reenviados podiam duplicar (A2): corrigidos |

## 4. Dados reais (lidos em 24/11, de 16/11 a 24/11)

Consultas SQL (só leitura) no projeto 740606, eventos `$lib` `tatino` e `filidilo`.

| Medida | Valor | Leitura |
|---|---|---|
| Eventos / aparelhos | 2.461 / 48 | Base pequena: tudo abaixo é tendência, não conclusão |
| Aparelhos marcados como teste | **0** (nenhum `aparelho_teste`, nenhum `teste: true`) | O filtro de teste do `AGENTS.md` não tira nada: os aparelhos do Marcelo contam como usuários (A11) |
| Aparelhos que só abriram o app (nenhum outro evento) | 18 de 48 | Muita gente chega e sai sem fazer nada. Sem origem (A5) e plataforma (A3) não dá para saber quem são |
| Dias de uso por aparelho | 1 dia: 38 · 2–3: 6 · 4–9: 4 | Retenção baixa ou base de testes; os 4 aparelhos de 4+ dias devem ser em parte do Marcelo |
| App instalado | 171 aberturas instaladas, de só **3** aparelhos | Quem instala usa muito |
| Ativação | iniciaram sessão 14 · concluíram 9 · criaram baralho (Aprender/IA) 11 · receberam baralho 7 | Funil coberto ✅ |
| Sessões | 101 iniciadas, 58 concluídas, 17 abandonadas; por acertos 65, tempo 30, livre 6 | Livre é novo (v3.16.0) |
| Respostas | 1.019: acertou 581, quase 124, chute 36, errou 278 | — |
| Links abertos | 41: ok 29, falha 12 (2 expirados; 10 sem motivo, de antes da v3.14.3) | — |
| Respostas da IA recusadas | Concentradas na v3.3.0 (14+2) e v3.8.2 (3); nenhuma depois da v3.13.3 no Aprender | Confirma a P42 |
| **Duplicados** (mesmo aparelho, evento e instante) | **61** grupos, 33 deles `app_aberto` | Confirma o A2: lotes reenviados ao sair do app. Corrigido daqui para a frente com o `uuid` |
| Eventos do código que **nunca** apareceram | `desafio_enviado/aberto/respondido/salvo` (desde a v3.11.0), `lista_colada`, `recebido_cartoes`, `objetivo_editado`, `sugestao_subir_nivel`, `aprender_perguntas`, `ia_perguntas`, `aprender_config_editada`; e os novos da v3.19+ (arquivar, painel Seu progresso, meta da semana) | Desafios: ninguém usou em 13 dias. Os da v3.19+ ainda são recentes |
| Evento no PostHog que não existe mais no código | `teste_instalacao` (2) | Resto de teste antigo; ignorar |

## 5. Achados e propostas

| # | Achado | Proposta | Custo | Status |
|---|---|---|---|---|
| A1 | `estatisticas_desligadas` entrava na fila e a fila era apagada em seguida: nunca chegava. Religar não avisava | O aviso vai na hora, sozinho, antes de apagar a fila; religar manda `estatisticas_ligadas` | Pequeno | ✅ Feito (aguarda publicar) |
| A2 | Lote enviado ao sair do app podia ser reenviado se a resposta se perdesse → evento contado duas vezes | `uuid` em todo evento (o PostHog descarta repetidos); eventos antigos da fila ganham uuid no envio | Pequeno | ✅ Feito (aguarda publicar) |
| A3 | Sem plataforma | `plataforma` (`ios`/`android`/`desktop`) e `tela` (`pequena`/`media`/`grande`) no `app_aberto`, tirados do user-agent e da largura, sem mandar o user-agent | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A4 | `app_aberto` sem estado | `baralhos`, `cartoes` (faixas: 0, 1–20, 21–100, 100+), `dias_de_uso` (faixa) e `ofensiva` | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A5 | Sem primeira abertura e origem | `primeira_abertura {origem: direto|link|desafio|arquivo|convite}` uma vez por aparelho | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A6 | `sessao_concluida` pobre | Juntar `por`, `meta`, `bateu_meta`, `segundos` (tempo ativo), `origem_baralho` (fábrica/aprender/ia/recebido/manual); `segundos` também em `sessao_abandonada` | Médio (origem precisa marcar baralhos de fábrica e do Aprender) | ✅ Feito (aguarda o Marcelo testar) |
| A7 | Sem `$session_id` | Id de sessão de uso (novo após 30 min parado) em todo evento: libera duração de uso e caminhos no PostHog | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A8 | Erros invisíveis | `erro {onde, tipo}` em `window.onerror`, `unhandledrejection` e nos `catch` de backup, importação e banco; só nome do erro, nunca mensagem com dados | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A9 | Ações sem evento | `atualizar_versao`, `ia_cartoes_descartados {cartoes}` | Pequeno | ✅ Feito (aguarda o Marcelo testar) |
| A10 | Fila corta em 500 sem aviso | Deixar como está (só quem fica muito tempo sem internet perde os mais antigos) | — | Registrado |
| A11 | Nenhum aparelho foi marcado como teste: os do Marcelo contam como usuários | Marcelo abre `https://marcelobritonet.github.io/filidilo/?teste=1` em cada aparelho e navegador (no iPhone, no Safari e no app da tela inicial). Os eventos antigos desses aparelhos saem das contas junto | Nenhum (só o Marcelo) | Marcelo faz |
| A12 | Desafios (v3.11.0) nunca usados | Não é da telemetria: decidir se o desafio fica mais visível ou sai | — | Marcelo decide |

## 6. O que foi implementado (A3–A9)

| # | Evento ou propriedade | Detalhe |
|---|---|---|
| A3 | `plataforma` (`ios`/`android`/`desktop`) e `tela` (`pequena`/`media`/`grande`) no `app_aberto` e na `primeira_abertura` | `src/core/metricas.ts` (`plataforma`, `tamanhoTela`); o user-agent não é enviado |
| A4 | `app_estado` uma vez por abertura: `baralhos`, `baralhos_arquivados`, `so_de_fabrica`, `cartoes` (0 · 1-20 · 21-100 · 101-500 · 501+), `dias_de_uso` (desde a 1ª resposta: 1 · 2-7 · 8-30 · 31-90 · 91+ ou `nunca_respondeu`), `ofensiva` (faixa) | `registrarEstado` em `metricas.ts`, chamado no `App.tsx` |
| A5 | `primeira_abertura { origem: link·arquivo·convite·imagem·direto, instalado, plataforma, tela }` e `origem` também no `app_aberto` | Só em aparelho novo: quem já tinha id de estatísticas não conta. A data fica em `tatino-tel-primeiro`, que não é apagada ao desligar (religar não vira aparelho novo). O endereço nas imagens ganhou a marca `?de=convite` (convite de Preferências, também no QR) ou `?de=imagem` (resultado, conquista, semana, progresso); `lerOrigemDaUrl` lê e tira a marca do endereço, mesmo com as estatísticas desligadas. Quem já recebeu uma imagem antiga, sem marca, conta como `direto` |
| A6 | `sessao_fim { concluida, por, meta, bateu_meta, segundos, respostas, acertos, origem_baralho }` quando a sessão é gravada (fim ou saída); `origem_baralho` também no `sessao_iniciada` | `origem_baralho`: fabrica · aprender (tem objetivo) · ia · recebido · manual, pela maioria dos cartões (`origemBaralho`) |
| A7 | `$session_id` (UUID v7) em todo evento; nova sessão depois de 30 min sem evento | `tatino-tel-sessao`, apagado ao desligar |
| A8 | `erro { onde, tipo }`: `global`, `promessa`, `backup_restaurar`, `enviar_link`, `sessao_gravar`, `app_estado` | Só o nome do erro (ex.: `TypeError`), nunca a mensagem; no máximo 10 por abertura |
| A9 | `atualizar_versao { como: botao·sozinho }` e `ia_cartoes_descartados { onde: criar·aprender, cartoes, com_erro }` | `App.tsx`, `CriarComIA.tsx`, `Aprender.tsx` |
| Envios | `enviar` ganhou `cartoes` (quantos cartões foram no baralho ou 1 no cartão) | `enviar.ts`, `EnviarModal.tsx`. Recebidos já eram contados (`recebido_baralho { novos, atualizados }`, `recebido_cartoes { cartoes }`) |

Conferido: 266 testes (inclui a origem `?de=`) (novos em `metricas.test.ts` e `telemetria.test.ts`: UUID v7 e renovação da sessão, primeira abertura só em aparelho novo, erro sem mensagem e com limite), typecheck e build. No localhost (sem chave, nada é enviado) as funções rodam sobre o banco de verdade e uma sessão Livre sai e grava sem erro. **Não conferido:** os eventos chegando ao PostHog, porque só o site publicado tem a chave; depois de publicar, abrir com `?teste=1` e ver no PostHog `primeira_abertura`/`app_estado`/`sessao_fim` com `teste: true`.
