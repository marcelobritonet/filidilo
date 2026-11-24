// Cálculos do painel Seu progresso. Tudo puro: recebe os dados já lidos e o período; a tela só desenha.
import type { Estado, Revisao, SessaoGravada } from './db'
import { ativos } from './cartoes'
import { chave, dominado } from './srs'
import { diaLocal, somarDias, type Ofensiva } from './ofensiva'
import type { DominioDia } from './sessoes'
import type { Baralho } from './types'

export type Periodo = '7' | '30' | 'tudo'

export interface Entrada {
  baralhos: Baralho[]
  revisoes: Pick<Revisao, 'cartao' | 'nota' | 'data'>[]
  sessoes: SessaoGravada[]
  estados: Estado[]
  ofensiva: Ofensiva
  dominio: DominioDia[]
  periodo: Periodo
  /** Um baralho só, ou todos. */
  baralho?: string
  agora: number
}

export interface Barra {
  rotulo: string
  /** Rótulo completo, para leitor de tela ("seg., 23/11"). */
  titulo: string
  respostas: number
  minutos: number
  atual: boolean
}

export interface TemaLinha {
  baralho: string
  tema: string
  nome: string
  respostas: number
  acertos: number
  taxa: number
}

export interface Painel {
  vazio: boolean
  ritmo: { dias: number; respostas: number; minutos: number | null; barras: Barra[] }
  acertos: { taxa: number; chutes: number; erros: number; respostas: number; diferenca: number | null }
  temas: TemaLinha[]
  fracos: TemaLinha[]
  dominio: { id: string; titulo: string; dominados: number; total: number; ganho: number | null }[]
  metas: { batidas: number; total: number } | null
  /** Dia da primeira sessão gravada (desde quando há tempo e metas). */
  medindoDesde: string | null
  ofensiva: { maior: number; diasCobertos: number }
}

/** Abaixo disso, o tema não entra em "onde você mais erra" (que também pede acerto abaixo de 80% e da média da pessoa). */
export const MINIMO_FRACO = 10

const DIAS_SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const dataDe = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d, 12)
}
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`

/** Primeiro dia do período (inclusive); `tudo` começa no primeiro dado. */
export function inicioPeriodo(periodo: Periodo, hoje: string, primeiro?: string): string {
  if (periodo === '7') return somarDias(hoje, -6)
  if (periodo === '30') return somarDias(hoje, -29)
  return primeiro && primeiro < hoje ? primeiro : hoje
}

/** Maior sequência de dias cobertos (sessão ou folga). */
export function maiorSequencia(o: Ofensiva): number {
  const dias = [...new Set([...o.concluidos, ...o.salvos])].sort()
  let maior = 0
  let atual = 0
  let anterior = ''
  for (const d of dias) {
    atual = anterior && somarDias(anterior, 1) === d ? atual + 1 : 1
    maior = Math.max(maior, atual)
    anterior = d
  }
  return maior
}

/** Barras do ritmo: por dia (7 dias), por semana (30 dias) ou por mês (tudo). */
function barras(periodo: Periodo, inicio: string, hoje: string, porDia: Map<string, { respostas: number; ms: number }>): Barra[] {
  const soma = (de: string, ate: string) => {
    let respostas = 0
    let ms = 0
    for (let d = de; d <= ate; d = somarDias(d, 1)) {
      const x = porDia.get(d)
      if (x) {
        respostas += x.respostas
        ms += x.ms
      }
    }
    return { respostas, minutos: Math.round(ms / 60000) }
  }
  if (periodo === '7')
    return Array.from({ length: 7 }, (_, i) => {
      const d = somarDias(inicio, i)
      const w = dataDe(d).getDay()
      return { rotulo: LETRA[w], titulo: `${DIAS_SEMANA[w]} ${ddmm(d)}`, ...soma(d, d), atual: d === hoje }
    })
  if (periodo === '30') {
    // Semanas terminando hoje: 4 de 7 dias e a mais antiga com o que sobra (2 dias).
    const l: Barra[] = []
    for (let fim = hoje; fim >= inicio; fim = somarDias(fim, -7)) {
      const de = somarDias(fim, -6) < inicio ? inicio : somarDias(fim, -6)
      l.unshift({ rotulo: ddmm(de), titulo: `de ${ddmm(de)} a ${ddmm(fim)}`, ...soma(de, fim), atual: fim === hoje })
    }
    return l
  }
  // Tudo: um por mês, no máximo os últimos 12.
  const l: Barra[] = []
  let [a, m] = hoje.split('-').map(Number)
  const [ai, mi] = inicio.split('-').map(Number)
  while ((a > ai || (a === ai && m >= mi)) && l.length < 12) {
    const de = `${a}-${String(m).padStart(2, '0')}-01`
    const ultimo = new Date(a, m, 0).getDate()
    const ate = `${a}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
    l.unshift({ rotulo: MESES[m - 1], titulo: `${MESES[m - 1]} de ${a}`, ...soma(de, ate), atual: de <= hoje && hoje <= ate })
    m--
    if (m === 0) {
      m = 12
      a--
    }
  }
  return l
}

