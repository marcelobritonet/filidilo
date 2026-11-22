// Harness "Criar com IA": monta a instrução que a estudante cola na IA.
// Versão da instrução: mude ao alterar regras, para comparar a qualidade entre versões (E6).
import type { Baralho, Cartao, Objetivo, Tema } from '../types'
import { infoNivel } from '../types'
import { jaCobertos } from './cobertos'

export const VERSAO_INSTRUCAO = 11

export type Origem = 'arquivo' | 'texto' | 'tema'
export type Mistura = 'misto' | 'teoria' | 'calculo'

export interface PedidoIA {
  origem: Origem
  /** Texto colado (origem "texto"). */
  texto?: string
  /** Tema descrito (origem "tema"), ex.: "Leis de Newton, ensino médio". */
  assunto?: string
  quantidade: number
  mistura: Mistura
  /** Baralho de destino: os temas, o objetivo e os cartões dele entram na instrução. */
  baralho?: Pick<Baralho, 'titulo' | 'temas'> & Partial<Pick<Baralho, 'objetivo' | 'cartoes'>>
  /** Id do tema que a pessoa quer reforçar ("Que tal mais cartões?"). */
  temaPrioritario?: string
}

/** Exemplos que vão dentro da instrução. Testados pelo validador (instrucao.test.ts). */
export const EXEMPLOS: { temas: Tema[]; cartoes: Cartao[] } = {
  temas: [
    { id: 'cinematica', nome: 'Cinemática' },
    { id: 'dinamica', nome: 'Dinâmica' },
  ],
  cartoes: [
    {
      id: 'c1', tipo: 'conceito', tema: 'cinematica',
      frente: 'O que é velocidade média?',
      verso: 'A razão entre o deslocamento e o intervalo de tempo: $v_m = \\Delta s / \\Delta t$.',
      explicacao: 'Não depende do caminho percorrido, só das posições inicial e final.',
      fonte: { apostila: 'Aula 2 - Cinemática', pagina: 4 },
    },
    {
      id: 'c2', tipo: 'vf', tema: 'dinamica',
      frente: 'Se a força resultante sobre um corpo é nula, ele está necessariamente parado.',
      resposta: false,
      explicacao: 'Ele pode estar em movimento retilíneo uniforme (1ª lei de Newton).',
      fonte: { apostila: 'Aula 3 - Dinâmica', pagina: 2 },
    },
    {
      id: 'c3', tipo: 'associacao', tema: 'dinamica',
      frente: 'Qual a unidade de força no SI?',
      opcoes: ['newton (N)', 'joule (J)', 'watt (W)', 'pascal (Pa)', 'dina (dyn)', 'quilograma (kg)'],
      correta: 0,
      outrasFormas: ['N, que equivale a kg·m/s²'],
      explicacao: '1 N = 1 kg·m/s².',
      fonte: { apostila: 'Aula 3 - Dinâmica', pagina: 5 },
    },
    {
      id: 'c4', tipo: 'calculo', tema: 'dinamica',
      titulo: 'Segunda lei de Newton',
      enunciado: 'Um bloco de {m} kg recebe uma força resultante de {F} N. Calcule a aceleração e a velocidade após {t} s, partindo do repouso.',
      parametros: {
        m: { min: 2, max: 20, passo: 1, unidade: 'kg' },
        F: { min: 10, max: 200, passo: 5, unidade: 'N' },
        t: { min: 2, max: 10, passo: 1, unidade: 's' },
      },
      etapas: [
        {
          nome: 'a', pergunta: 'Aceleração', expr: 'F/m', unidade: 'm/s²', casas: 2,
          resolucao: ['F = m·a → a = F/m', 'a = {F}/{m} = **{a:2} m/s²**'],
        },
        {
          pergunta: 'Velocidade após {t} s', expr: 'a*t', unidade: 'm/s', casas: 2,
          resolucao: ['v = v₀ + a·t, com v₀ = 0', 'v = {a:2}·{t} = **{resultado:2} m/s**'],
        },
        {
          pergunta: 'A aceleração é maior que 10 m/s²?', expr: 'se(a > 10, 0, 1)', opcoes: ['Sim', 'Não'],
          resolucao: ['a = {a:2} m/s²'],
        },
      ],
      fonte: { apostila: 'Aula 3 - Dinâmica', pagina: 7 },
    },
  ],
}

