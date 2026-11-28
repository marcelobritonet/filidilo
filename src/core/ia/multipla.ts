// Questões de múltipla escolha que a IA deixou com as alternativas dentro do texto (P90).
// Ex.: "Questão 31 | BWM\nQual documento…?\nA) Livro…\nB) Plano…\nC) …" num cartão "conceito".
import type { Cartao, CartaoAssociacao } from '../types'

export const ERRO_ALTERNATIVAS = 'as alternativas estão dentro da pergunta: use o tipo "associacao", com a pergunta em "frente", cada alternativa em "opcoes" e "correta"'

export interface Alternativas {
  /** A pergunta sem as alternativas e sem o cabeçalho ("Questão 31 | BWM"). */
  pergunta: string
  opcoes: string[]
}

// Marcador de alternativa no começo da linha ou depois de espaço: "A)", "(a)", "B.", "c -".
const MARCADOR = /(^|\s)\(?([A-Ha-h])\s*[).\-–]\s+/g
// Cabeçalho de questão de prova no começo: "Questão 31 | BWM", "Q. 12 -", "31." ou "31)".
const CABECALHO = /^\s*(?:(?:quest[aã]o|q\.?)\s*\d+[^\n]*\n|\d+\s*[).\-–]\s+)/i

/** Acha 3 ou mais alternativas em sequência (A, B, C…) no texto. Sem elas, undefined. */
export function separarAlternativas(texto: string): Alternativas | undefined {
  const marcas = [...texto.matchAll(MARCADOR)].map((m) => ({
    letra: m[2],
    ini: m.index! + m[1].length,
    fim: m.index! + m[0].length,
  }))
  for (let i = 0; i < marcas.length; i++) {
    if (marcas[i].letra.toUpperCase() !== 'A') continue
    const seq = [marcas[i]]
    for (let j = i + 1; j < marcas.length; j++) {
      const esperada = String.fromCharCode(seq[seq.length - 1].letra.charCodeAt(0) + 1)
      if (marcas[j].letra === esperada) seq.push(marcas[j])
    }
    if (seq.length < 3) continue
    const opcoes = seq.map((m, k) => limpar(texto.slice(m.fim, k + 1 < seq.length ? seq[k + 1].ini : undefined)))
    const pergunta = texto.slice(0, seq[0].ini).replace(CABECALHO, '').trim()
    if (!pergunta || opcoes.some((o) => !o)) return undefined
    return { pergunta, opcoes }
  }
  return undefined
}

const limpar = (s: string) => s.trim().replace(/[;.]$/, '').trim()
const normal = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Qual alternativa o verso indica ("B", "B) Plano…", "Letra B", ou o texto dela)? E o que sobra como explicação. */
function alternativaDoVerso(verso: string, opcoes: string[]): { correta: number; resto: string } | undefined {
  const v = verso.trim()
  const letra = /^(?:(?:letra|alternativa|resposta|correta|gabarito)\s*:?\s*)?\(?([A-Ha-h])\s*(?:[).\-–:]|$)\s*/i.exec(v)
  if (letra) {
    const correta = letra[1].toUpperCase().charCodeAt(0) - 65
    if (correta < opcoes.length) {
      let resto = v.slice(letra[0].length).trim()
      if (normal(resto).startsWith(normal(opcoes[correta]))) resto = resto.slice(opcoes[correta].length)
      return { correta, resto: resto.replace(/^[\s.;:,–-]+/, '').trim() }
    }
  }
  const nv = normal(v)
  const correta = opcoes.findIndex((o) => normal(o) && nv.startsWith(normal(o)))
  if (correta >= 0) return { correta, resto: v.slice(opcoes[correta].length).replace(/^[\s.;:,–-]+/, '').trim() }
  return undefined
}

/**
 * Tira a outra forma da certa que for mais longa que todas as erradas: entre opções curtas ela entregaria a
 * resposta (o ChatGPT fez isso numa questão de prova no teste da P90; o Gemini, com "Júpiter, o gigante gasoso", na P138).
 */
function semFormaQueEntrega(c: CartaoAssociacao): CartaoAssociacao {
  if (!Array.isArray(c.opcoes) || c.opcoes.length < 2 || !Array.isArray(c.outrasFormas)) return c
  const maior = Math.max(...c.opcoes.filter((_, i) => i !== c.correta).map((o) => String(o).length))
  // Forma que só muda na pontuação ou nas maiúsculas ("Júpiter." para "Júpiter") também entrega: a única com ponto.
  const vistas = new Set([normal(String(c.opcoes[c.correta] ?? ''))])
  const formas = c.outrasFormas.filter((f) => {
    if (typeof f !== 'string' || f.length > maior || vistas.has(normal(f))) return false
    vistas.add(normal(f))
    return true
  })
  if (formas.length === c.outrasFormas.length) return c
  const { outrasFormas: _f, ...resto } = c
  return formas.length ? { ...resto, outrasFormas: formas } : resto
}

/**
 * Conserta o cartão que veio com alternativas no texto.
 * "conceito" com a letra certa no verso vira "associacao"; senão, devolve o erro para o pedido de correção.
 */
export function consertarMultipla(c: Cartao): { cartao: Cartao; erro?: string } {
  if (c.tipo === 'associacao') return { cartao: semFormaQueEntrega(c) }
  if (c.tipo === 'calculo' || typeof c.frente !== 'string') return { cartao: c }
  const alt = separarAlternativas(c.frente)
  if (!alt) return { cartao: c }
  if (c.tipo !== 'conceito') return { cartao: c, erro: ERRO_ALTERNATIVAS }
  const certa = alternativaDoVerso(c.verso ?? '', alt.opcoes)
  if (!certa || new Set(alt.opcoes).size !== alt.opcoes.length) return { cartao: c, erro: ERRO_ALTERNATIVAS }
  const { verso: _v, ...resto } = c
  const explicacao = c.explicacao?.trim() || certa.resto || undefined
  const novo: CartaoAssociacao = { ...resto, tipo: 'associacao', frente: alt.pergunta, opcoes: alt.opcoes, correta: certa.correta }
  if (explicacao) novo.explicacao = explicacao
  else delete novo.explicacao
  return { cartao: novo }
}