export function calcularPainel(e: Entrada): Painel {
  const hoje = diaLocal(e.agora)
  const doBaralho = (id: string) => !e.baralho || id === e.baralho
  const baralhoDe = (cartao: string) => cartao.slice(0, cartao.indexOf('/'))
  const revs = e.revisoes.filter((r) => doBaralho(baralhoDe(r.cartao)))
  const sess = e.sessoes.filter((s) => doBaralho(s.baralho))
  const primeiro = [...revs.map((r) => diaLocal(r.data)), ...sess.map((s) => diaLocal(s.inicio))].sort()[0]
  const inicio = inicioPeriodo(e.periodo, hoje, primeiro)
  const noPeriodo = (dia: string) => dia >= inicio && dia <= hoje
  const r = revs.filter((x) => noPeriodo(diaLocal(x.data)))
  const s = sess.filter((x) => noPeriodo(diaLocal(x.inicio)))

  // Ritmo
  const porDia = new Map<string, { respostas: number; ms: number }>()
  const pega = (d: string) => porDia.get(d) ?? porDia.set(d, { respostas: 0, ms: 0 }).get(d)!
  for (const x of r) pega(diaLocal(x.data)).respostas++
  for (const x of s) pega(diaLocal(x.inicio)).ms += x.ativoMs
  const medindoDesde = e.sessoes.length ? diaLocal(Math.min(...e.sessoes.map((x) => x.inicio))) : null
  const ritmo = {
    dias: new Set(r.map((x) => diaLocal(x.data))).size,
    respostas: r.length,
    minutos: medindoDesde ? Math.round(s.reduce((t, x) => t + x.ativoMs, 0) / 60000) : null,
    barras: barras(e.periodo, inicio, hoje, porDia),
  }

  // Acertos, e a diferença para o período anterior do mesmo tamanho (não existe em "tudo").
  const taxaDe = (l: typeof r) => (l.length ? l.filter((x) => x.nota >= 3).length / l.length : 0)
  let diferenca: number | null = null
  if (e.periodo !== 'tudo') {
    const n = Number(e.periodo)
    const de = somarDias(inicio, -n)
    const ate = somarDias(inicio, -1)
    const antes = revs.filter((x) => {
      const d = diaLocal(x.data)
      return d >= de && d <= ate
    })
    if (antes.length >= MINIMO_FRACO && r.length) diferenca = Math.round(100 * taxaDe(r)) - Math.round(100 * taxaDe(antes))
  }
  const acertos = {
    taxa: taxaDe(r),
    chutes: r.filter((x) => x.nota === 2).length,
    erros: r.filter((x) => x.nota === 1).length,
    respostas: r.length,
    diferenca,
  }

  // Temas (do cartão que está no baralho hoje; cartão apagado não entra)
  const temaDoCartao = new Map<string, { baralho: string; tema: string }>()
  const nomes = new Map<string, string>()
  for (const b of e.baralhos) {
    for (const c of b.cartoes) temaDoCartao.set(chave(b.id, c.id), { baralho: b.id, tema: c.tema })
    for (const t of b.temas) nomes.set(`${b.id}|${t.id}`, t.nome)
  }
  const porTema = new Map<string, TemaLinha>()
  for (const x of r) {
    const t = temaDoCartao.get(x.cartao)
    if (!t) continue
    const k = `${t.baralho}|${t.tema}`
    const linha = porTema.get(k) ?? porTema.set(k, { baralho: t.baralho, tema: t.tema, nome: nomes.get(k) ?? t.tema, respostas: 0, acertos: 0, taxa: 0 }).get(k)!
    linha.respostas++
    if (x.nota >= 3) linha.acertos++
  }
  const linhas = [...porTema.values()].map((l) => ({ ...l, taxa: l.acertos / l.respostas }))
  const temas = [...linhas].sort((a, b) => b.respostas - a.respostas || a.nome.localeCompare(b.nome))
  const fracos = linhas
    .filter((l) => l.respostas >= MINIMO_FRACO && l.taxa < 0.8 && l.taxa < acertos.taxa)
    .sort((a, b) => a.taxa - b.taxa || b.respostas - a.respostas)
    .slice(0, 3)

  // Domínio de agora e quanto mudou desde o começo do período (pelo registro diário).
  const est = new Map(e.estados.map((x) => [x.id, x]))
  const dominio = e.baralhos
    .filter((b) => !b.arquivadoEm && doBaralho(b.id))
    .map((b) => {
      const lista = ativos(b)
      const dominados = lista.filter((c) => dominado(est.get(chave(b.id, c.id)))).length
      const antes = e.dominio.filter((d) => d.baralho === b.id && d.dia < inicio).pop()
      return { id: b.id, titulo: b.titulo, dominados, total: lista.length, ganho: antes ? dominados - antes.dominados : null }
    })
    .filter((b) => b.total > 0 && (b.dominados > 0 || revs.some((x) => baralhoDe(x.cartao) === b.id)))
    .sort((a, b) => b.dominados / b.total - a.dominados / a.total)

  // Metas de sessão: só as concluídas com meta (o Livre não tem).
  const comMeta = s.filter((x) => x.concluida && x.por !== 'livre')
  const metas = medindoDesde ? { batidas: comMeta.filter((x) => x.bateuMeta).length, total: comMeta.length } : null

  return {
    vazio: revs.length === 0,
    ritmo,
    acertos,
    temas,
    fracos,
    dominio,
    metas,
    medindoDesde,
    ofensiva: {
      maior: maiorSequencia(e.ofensiva),
      diasCobertos: [...new Set([...e.ofensiva.concluidos, ...e.ofensiva.salvos])].filter(noPeriodo).length,
    },
  }
}

/** "1 h 20 min", "45 min". */
export function textoMinutos(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`
}

export const ddmmDe = ddmm