const PROPORCAO: Record<Mistura, string> = {
  misto: 'Misture os tipos: cerca de 25% "conceito", 25% "vf", 20% "associacao", 10% "lacunas" e, se o material tiver fórmulas e contas, 15% "calculo". Sem contas no material, não crie "calculo".',
  teoria: 'Use só os tipos "conceito", "vf", "associacao" e "lacunas", em proporções parecidas. Não crie "calculo".',
  calculo: 'Crie só cartões do tipo "calculo", cobrindo as fórmulas e os tipos de problema do material.',
}

/** Regras de cada tipo de cartão. Usadas pela instrução de cartões e pela de planejamento (plano.ts). `fonte` é o trecho JSON da fonte. */
export function regrasTipos(fonte: string): string {
  return `Cada cartão tem "id" (curto e único, ex.: "c1"), "tipo", "tema" (o id de um tema), "explicacao" (curta, opcional) e ${fonte}. Por tipo:
- "conceito": "frente" (pergunta) e "verso" (resposta).
- "vf": "frente" (afirmação) e "resposta" (true ou false). Toda afirmação falsa precisa de "explicacao" dizendo o que está errado.
- Nunca ponha alternativas (A, B, C…) dentro de "frente" ou "verso": pergunta com alternativas é sempre "associacao", com cada alternativa em "opcoes". Questão que já vem com alternativas (de prova, de lista) é a exceção à regra abaixo: use só as alternativas dela, sem criar erradas novas, e sem "outrasFormas".
- "associacao": "frente" (pergunta), "opcoes" (1 certa e 5 ou 6 erradas plausíveis, sem repetir), "correta" (índice da certa, começando em 0) e "outrasFormas" (lista com 1 outra forma de dizer a resposta certa, com palavras diferentes e o mesmo sentido). O app mostra 4 de cada vez e alterna as formas da certa, então nenhuma errada pode ser obviamente absurda e a outra forma não pode ser maior nem mais detalhada que as erradas. Varie a posição da correta. Confira cada errada: nenhuma pode também responder à pergunta, nem num caso particular.
- "lacunas": "frente" com ____ no lugar de cada palavra a completar (ex.: "A Terra gira em torno do ____.") e "respostas", uma por lacuna, na ordem. Use "/" para sinônimos aceitos ("Sol/astro-rei"). A frase precisa fazer sentido completa. Cada lacuna precisa ter uma resposta certa clara (mais os sinônimos); se várias palavras diferentes completassem bem, reescreva a frase.
- "calculo": exercício com números sorteados. A conta precisa combinar com o nível: nos níveis "expert" e "extremo", só crie cálculo com uma sutileza (caso-limite, hipótese que falha, armadilha comum), nunca a aplicação direta de uma fórmula. Campos:
  - "titulo" e "enunciado"; no enunciado, {nome} mostra o valor sorteado.
  - "parametros": { "nome": { "min": n, "max": n, "passo": n, "unidade": "..." } }. Escolha faixas realistas.
  - "derivados" (opcional): { "nome": "expressão" }, valores intermediários.
  - "condicao" (opcional): expressão que precisa dar verdadeira; senão o app sorteia de novo.
  - "etapas": lista de passos. Cada um com "pergunta", "expr" (a conta da resposta), "unidade", "casas" (casas decimais) e "resolucao" (lista de linhas explicando o passo). "nome" guarda o resultado para as etapas seguintes. Etapa de escolha: "opcoes" (lista) e uma "expr" que devolve o índice da opção certa.
  - Expressões: números com ponto (1.5, 1e-5), + - * / ^, parênteses, comparações (< > <= >= == !=) e as funções sqrt, abs, sin, cos, tan (radianos), sind, cosd, tand (graus), asin, log10, ln, exp, min, max, round(x, casas), floor, ceil, se(condição, valor_se_sim, valor_se_não), além de pi e e. Sem outras funções, sem texto e sem unidades dentro da expressão.
  - Nos textos, {nome:2} mostra o valor com 2 casas e {resultado} é a resposta da última etapa.`
}

