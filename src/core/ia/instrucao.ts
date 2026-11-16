// Harness "Criar com IA": monta a instrução que a estudante cola no Gemini.
// Versão da instrução: mude ao alterar regras, para comparar a qualidade entre versões (E6).
import type { Baralho, Cartao, Tema } from '../types'

export const VERSAO_INSTRUCAO = 2

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
  /** Baralho de destino: os temas dele são reaproveitados. */
  baralho?: Pick<Baralho, 'titulo' | 'temas'>
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
  misto: 'Misture os tipos: cerca de 30% "conceito", 30% "vf", 25% "associacao" e, se o material tiver fórmulas e contas, 15% "calculo". Sem contas no material, não crie "calculo".',
  teoria: 'Use só os tipos "conceito", "vf" e "associacao", em proporções parecidas. Não crie "calculo".',
  calculo: 'Crie só cartões do tipo "calculo", cobrindo as fórmulas e os tipos de problema do material.',
}

function origemTexto(p: PedidoIA): string {
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
  return `O baralho "${p.baralho!.titulo}" já tem estes temas; reaproveite-os quando couber (use o mesmo "id") e crie novos só se precisar:\n${temas.map((t) => `- "${t.id}": ${t.nome}`).join('\n')}`
}

/** Instrução completa para colar no Gemini. */
export function montarInstrucao(p: PedidoIA): string {
  const fonte = p.origem === 'pdf' ? `"fonte": { "apostila": "${p.nomePdf?.trim() || 'nome do material'}", "pagina": número da página }` : p.origem === 'texto' ? '"fonte": { "apostila": "Texto colado" }' : '"fonte": { "apostila": "Gerado pelo Gemini" }'
  return `Você vai criar flashcards de estudo para o app Tatino. Responda SOMENTE com um bloco de código JSON, sem texto antes ou depois.

## Material
${origemTexto(p)}

## Quantidade e tipos
Crie ${p.quantidade} cartões. ${PROPORCAO[p.mistura]}

## Temas
${temasTexto(p)}

## Formato da resposta
Um objeto JSON com "temas" e "cartoes":
{ "temas": [ { "id": "...", "nome": "..." } ], "cartoes": [ ... ] }

Cada cartão tem "id" (curto e único, ex.: "c1"), "tipo", "tema" (o id de um tema), "explicacao" (curta, opcional) e ${fonte}. Por tipo:
- "conceito": "frente" (pergunta) e "verso" (resposta).
- "vf": "frente" (afirmação) e "resposta" (true ou false). Toda afirmação falsa precisa de "explicacao" dizendo o que está errado.
- "associacao": "frente" (pergunta), "opcoes" (1 certa e 5 ou 6 erradas plausíveis, sem repetir), "correta" (índice da certa, começando em 0) e "outrasFormas" (lista com 1 outra forma de dizer a resposta certa, com palavras diferentes e o mesmo sentido). O app mostra 4 de cada vez e alterna as formas da certa, então nenhuma errada pode ser obviamente absurda e a outra forma não pode ser maior nem mais detalhada que as erradas. Varie a posição da correta.
- "calculo": exercício com números sorteados. Campos:
  - "titulo" e "enunciado"; no enunciado, {nome} mostra o valor sorteado.
  - "parametros": { "nome": { "min": n, "max": n, "passo": n, "unidade": "..." } }. Escolha faixas realistas.
  - "derivados" (opcional): { "nome": "expressão" }, valores intermediários.
  - "condicao" (opcional): expressão que precisa dar verdadeira; senão o app sorteia de novo.
  - "etapas": lista de passos. Cada um com "pergunta", "expr" (a conta da resposta), "unidade", "casas" (casas decimais) e "resolucao" (lista de linhas explicando o passo). "nome" guarda o resultado para as etapas seguintes. Etapa de escolha: "opcoes" (lista) e uma "expr" que devolve o índice da opção certa.
  - Expressões: números com ponto (1.5, 1e-5), + - * / ^, parênteses, comparações (< > <= >= == !=) e as funções sqrt, abs, sin, cos, tan (radianos), sind, cosd, tand (graus), asin, log10, ln, exp, min, max, round(x, casas), floor, ceil, se(condição, valor_se_sim, valor_se_não), além de pi e e. Sem outras funções, sem texto e sem unidades dentro da expressão.
  - Nos textos, {nome:2} mostra o valor com 2 casas e {resultado} é a resposta da última etapa.

## Regras
- Português do Brasil. Uma ideia por cartão. Pergunta que se entende sozinha, sem "segundo o texto".
- Fiel ao material: não invente dados, valores ou fórmulas que não estejam nele${p.origem === 'tema' ? ' (aqui, fiel ao conhecimento estabelecido)' : ''}.
${p.origem === 'pdf' ? '- Em "fonte.pagina", ponha a página do PDF de onde saiu o cartão.\n' : ''}- Priorize o que é mais importante e mais cobrado em prova.
- Fórmulas podem ir entre $...$ em LaTeX; dentro do JSON, escreva a barra invertida dobrada (\\\\Delta).
- **Negrito** com dois asteriscos é permitido. Nada de HTML.
- JSON válido: aspas duplas, sem vírgula sobrando, sem comentários.

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
