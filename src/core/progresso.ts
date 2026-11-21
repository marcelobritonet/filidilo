import { db, type Estado, type Marca, type Revisao } from './db'

/** Progresso de um baralho: o que vai junto quando ela leva o baralho para outro aparelho dela. */
export interface Progresso {
  estados: Estado[]
  revisoes: Revisao[]
  marcas: Marca[]
}

const prefixo = (baralhoId: string) => `${baralhoId}/`

/** Lê o progresso de um baralho (estados, respostas e marcações dos cartões dele). */
export async function progressoDoBaralho(baralhoId: string): Promise<Progresso> {
  const p = prefixo(baralhoId)
  const [estados, revisoes, marcas] = await Promise.all([
    db.estados.where('id').startsWith(p).toArray(),
    db.revisoes.where('cartao').startsWith(p).toArray(),
    db.marcas.where('cartao').startsWith(p).toArray(),
  ])
  return { estados, revisoes: revisoes.map(({ seq: _seq, ...r }) => r), marcas }
}

/** Só o que é deste baralho e tem o formato certo; o resto é descartado. */
export function filtrarProgresso(d: unknown, baralhoId: string): Progresso | undefined {
  const x = d as Partial<Progresso> | undefined
  if (!x || !Array.isArray(x.estados)) return undefined
  const p = prefixo(baralhoId)
  const estados = x.estados.filter((e) => typeof e?.id === 'string' && e.id.startsWith(p) && !!e.fsrs && typeof e.ultimaData === 'number')
  const revisoes = (Array.isArray(x.revisoes) ? x.revisoes : []).filter((r) => typeof r?.id === 'string' && typeof r.cartao === 'string' && r.cartao.startsWith(p))
  const marcas = (Array.isArray(x.marcas) ? x.marcas : []).filter((m) => typeof m?.cartao === 'string' && m.cartao.startsWith(p) && typeof m.data === 'number')
  if (!estados.length && !revisoes.length && !marcas.length) return undefined
  return { estados, revisoes, marcas }
}

/** Troca o baralho dos ids (para importar como baralho separado). */
export function trocarBaralho(p: Progresso, de: string, para: string): Progresso {
  const a = prefixo(de)
  const t = (id: string) => (id.startsWith(a) ? prefixo(para) + id.slice(a.length) : id)
  return {
    estados: p.estados.map((e) => ({ ...e, id: t(e.id) })),
    // Revisão com cartão novo é outra revisão: id novo para não colidir com a do original.
    revisoes: p.revisoes.map((r) => ({ ...r, id: `${r.id}@${para}`, cartao: t(r.cartao) })),
    marcas: p.marcas.map((m) => ({ ...m, cartao: t(m.cartao) })),
  }
}

/**
 * Junta progresso recebido ao do aparelho: o estado mais recente de cada cartão vence,
 * respostas entram uma vez só (pelo id) e a marcação mais recente vence. Nada é apagado.
 */
export async function mesclarProgresso(p: Progresso): Promise<{ estados: number; revisoes: number }> {
  let nEst = 0
  let nRev = 0
  await db.transaction('rw', [db.estados, db.revisoes, db.marcas], async () => {
    for (const e of p.estados) {
      const atual = await db.estados.get(e.id)
      if (!atual || atual.ultimaData < e.ultimaData) {
        const fsrs = { ...e.fsrs, due: new Date(e.fsrs.due) }
        if (e.fsrs.last_review) fsrs.last_review = new Date(e.fsrs.last_review)
        await db.estados.put({ ...e, fsrs })
        nEst++
      }
    }
    const ids = p.revisoes.map((r) => r.id)
    const existentes = new Set(ids.length ? (await db.revisoes.where('id').anyOf(ids).toArray()).map((r) => r.id) : [])
    for (const { seq: _seq, ...r } of p.revisoes)
      if (!existentes.has(r.id)) {
        await db.revisoes.add(r)
        existentes.add(r.id)
        nRev++
      }
    for (const m of p.marcas) {
      const atual = await db.marcas.get(m.cartao)
      if (!atual || atual.data < m.data) await db.marcas.put(m)
    }
  })
  return { estados: nEst, revisoes: nRev }
}