/** O enunciado não pode entregar a resposta. Vai nas instruções de cartões, de formatação e de plano. */
export function regraNaoEntregar(): string {
  return `## Não entregue a resposta
O que a pessoa vê antes de responder ("frente", "titulo", "enunciado", a "pergunta" de cada etapa e as "opcoes") não pode trazer a resposta: nem ela inteira, nem parte dela, nem sinônimo, palavra da mesma família, sigla por extenso, tradução literal ou outra pista que a deixe óbvia. Erros comuns, por tipo:
- "conceito": a pergunta já traz o termo pedido. Errado: "O que é a fotossíntese, processo em que a planta faz fotossíntese com luz?". Certo: "Como se chama o processo em que a planta usa luz para produzir glicose?" Se a resposta é um nome (de lei, teorema, processo, obra), a pergunta descreve a ideia, sem citar nenhuma palavra do nome. Errado: "Qual o nome do teorema de Pitágoras?". Certo: "Como se chama o teorema segundo o qual, no triângulo retângulo, $a^2 = b^2 + c^2$?"
- "associacao": a certa é a única que repete palavras da pergunta, ou é a mais longa e detalhada. Todas as opções precisam parecer igualmente possíveis para quem não sabe.
- "lacunas": a palavra da lacuna (ou da mesma família) aparece em outro ponto da frase ou numa outra lacuna. Errado: "O ____ bombeia o sangue; o coração tem quatro cavidades." com resposta "coração".
- "vf": nada de pista como "(falso)", e não use "sempre", "nunca" ou "apenas" só nas afirmações falsas.
- "calculo": o enunciado e as perguntas das etapas não trazem o valor que a etapa pede.
Teste cada cartão: leia só o que a pessoa vê antes de responder e pergunte "dá para acertar sem saber o conteúdo?". Se der, reescreva a pergunta.`
}

/** Regras de formato do texto (LaTeX, negrito) e de entrega do JSON. Usadas pelas instruções de cartões e de plano. */
export function regrasTextoJson(): string {
  return `- Fórmulas podem ir entre $...$ em LaTeX, sempre com os dois $. **Negrito** com dois asteriscos é permitido. Nada de HTML.
- Antes de responder, revise cada cartão como um professor que corrige prova: a resposta marcada está certa? A pergunta parte de uma premissa possível? O enunciado entrega a resposta? Se achar erro, corrija o cartão ou tire-o. Nunca deixe no texto dúvidas ou correções ("Espere", "vamos corrigir").

## Entrega
${regraEntrega()}
- Antes de responder, confira se o JSON abre num parser.
- Se não couber numa resposta só, divida em blocos de até 25 cartões, cada bloco um JSON completo no mesmo formato (com "temas" e "cartoes"). Avise no fim que há mais blocos.`
}

/** Como entregar o JSON: bloco único na conversa, escapes certos. Também vai no pedido de correção e no Corrigir cartão. */
export function regraEntrega(): string {
  return `- Um único bloco de código JSON, escrito na conversa. Nada de Canvas, arquivo para download, tabela ou texto formatado fora do bloco.
- JSON válido: aspas duplas, sem vírgula sobrando, sem comentários.
- Dentro dos textos: barra invertida sempre dobrada (\\\\Delta, \\\\frac), aspas internas como \\", quebra de linha como \\n e nenhuma entidade HTML (&#x20;, &nbsp;).`
}

