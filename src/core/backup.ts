import { db, type Estado, type Marca, type Reporte, type Revisao } from './db'
import { mesclarProgresso } from './progresso'
import type { Baralho, Cartao } from './types'

interface Backup {
  app: 'tatino'
  formato: 1
  data: string
  estados: Estado[]
  revisoes: Revisao[]
  reportes: Reporte[]
  marcas: Marca[]
  /** A partir da fase 2: os baralhos também vivem no aparelho. */
  baralhos?: Baralho[]
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
    baralhos: await db.baralhos.toArray(),
  }
  return new Blob([JSON.stringify(dados)], { type: 'application/json' })
}

/** Restaura mesclando: o estado mais recente de cada cartão vence; nada é apagado. */
export async function importar(texto: string): Promise<{ estados: number; revisoes: number; baralhos: number }> {
  const d = JSON.parse(texto) as Backup
  if (d.app !== 'tatino' || !Array.isArray(d.estados)) throw new Error('Este arquivo não é um backup do Tatino.')
  let nEst = 0
  let nRev = 0
  let nBar = 0
  await db.transaction('rw', [db.estados, db.revisoes, db.reportes, db.marcas, db.baralhos], async () => {
    for (const b of d.baralhos ?? []) {
      const atual = await db.baralhos.get(b.id)
      if (!atual || (atual.atualizadoEm ?? 0) < (b.atualizadoEm ?? 0)) {
        await db.baralhos.put(b)
        nBar++
      }
    }
    const r = await mesclarProgresso({ estados: d.estados, revisoes: d.revisoes ?? [], marcas: d.marcas ?? [] })
    nEst = r.estados
    nRev = r.revisoes
    for (const rep of d.reportes ?? []) await db.reportes.put(rep)
  })
  return { estados: nEst, revisoes: nRev, baralhos: nBar }
}

/** Texto dos reportes e marcações de erro, pronto para WhatsApp ou e-mail. */
export async function textoReportes(baralhos: Baralho[], apenasNovos: boolean): Promise<{ texto: string; ids: string[] }> {
  const reportes = (await db.reportes.toArray()).filter((r) => !apenasNovos || !r.enviado).sort((a, z) => a.data - z.data)
  const marcas = (await db.marcas.toArray()).filter((m) => m.status !== 'ok')
  const porId = new Map<string, Cartao>(baralhos.flatMap((b) => b.cartoes.map((c): [string, Cartao] => [`${b.id}/${c.id}`, c])))
  const linhas = [`Tatino — reportes (${new Date().toLocaleString('pt-BR')})`, '']
  for (const r of reportes) {
    const c = porId.get(r.cartao)
    const frente = c ? ('frente' in c ? c.frente : c.titulo) : ''
    linhas.push(`⚠ ${r.cartao} — ${r.motivo}`, `   "${frente.slice(0, 90)}"`)
    if (r.texto) linhas.push(`   ${r.texto}`)
  }
  if (marcas.length) {
    linhas.push('', 'Marcações da revisão de conteúdo:')
    for (const m of marcas) linhas.push(`${m.status === 'erro' ? '⚠' : '📝'} ${m.cartao}${m.nota ? ` — ${m.nota}` : ''}`)
  }
  if (!reportes.length && !marcas.length) linhas.push('Nenhum reporte.')
  return { texto: linhas.join('\n'), ids: reportes.map((r) => r.id) }
}
