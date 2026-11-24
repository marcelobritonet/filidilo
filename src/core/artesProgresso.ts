// Imagens de compartilhar de cada bloco do painel Seu progresso. Puro: recebe o que a tela já calculou.
import type { Peca } from './artes'
import type { AndamentoMeta as Andamento } from './metaSemana'
import { textoMinutos, type Painel, type Periodo } from './painel'

export type BlocoProgresso = 'meta' | 'ritmo' | 'acertos' | 'temas' | 'fracos' | 'dominio' | 'metas' | 'ofensiva'

export interface Contexto {
  periodo: Periodo
  /** Nome do baralho do filtro (vazio: todos). */
  baralho: string
  comNome: boolean
  urlApp: string
}

const n = (q: number, um: string, varios: string) => `${q.toLocaleString('pt-BR')} ${q === 1 ? um : varios}`
const pct = (x: number) => `${Math.round(100 * x)}%`
const chamada = 'Aprenda qualquer coisa.'
/** "nos últimos 7 dias", "desde o começo". */
export const textoPeriodo = (p: Periodo) => (p === 'tudo' ? 'desde o começo' : `nos últimos ${p} dias`)
const convite = (c: Contexto) => `Aprenda qualquer coisa: ${c.urlApp}`
/** Título da imagem: o baralho do filtro, quando a pessoa deixa mostrar. */
const titulo = (c: Contexto) => (c.baralho && c.comNome ? c.baralho : undefined)
const emBaralho = (c: Contexto) => (c.baralho && c.comNome ? ` em “${c.baralho}”` : '')

export function pecaMetaSemana(a: Andamento, c: Contexto): Peca {
  const dias = a.meta.tipo === 'dias'
  const feito = dias ? Math.min(a.feito, 7) : a.feito
  const destaque = dias ? `${feito} de ${a.meta.n}` : textoMinutos(feito)
  const legenda = dias ? 'dias de estudo nesta semana' : `de ${textoMinutos(a.meta.n)} nesta semana`
  return {
    arte: {
      modelo: 'progresso',
      selo: a.batida ? 'Meta da semana batida!' : 'Meta da semana',
      destaque,
      legenda,
      fracao: Math.min(1, a.feito / a.meta.n),
      confete: a.batida,
      chamada,
    },
    texto: `${a.batida ? 'Bati minha meta da semana' : 'Minha meta da semana'} no Filidilo: ${dias ? `${feito} de ${n(a.meta.n, 'dia', 'dias')} de estudo` : `${textoMinutos(feito)} de ${textoMinutos(a.meta.n)} de estudo`}. ${convite(c)}`,
  }
}

export function pecaRitmo(p: Painel, ver: 'respostas' | 'tempo', c: Contexto): Peca {
  const tempo = ver === 'tempo' && p.ritmo.minutos !== null
  const linhas = [n(p.ritmo.respostas, 'resposta', 'respostas'), p.ritmo.minutos ? `${textoMinutos(p.ritmo.minutos)} de estudo` : ''].filter(Boolean)
  return {
    arte: {
      modelo: 'progresso',
      selo: 'Meu ritmo',
      titulo: titulo(c),
      destaque: String(p.ritmo.dias),
      legenda: `${p.ritmo.dias === 1 ? 'dia estudando' : 'dias estudando'} ${textoPeriodo(c.periodo)}`,
      barras: p.ritmo.barras.map((b) => ({
        rotulo: b.rotulo,
        valor: tempo ? b.minutos : b.respostas,
        atual: b.atual,
      })),
      linhas: [linhas.join(' · ')],
      chamada,
    },
    texto: `Estudei ${n(p.ritmo.dias, 'dia', 'dias')} ${textoPeriodo(c.periodo)}${emBaralho(c)} no Filidilo: ${linhas.join(', ')}. ${convite(c)}`,
  }
}

export function pecaAcertos(p: Painel, c: Contexto): Peca {
  const a = p.acertos
  const dif = a.diferenca ? `${a.diferenca > 0 ? '↑' : '↓'} ${n(Math.abs(a.diferenca), 'ponto', 'pontos')} em relação aos ${c.periodo} dias anteriores` : ''
  const subiu = (a.diferenca ?? 0) > 0
  return {
    arte: {
      modelo: 'progresso',
      selo: subiu ? 'Estou melhorando!' : 'Meus acertos',
      titulo: titulo(c),
      destaque: pct(a.taxa),
      legenda: `de acerto ${textoPeriodo(c.periodo)}`,
      linhas: [`${n(a.respostas, 'resposta', 'respostas')}`, dif].filter(Boolean),
      confete: subiu,
      chamada,
    },
    texto: `Acertei ${pct(a.taxa)} ${textoPeriodo(c.periodo)}${emBaralho(c)} no Filidilo${subiu ? `, ${a.diferenca} pontos a mais que antes` : ''}. ${convite(c)}`,
  }
}

