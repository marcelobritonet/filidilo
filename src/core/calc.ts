import { avaliar, type Vars } from './expr'
import type { CartaoCalculo, Parametro } from './types'

export interface Sorteio {
  vars: Vars
  rotulos: Record<string, string>
  casasParam: Record<string, number>
  respostas: number[] // uma por etapa
}

const casasDe = (passo: number) => {
  const s = String(passo)
  return s.includes('.') ? s.split('.')[1].length : 0
}

function sortearParametro(p: Parametro, rng: () => number): { valor: number; rotulo?: string; casas: number } {
  if ('opcoes' in p) {
    const o = p.opcoes[Math.floor(rng() * p.opcoes.length)]
    return { valor: o.valor, rotulo: o.rotulo, casas: casasDe(o.valor) }
  }
  const n = Math.floor((p.max - p.min) / p.passo + 1e-9)
  const k = Math.floor(rng() * (n + 1))
  const casas = casasDe(p.passo)
  return { valor: Number((p.min + k * p.passo).toFixed(casas)), casas }
}

/** Calcula derivados e respostas das etapas a partir dos parâmetros (preenche `vars`). */
export function resolver(card: CartaoCalculo, vars: Vars): number[] {
  for (const [nome, e] of Object.entries(card.derivados ?? {})) vars[nome] = avaliar(e, vars)
  const respostas: number[] = []
  for (const et of card.etapas) {
    const r = avaliar(et.expr, vars)
    respostas.push(r)
    if (et.nome) vars[et.nome] = r
  }
  vars.resultado = respostas[respostas.length - 1]
  return respostas
}

export function sortear(card: CartaoCalculo, rng: () => number = Math.random): Sorteio {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const vars: Vars = {}
    const rotulos: Record<string, string> = {}
    const casasParam: Record<string, number> = {}
    for (const [nome, p] of Object.entries(card.parametros)) {
      const s = sortearParametro(p, rng)
      vars[nome] = s.valor
      casasParam[nome] = s.casas
      if (s.rotulo) rotulos[nome] = s.rotulo
    }
    const respostas = resolver(card, vars)
    if (!card.condicao || avaliar(card.condicao, vars)) return { vars, rotulos, casasParam, respostas }
  }
  throw new Error(`Não foi possível sortear valores válidos para ${card.id}`)
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

/** Número no formato brasileiro; notação científica para valores muito grandes ou pequenos. */
export function formatar(x: number, casas?: number): string {
  if (!Number.isFinite(x)) return String(x)
  const ax = Math.abs(x)
  if (ax !== 0 && (ax >= 1e5 || ax < 1e-3)) {
    const exp = Math.floor(Math.log10(ax))
    let m = x / 10 ** exp
    let c = casas ?? 2
    if (c > 3) c = 3
    if (Math.abs(Number(m.toFixed(c))) >= 10) {
      m /= 10
      return `${formatar(m, c)}·10${String(exp + 1).replace(/./g, (d) => SUP[d])}`
    }
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: c })}·10${String(exp).replace(/./g, (d) => SUP[d])}`
  }
  const c = casas ?? (ax >= 100 ? 1 : ax >= 1 ? 2 : 3)
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: c })
}

/** Substitui {nome} e {nome:casas} pelos valores sorteados. */
export function preencher(texto: string, s: Sorteio): string {
  return texto.replace(/\{([A-Za-z_][A-Za-z0-9_]*)(?::(\d))?\}/g, (m, nome: string, casas?: string) => {
    if (nome in s.rotulos && casas === undefined) return s.rotulos[nome]
    if (!(nome in s.vars)) return m
    const c = casas !== undefined ? Number(casas) : s.casasParam[nome]
    return formatar(s.vars[nome], c)
  })
}

/** Interpreta o que a pessoa digitou: aceita vírgula, ponto, espaços e "e" ou "x10^". */
export function lerNumero(txt: string): number | null {
  let t = txt.trim().replace(/\s/g, '').replace(/[·x×]10\^?/i, 'e').replace('−', '-')
  if (!t) return null
  // "1.234,5" → 1234.5 ; "1,5" → 1.5
  if (t.includes(',')) t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function confere(resposta: number, certo: number, casas = 2, tolerancia = 0.02): boolean {
  const lim = Math.max(Math.abs(certo) * tolerancia, 10 ** -casas)
  return Math.abs(resposta - certo) <= lim + 1e-12
}
