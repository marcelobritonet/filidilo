# Leitura do uso (PostHog) — 27/11/2026

Pendência P42, segunda leitura. Consultas SQL (só leitura) no projeto 740606, eventos `$lib` `tatino` e `filidilo`, de 16/11 a 27/11 (horário UTC; o dia 27 está incompleto). Leituras anteriores: 21/11 (na própria P42) e 24/11 (`AVALIACAO-TELEMETRIA.md`, seção 4).

**Filtro de teste:** foram tirados os aparelhos que mandaram `aparelho_teste` ou algum evento com `teste: true`. Só **2 aparelhos** estão marcados (540 eventos). Os dois aparelhos que mais respondem (Android, desde 16/11, 10 e 12 dias de uso) podem ser do Marcelo ou da estudante: se forem do Marcelo, faltou marcar.

## 1. Números gerais

| Medida | 21/11 | 24/11 | 27/11 (sem teste) | Leitura |
|---|---|---|---|---|
| Eventos / aparelhos | 856 / 16 | 2.461 / 48 | 3.884 / 71 | A base cresceu, mas segue pequena: é tendência, não conclusão |
| Aparelhos que responderam algum cartão | — | — | 20 de 71 | 51 aparelhos nunca estudaram |
| Aparelhos com mais de 1 dia de uso | 4 | 10 | 18 (11 deles estudaram) | 53 usaram um dia só |
| Aparelhos que só abriram o app | — | 18 | 21 | — |
| Respostas | 268 | 1.019 | 1.760: acertou 1.165 (66%), quase 160, errou 435 | Três quartos das respostas vêm de 3 aparelhos (577, 433 e 301) |
| Sessões iniciadas / concluídas | 44 / 27 | 101 / 58 | 152 / 99 | — |
| App instalado | — | 3 aparelhos | 2 aparelhos (188 aberturas) | Quem instala usa muito; quase ninguém instala |

Aparelhos por dia: 16/11 12 · 21/11 10 · **22/11 28** · 23/11 11 · 24/11 11 · **25/11 26** · 26/11 11.

## 2. De onde vêm e em que aparelho (eventos novos da v3.24)

| Medida | Valor |
|---|---|
| Plataforma (`app_aberto`) | Android 14 · computador 12 · iPhone 6 |
| Origem do aparelho novo (`primeira_abertura`, 22) | link 18 (Android 9, computador 7, iPhone 2) · direto 2 · convite 2 · imagem 0 |
| Aparelhos novos que estudaram | 6 de 22 (todos vieram por link) |
| Estado na abertura (`app_estado`, 36 aparelhos) | **24 só com os baralhos de fábrica e nunca responderam** |

## 3. Achados

| # | Achado | Números | O que fazer | Quem decide |
|---|---|---|---|---|
| U1 | **Link aberto sem salvar o baralho.** A pessoa abre o link, o app mostra o baralho recebido e ela sai sem salvar | 26 aparelhos abriram um link válido; **11 nunca salvaram** (`recebido_baralho`) | Visto em localhost (27/11, aparelho novo, 375×812): a folha "Baralho recebido" aparece por baixo da abertura animada (~4 s) e tem só título, número de cartões, "Adicionar baralho" e "Cancelar" do mesmo tamanho. **Um toque fora da folha a fecha sem aviso**, o link já saiu do endereço e não há como voltar: a pessoa fica com o One Piece de fábrica (bate com os 24 aparelhos "só fábrica"). Nem o fechar nem o Cancelar mandam evento. Opções: salvar direto com Desfazer; ou manter a folha sem fechar por toque fora, com prévia dos cartões e um lembrete na tela inicial | **Marcelo decide** |
| U2 | **Link expirado na chegada.** 7 dos 18 aparelhos novos que vieram por link encontraram o link vencido e nunca usaram o app | 16 aberturas expiradas, quase todas de 25/11 à noite e 26/11 de manhã (o pico de 25/11 às 10h foi uma turma: 7 aparelhos em 15 minutos) | Os links de 2 h eram de antes da v3.32 (30 dias). Conferir na próxima leitura se ainda aparecem; se sim, o envio vem de app antigo (o worker ainda dá 2 h sem parâmetro) e vale subir o padrão do worker | Claude confere em 5/12 |
| U3 | Respostas da IA recusadas acabaram | Nenhuma `*_resposta_invalida` desde a v3.13.3 (21 respostas lidas depois) | Nada | — |
| U4 | Sincronizar, favoritos e desafios | Sync: 3 aparelhos (os testes do Marcelo, 26/11), 4 erros de rede. Favoritos: nenhum evento ainda (v3.34.0 é de hoje). **Desafios: nenhum evento em 11 dias** | Desafios: decisão A12 da P119 | **Marcelo decide (A12)** |
| U5 | Erros | 2 `erro` `global` do tipo `object` na v3.33.0, num aparelho só | Pouco: rejeição sem `Error`. Acompanhar | — |
| U6 | Modo de estudo (`sessao_fim`, 51) | Acertos: 32 sessões, 1,6 a 4 min (mediana), 23 bateram a meta · Livre: 15, 5,5 a 8 min · Tempo: 4, 5 min | O Livre estuda mais por sessão. Nada a mudar | — |
| U7 | Instalação | Só 2 aparelhos com o app instalado | O convite discreto (P55) não está levando a instalar. Ver de novo com mais dados | — |

## 4. Próxima leitura

Lembrete em 5/12, 9h. Conferir: U1 depois de mexer (se mexer), U2 (link expirado depois de 26/11), favoritos, e se os 2 aparelhos que mais estudam são do Marcelo.