export function pecaTemas(p: Painel, c: Contexto): Peca {
  const top = p.temas.slice(0, 5)
  const max = Math.max(1, ...top.map((t) => t.respostas))
  return {
    arte: {
      modelo: 'progresso',
      selo: 'O que mais estudo',
      titulo: titulo(c),
      itens: top.map((t) => ({
        nome: t.nome,
        valor: `${t.respostas} · ${pct(t.taxa)}`,
        fracao: t.respostas / max,
      })),
      linhas: [`Respostas · acerto, ${textoPeriodo(c.periodo)}`],
      chamada,
    },
    texto: `O que mais estudei ${textoPeriodo(c.periodo)} no Filidilo: ${top.map((t) => t.nome).join(', ')}. ${convite(c)}`,
  }
}

export function pecaFracos(p: Painel, c: Contexto): Peca {
  return {
    arte: {
      modelo: 'progresso',
      selo: 'Onde vou melhorar',
      titulo: titulo(c),
      itens: p.fracos.map((t) => ({
        nome: t.nome,
        valor: pct(t.taxa),
        fracao: t.taxa,
      })),
      linhas: [`Acerto por tema, ${textoPeriodo(c.periodo)}`],
      chamada,
    },
    texto: `Os temas em que vou melhorar no Filidilo: ${p.fracos.map((t) => t.nome).join(', ')}. ${convite(c)}`,
  }
}

export function pecaDominio(p: Painel, c: Contexto): Peca {
  const dominados = p.dominio.reduce((s, b) => s + b.dominados, 0)
  const total = p.dominio.reduce((s, b) => s + b.total, 0)
  const ganho = c.periodo === 'tudo' ? 0 : p.dominio.reduce((s, b) => s + Math.max(0, b.ganho ?? 0), 0)
  // Com os nomes, a lista dos baralhos; sem, só o total (o nome do baralho é o que a pessoa esconde).
  const itens = c.comNome
    ? p.dominio.slice(0, 5).map((b) => ({
        nome: b.titulo,
        valor: `${b.dominados} de ${b.total}`,
        fracao: b.dominados / b.total,
      }))
    : undefined
  return {
    arte: {
      modelo: 'progresso',
      selo: 'Cartões dominados',
      destaque: String(dominados),
      legenda: `de ${n(total, 'cartão', 'cartões')}${p.dominio.length > 1 ? ` em ${p.dominio.length} baralhos` : ''}`,
      itens,
      linhas: ganho ? [`+${ganho} ${textoPeriodo(c.periodo)}`] : [],
      confete: ganho > 0,
      chamada,
    },
    texto: `Já dominei ${n(dominados, 'cartão', 'cartões')} no Filidilo${ganho ? `, ${ganho} ${textoPeriodo(c.periodo)}` : ''}. ${convite(c)}`,
  }
}

export function pecaMetas(m: { batidas: number; total: number }, c: Contexto): Peca {
  return {
    arte: {
      modelo: 'progresso',
      selo: 'Metas das sessões',
      titulo: titulo(c),
      destaque: `${m.batidas} de ${m.total}`,
      legenda: `${m.total === 1 ? 'sessão bateu' : 'sessões bateram'} a meta ${textoPeriodo(c.periodo)}`,
      fracao: m.total ? m.batidas / m.total : 0,
      chamada,
    },
    texto: `Bati a meta em ${m.batidas} de ${n(m.total, 'sessão', 'sessões')} de estudo ${textoPeriodo(c.periodo)}${emBaralho(c)} no Filidilo. ${convite(c)}`,
  }
}

export function pecaOfensiva(o: { atual: number; maior: number; conquistas: number }, c: Contexto): Peca {
  const linhas = [`Maior sequência: ${n(o.maior, 'dia', 'dias')}`, o.conquistas ? n(o.conquistas, 'conquista', 'conquistas') : ''].filter(Boolean)
  return {
    arte: {
      modelo: 'progresso',
      selo: 'Minha ofensiva',
      destaque: String(o.atual),
      legenda: o.atual === 1 ? 'dia seguido estudando' : 'dias seguidos estudando',
      linhas,
      confete: o.atual >= 7,
      chamada,
    },
    texto: `${o.atual >= 2 ? `Estou há ${o.atual} dias seguidos estudando` : 'Estou estudando'} no Filidilo (maior sequência: ${n(o.maior, 'dia', 'dias')}). ${convite(c)}`,
  }
}
