import { db, type Estado, type Marca, type Reporte, type Revisao } from './db'
import type { Baralho } from './types'

interface Backup {
  app: 'tatino'
  formato: 1
  data: string
  estados: Estado[]
  revisoes: Revisao[]
  reportes: Reporte[]
  marcas: Marca[]
}

export async function exportar(): Promise<Blob> {
  const dados: Backup = {
    app: 'tatino',
    formato: 1,
    data: new Date().toISOString(),
    estados: await db.estados.toArray(),
    revisoes: (await db.revisoes.toArray()).map(({ seq: _seq, ...r }) => r),
    reportes: await db.reportes.toArray(),
    marcas: await db.marcas.toArray(),
  }
  return new Blob([JSON.stringify(dados)], { type: 'application/json' })
}

/** Restaura mesclando: o estado mais recente de cada cartão vence; nada é apagado. */
export async function importar(texto: string): Promise<{ estados: number; revisoes: number }> {
  const d = JSON.parse(texto) as Backup
  if (d.app !== 'tatino' || !Array.isArray(d.estados)) throw new Error('Este arquivo não é um backup do Tatino.')
  let nEst = 0
  let nRev = 0
  await db.transaction('rw', [db.estados, db.revisoes, db.reportes, db.marcas], async () => {
    for (const e of d.estados) {
      const atual = await db.estados.get(e.id)
      if (!atual || atual.ultimaData < e.ultimaData) {
        e.fsrs.due = new Date(e.fsrs.due)
        if (e.fsrs.last_review) e.fsrs.last_review = new Date(e.fsrs.last_review)
        await db.estados.put(e)
        nEst++
      }
    }
    const existentes = new Set((await db.revisoes.toArray()).map((r) => r.id))
    for (const r of d.revisoes ?? []) if (!existentes.has(r.id)) {
      await db.revisoes.add(r)
      nRev++
    }
    for (const r of d.reportes ?? []) await db.reportes.put(r)
    for (const m of d.marcas ?? []) {
      const atual = await db.marcas.get(m.cartao)
      if (!atual || atual.data < m.data) await db.marcas.put(m)
    }
  })
  return { estados: nEst, revisoes: nRev }
}

/** Texto dos reportes e marcações de erro, pronto para WhatsApp ou e-mail. */
export async function textoReportes(b: Baralho, apenasNovos: boolean): Promise<{ texto: string; ids: string[] }> {
  const reportes = (await db.reportes.toArray()).filter((r) => !apenasNovos || !r.enviado).sort((a, z) => a.data - z.data)
  const marcas = (await db.marcas.toArray()).filter((m) => m.status !== 'ok')
  const porId = new Map(b.cartoes.map((c) => [`${b.id}/${c.id}`, c]))
  const linhas = [`Tatino — reportes (${new Date().toLocaleString('pt-BR')})`, '']
  for (const r of reportes) {
    const c = porId.get(r.cartao)
    const frente = c ? ('frente' in c ? c.frente : c.titulo) : ''
    linhas.push(`⚠ ${r.cartao.split('/')[1]} — ${r.motivo}`, `   "${frente.slice(0, 90)}"`)
    if (r.texto) linhas.push(`   ${r.texto}`)
  }
  if (marcas.length) {
    linhas.push('', 'Marcações da revisão de conteúdo:')
    for (const m of marcas) linhas.push(`${m.status === 'erro' ? '⚠' : '📝'} ${m.cartao.split('/')[1]}${m.nota ? ` — ${m.nota}` : ''}`)
  }
  if (!reportes.length && !marcas.length) linhas.push('Nenhum reporte.')
  return { texto: linhas.join('\n'), ids: reportes.map((r) => r.id) }
}