/** Material: arquivo anexado na IA (PDF ou imagens), texto colado ou assunto. */
export function origemTexto(p: Pick<PedidoIA, 'origem' | 'texto' | 'assunto'>): string {
  if (p.origem === 'arquivo') {
    // Nome e páginas não são pedidos no app: a IA lê o nome do arquivo e pergunta o recorte.
    return `Use como material os arquivos que eu anexar nesta conversa: PDF ou imagens (fotos, prints). Leia também o que estiver em figuras, tabelas, fórmulas e texto escrito à mão.

## Antes de criar os cartões
1. Se ainda não houver arquivo anexado nesta conversa, peça numa frase curta que eu anexe o PDF ou as imagens (pelo botão + ou pelo clipe 📎) e espere. Não crie cartões sem o material.
2. Com o material em mãos, responda numa mensagem curta, sem JSON: o que você leu (quantas páginas ou imagens e o assunto, em poucas palavras) e se alguma parte ficou ilegível. Na mesma mensagem, pergunte "Quer usar o material todo ou só algumas páginas?" e "Quantos cartões você quer? Sugiro N." (N entre 10 e 40, conforme o tamanho do material). Espere a resposta.
3. Se eu já tiver respondido a alguma dessas perguntas, não pergunte de novo.`
  }
  if (p.origem === 'texto') return `Use como material o texto abaixo, entre as linhas ===.\n===\n${(p.texto ?? '').trim()}\n===`
  return `Não há material anexado. Crie os cartões sobre: "${(p.assunto ?? '').trim()}". Use conhecimento consolidado e correto; prefira o que é ensinado em cursos regulares.`
}

/** Quantidade quando o material é arquivo: a IA pergunta e respeita o limite por resposta. */
export function quantidadeArquivo(): string {
  return 'Crie a quantidade de cartões que eu pedir, no máximo 40 por resposta. Se eu pedir mais de 40, entregue 40 e avise que posso pedir o resto nesta mesma conversa.'
}

/** Campo "fonte" do exemplo de cartão, conforme o material. */
export function fonteDe(origem: Origem | undefined): string {
  if (origem === 'arquivo') return '"fonte": { "apostila": "nome do arquivo, sem a extensão", "pagina": número da página ou da imagem }'
  if (origem === 'texto') return '"fonte": { "apostila": "Texto colado" }'
  return '"fonte": { "apostila": "Gerado por IA" }'
}

/** Regra da página de origem do cartão, só quando o material é arquivo. */
export function regraPagina(origem: Origem | undefined): string {
  return origem === 'arquivo' ? '- Em "fonte.pagina", ponha a página do PDF (ou o número da imagem, na ordem em que vieram) de onde saiu o cartão.\n' : ''
}

function temasTexto(p: PedidoIA): string {
  const temas = p.baralho?.temas ?? []
  if (!temas.length) return 'Crie de 2 a 8 temas que organizem o material (id em minúsculas, sem acento, com hífens).'
  const linhas = temas.map(
    (t) => `- "${t.id}": ${t.nome}${t.descricao ? ` — ${t.descricao}` : ''}${t.id === p.temaPrioritario ? ' (prioridade: crie mais cartões deste tema)' : ''}`,
  )
  return `O baralho "${p.baralho!.titulo}" já tem estes temas; reaproveite-os quando couber (use o mesmo "id") e crie novos só se precisar:\n${linhas.join('\n')}`
}

/** Seção do objetivo do baralho; vazia quando o baralho não tem objetivo. */
function objetivoTexto(obj?: Objetivo): string {
  if (!obj) return ''
  const linhas: string[] = []
  const resumo = obj.resumo || obj.pedido
  if (resumo) linhas.push(`Objetivo: ${resumo}`)
  const nivel = infoNivel(obj.nivel)
  if (nivel) linhas.push(`Nível de conhecimento: ${nivel.nome.toLowerCase()}. ${nivel.instrucao}`)
  if (obj.foco?.length) linhas.push(`Foque em: ${obj.foco.join('; ')}.`)
  if (obj.evitar?.length) linhas.push(`Não crie nada sobre: ${obj.evitar.join('; ')}. Isso vale também para spoilers.`)
  return linhas.length ? `## Objetivo do baralho\n${linhas.join('\n')}\n\n` : ''
}

