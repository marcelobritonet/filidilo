// Harness "Criar com IA": monta a instrução que a estudante cola na IA.
// Versão da instrução: mude ao alterar regras, para comparar a qualidade entre versões (E6).
import type { Baralho, Cartao, Objetivo, Tema } from '../types'
import { infoNivel } from '../types'
import { jaCobertos } from './cobertos'

export const VERSAO_INSTRUCAO = 5

export type Origem = 'pdf' | 'texto' | 'tema'
export type Mistura = 'misto' | 'teoria' | 'calculo'

export interface PedidoIA {
  origem: Origem
  /** Nome do PDF (vira a fonte dos cartões). */
  nomePdf?: string
  /** Ex.: "3–10". Vazio = o PDF todo. */
  paginas?: string
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
- "associacao": "frente" (pergunta), "opcoes" (1 certa e 5 ou 6 erradas plausíveis, sem repetir), "correta" (índice da certa, começando em 0) e "outrasFormas" (lista com 1 outra forma de dizer a resposta certa, com palavras diferentes e o mesmo sentido). O app mostra 4 de cada vez e alterna as formas da certa, então nenhuma errada pode ser obviamente absurda e a outra forma não pode ser maior nem mais detalhada que as erradas. Varie a posição da correta.
- "lacunas": "frente" com ____ no lugar de cada palavra a completar (ex.: "A Terra gira em torno do ____.") e "respostas", uma por lacuna, na ordem. Use "/" para sinônimos aceitos ("Sol/astro-rei"). A frase precisa fazer sentido completa.
- "calculo": exercício com números sorteados. Campos:
  - "titulo" e "enunciado"; no enunciado, {nome} mostra o valor sorteado.
  - "parametros": { "nome": { "min": n, "max": n, "passo": n, "unidade": "..." } }. Escolha faixas realistas.
  - "derivados" (opcional): { "nome": "expressão" }, valores intermediários.
  - "condicao" (opcional): expressão que precisa dar verdadeira; senão o app sorteia de novo.
  - "etapas": lista de passos. Cada um com "pergunta", "expr" (a conta da resposta), "unidade", "casas" (casas decimais) e "resolucao" (lista de linhas explicando o passo). "nome" guarda o resultado para as etapas seguintes. Etapa de escolha: "opcoes" (lista) e uma "expr" que devolve o índice da opção certa.
  - Expressões: números com ponto (1.5, 1e-5), + - * / ^, parênteses, comparações (< > <= >= == !=) e as funções sqrt, abs, sin, cos, tan (radianos), sind, cosd, tand (graus), asin, log10, ln, exp, min, max, round(x, casas), floor, ceil, se(condição, valor_se_sim, valor_se_não), além de pi e e. Sem outras funções, sem texto e sem unidades dentro da expressão.
  - Nos textos, {nome:2} mostra o valor com 2 casas e {resultado} é a resposta da última etapa.`
}

/** Regras de formato do texto (LaTeX, negrito, JSON). Usadas pelas duas instruções. */
export function regrasTextoJson(): string {
  return `- Fórmulas podem ir entre $...$ em LaTeX; dentro do JSON, escreva a barra invertida dobrada (\\\\Delta).
- **Negrito** com dois asteriscos é permitido. Nada de HTML.
- JSON válido: aspas duplas, sem vírgula sobrando, sem comentários.`
}

/** Material: PDF e texto usam o mesmo texto de sempre. */
export function origemTexto(p: PedidoIA): string {
  if (p.origem === 'pdf') {
    const pag = p.paginas?.trim() ? `, somente as páginas ${p.paginas.trim()}` : ''
    return `Use como material o PDF que anexei${p.nomePdf ? ` ("${p.nomePdf}")` : ''}${pag}. Leia também o que estiver em imagens, tabelas e fórmulas dos slides.`
  }
  if (p.origem === 'texto') return `Use como material o texto abaixo, entre as linhas ===.\n===\n${(p.texto ?? '').trim()}\n===`
  return `Não há material anexado. Crie os cartões sobre: "${(p.assunto ?? '').trim()}". Use conhecimento consolidado e correto; prefira o que é ensinado em cursos regulares.`
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
  const fonte = p.origem === 'pdf' ? `"fonte": { "apostila": "${p.nomePdf?.trim() || 'nome do material'}", "pagina": número da página }` : p.origem === 'texto' ? '"fonte": { "apostila": "Texto colado" }' : '"fonte": { "apostila": "Gerado por IA" }'
  const objetivo = objetivoTexto(p.baralho?.objetivo)
  const cobertos = jaCobertos({ temas: p.baralho?.temas ?? [], cartoes: p.baralho?.cartoes ?? [] })
  const coberturaSecao = cobertos
    ? `## Já cobertos\nJá cobertos (não repita o mesmo assunto com a mesma pergunta; pode aprofundar):\n${cobertos}\n\n`
    : ''
  const prioridade = objetivo ? 'Priorize o que mais serve ao objetivo.' : 'Priorize o que é mais importante do assunto.'
  return `Você vai criar flashcards de estudo para o app Tatino. Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois.

## Material
${origemTexto(p)}

## Quantidade e tipos
Crie ${p.quantidade} cartões. ${PROPORCAO[p.mistura]}

${objetivo}## Temas
${temasTexto(p)}

${coberturaSecao}## Formato da resposta
Um objeto JSON com "temas" e "cartoes":
{ "temas": [ { "id": "...", "nome": "..." } ], "cartoes": [ ... ] }

${regrasTipos(fonte)}

## Regras
- Português do Brasil. Uma ideia por cartão. Pergunta que se entende sozinha, sem "segundo o texto".
- Fiel ao material: não invente dados, valores ou fórmulas que não estejam nele${p.origem === 'tema' ? ' (aqui, fiel ao conhecimento estabelecido)' : ''}.
${p.origem === 'pdf' ? '- Em "fonte.pagina", ponha a página do PDF de onde saiu o cartão.\n' : ''}- ${prioridade}
${regrasTextoJson()}

## Exemplo (formato; não copie o conteúdo)
\`\`\`json
${JSON.stringify(EXEMPLOS, null, 1)}
\`\`\`
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
  return `Você vai converter perguntas e respostas que eu já tenho em flashcards para o app Tatino. Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois.

## Material
As perguntas e respostas estão abaixo, entre as linhas ===. Podem estar em qualquer formato (lista, "P:/R:", tabela, texto corrido).
===
${p.texto.trim()}
===

## Como converter
- Converta cada item em um cartão, mantendo o sentido e as palavras da pessoa. Não invente, não complete e não corrija conteúdo. Se a resposta original estiver incompleta ou incorreta, mantenha como está.
- Um cartão por ideia. Escolha o tipo que melhor encaixa: "conceito" para pergunta aberta com resposta, "vf" para afirmação verdadeira ou falsa, "associacao" para pergunta com resposta curta (crie 5 ou 6 alternativas erradas plausíveis), "lacunas" para frase de completar (com ____ ou espaço em branco no original), "calculo" só se houver exercício com números.
- Se um item não couber em nenhum tipo ou não tiver resposta, não crie cartão para ele: liste o texto dele em "naoConvertidos".
- Se o item tiver fonte (página, aula), mantenha; senão use "Perguntas próprias".

${coberturaSecao}## Formato da resposta
{ ${baralhoFormato}"temas": [ { "id": "...", "nome": "..." } ], "cartoes": [ ... ], "naoConvertidos": [ "texto do item que ficou de fora" ] }
${baralhoRegra}Crie de 2 a 8 temas que organizem os itens (id em minúsculas, sem acento, com hífens).

${regrasTipos(fonte)}

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
  const linhas = ['Alguns cartões da sua resposta não passaram na validação do app Tatino.']
  if (erroGeral) linhas.push(`Problema geral: ${erroGeral}`)
  for (const p of problemas) linhas.push(`- Cartão "${p.id}": ${p.erros.join('; ')}`)
  linhas.push('', 'Corrija e devolva SOMENTE um bloco JSON no mesmo formato ({"temas": [...], "cartoes": [...]}), apenas com os cartões corrigidos.')
  return linhas.join('\n')
}