/** Instrução completa para colar na IA. */
export function montarInstrucao(p: PedidoIA): string {
  const fonte = fonteDe(p.origem)
  const arquivo = p.origem === 'arquivo'
  const objetivo = objetivoTexto(p.baralho?.objetivo)
  const cobertos = jaCobertos({ temas: p.baralho?.temas ?? [], cartoes: p.baralho?.cartoes ?? [] })
  const coberturaSecao = cobertos
    ? `## Já cobertos\nJá cobertos (não repita o mesmo assunto com a mesma pergunta; pode aprofundar):\n${cobertos}\n\n`
    : ''
  const prioridade = objetivo ? 'Priorize o que mais serve ao objetivo.' : 'Priorize o que é mais importante do assunto.'
  return `Você vai criar flashcards de estudo para o app Filidilo. ${arquivo ? 'Primeiro siga "Antes de criar os cartões"; depois, responda SOMENTE com um bloco de código JSON, sem texto antes ou depois (veja "Entrega").' : 'Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois (veja "Entrega").'}

## Material
${origemTexto(p)}

## Quantidade e tipos
${arquivo ? quantidadeArquivo() : `Crie ${p.quantidade} cartões.`} ${PROPORCAO[p.mistura]}

${objetivo}## Temas
${temasTexto(p)}

${coberturaSecao}## Formato da resposta
Um objeto JSON com "temas" e "cartoes":
{ "temas": [ { "id": "...", "nome": "..." } ], "cartoes": [ ... ] }

${regrasTipos(fonte)}

${regraNaoEntregar()}

## Regras
- Português do Brasil. Uma ideia por cartão. Pergunta que se entende sozinha, sem "segundo o texto".
- Fiel ao material: não invente dados, valores ou fórmulas que não estejam nele${p.origem === 'tema' ? ' (aqui, fiel ao conhecimento estabelecido)' : ''}.
${regraPagina(p.origem)}- ${prioridade}
${regrasTextoJson()}

## Exemplo (formato; não copie o conteúdo)
\`\`\`json
${JSON.stringify(EXEMPLOS, null, 1)}
\`\`\`
`
}

/**
 * Mais cartões do mesmo material: pedido curto para colar na conversa em que o arquivo já foi anexado.
 * A IA já tem as regras e o material; aqui vão só os cartões que o baralho já tem, para não repetir.
 */
export function montarMaisDoMaterial(p: { baralho: Pick<Baralho, 'temas' | 'cartoes'>; mistura: Mistura }): string {
  const cobertos = jaCobertos({ temas: p.baralho.temas, cartoes: p.baralho.cartoes })
  const temas = p.baralho.temas.map((t) => `"${t.id}" (${t.nome})`).join(', ')
  return `Quero mais flashcards do mesmo material desta conversa (não vou anexar de novo).
- Use primeiro as páginas ou imagens que ainda não viraram cartão; depois, aprofunde o que já foi visto.
- Pergunte quantos cartões eu quero (sugira um número) e espere. ${quantidadeArquivo()}
- ${PROPORCAO[p.mistura]}
- Siga as mesmas regras e o mesmo formato de cartão da primeira instrução, com "fonte.pagina".
${temas ? `- Reaproveite os temas que o baralho já tem, com o mesmo "id": ${temas}.\n` : ''}${cobertos ? `\nJá tenho estes (não repita a mesma pergunta):\n${cobertos}\n` : ''}
## Entrega
Depois da quantidade, responda SOMENTE com um objeto JSON {"temas": [...], "cartoes": [...]}, sem texto antes ou depois.
${regraEntrega()}
`
}

/** Pedido de formatação: a pessoa já tem perguntas e respostas (em qualquer formato) e a IA só as converte. */
export function montarInstrucaoFormatacao(p: {
  texto: string
  baralho?: Pick<Baralho, 'titulo' | 'temas'> & Partial<Pick<Baralho, 'objetivo' | 'cartoes'>>
  /** Baralho novo: a IA também sugere título e objetivo (bloco "baralho"). */
  novo?: { titulo?: string }
}): string {
  const fonte = '"fonte": { "apostila": "Perguntas próprias" }'
  const cobertos = p.novo ? '' : jaCobertos({ temas: p.baralho?.temas ?? [], cartoes: p.baralho?.cartoes ?? [] })
  const coberturaSecao = cobertos ? `## Já cobertos\nNão repita estes assuntos com a mesma pergunta:\n${cobertos}\n\n` : ''
  const nomeDado = p.novo?.titulo?.trim()
  const baralhoFormato = p.novo ? '"baralho": { "titulo": "...", "objetivo": "..." }, ' : ''
  const baralhoRegra = p.novo
    ? `Estas perguntas vão formar um baralho novo. Em "baralho", ${nomeDado ? `use o título "${nomeDado.slice(0, 40)}"` : 'dê um título curto (até 40 caracteres) que diga o assunto das perguntas'} e, em "objetivo", uma frase (até 160 caracteres) sobre o que o baralho ajuda a estudar.\n`
    : ''
  return `Você vai converter perguntas e respostas que eu já tenho em flashcards para o app Filidilo. Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois (veja "Entrega").

## Material
As perguntas e respostas estão abaixo, entre as linhas ===. Podem estar em qualquer formato (lista, "P:/R:", tabela, texto corrido).
===
${p.texto.trim()}
===

## Como converter
- Converta cada item em um cartão, mantendo o sentido e as palavras da pessoa. Não invente, não complete e não corrija conteúdo (a única coisa que você completa é o gabarito que falta numa questão de múltipla escolha). Se a resposta original estiver incompleta ou incorreta, mantenha como está.
- Única exceção ao "não corrija": se a pergunta original entregar a resposta (veja "Não entregue a resposta"), reescreva só a pergunta, ou troque o tipo (por exemplo, de "lacunas" para "conceito"), para que ela não entregue. A resposta continua a da pessoa, com as palavras dela. As alternativas erradas que você criar seguem a mesma regra.
- Um cartão por ideia. Escolha o tipo que melhor encaixa: "conceito" para pergunta aberta com resposta, "vf" para afirmação verdadeira ou falsa, "associacao" para pergunta com alternativas ou com resposta curta, "lacunas" para frase de completar (com ____ ou espaço em branco no original), "calculo" só se houver exercício com números.
- Questão de múltipla escolha (alternativas marcadas com A) B) C), a., (a), 1) 2) ou parecido) vira SEMPRE "associacao", nunca "conceito":
  - "frente": só a pergunta, sem as alternativas e sem número ou cabeçalho da questão ("Questão 31 | BWM", "31."). A sigla ou assunto do cabeçalho pode virar o tema.
  - "opcoes": o texto de cada alternativa, sem a letra, na ordem original. Use só as alternativas originais: não crie erradas novas.
  - "correta": o índice (começando em 0) da alternativa certa segundo o gabarito, que pode estar junto da questão ou numa lista no fim ("31-B", "Gabarito: B").
  - Sem gabarito, resolva a questão com conhecimento consolidado, marque a certa e diga em "explicacao" por que ela é a certa. Nunca mande uma questão de múltipla escolha para "naoConvertidos" por falta de gabarito.
  - Não use "outrasFormas" aqui: as alternativas já vêm da questão, e uma outra forma da certa (mais longa ou com palavras da pergunta) entregaria a resposta.
- Se um item não couber em nenhum tipo ou não tiver resposta (fora a questão de múltipla escolha sem gabarito, que você resolve), não crie cartão para ele: liste o texto dele em "naoConvertidos".
- Se o item tiver fonte (página, aula), mantenha; senão use "Perguntas próprias".

${coberturaSecao}## Formato da resposta
{ ${baralhoFormato}"temas": [ { "id": "...", "nome": "..." } ], "cartoes": [ ... ], "naoConvertidos": [ "texto do item que ficou de fora" ] }
${baralhoRegra}Crie de 2 a 8 temas que organizem os itens (id em minúsculas, sem acento, com hífens).

${regrasTipos(fonte)}

${regraNaoEntregar()}

## Regras
- Português do Brasil. Pergunta que se entende sozinha, sem "segundo o texto".
${regrasTextoJson()}

## Exemplo (formato; não copie o conteúdo)
\`\`\`json
${JSON.stringify(EXEMPLOS, null, 1)}
\`\`\`
`
}

/** Mensagem para colar no Gemini quando alguns cartões vieram com problema. */
export function montarCorrecao(problemas: { id: string; erros: string[] }[], erroGeral?: string): string {
  const linhas = ['Alguns cartões da sua resposta não passaram na validação do app Filidilo.']
  if (erroGeral) linhas.push(`Problema geral: ${erroGeral}`)
  for (const p of problemas) linhas.push(`- Cartão "${p.id}": ${p.erros.join('; ')}`)
  linhas.push('', 'Corrija e devolva SOMENTE um bloco JSON no mesmo formato ({"temas": [...], "cartoes": [...]}), apenas com os cartões corrigidos.', regraEntrega())
  return linhas.join('\n')
}
