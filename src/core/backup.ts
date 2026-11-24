import { db, type Estado, type Marca, type Reporte, type Revisao, type SessaoGravada } from './db'
import { CHAVE_OFENSIVA, juntar, lerOfensiva, lerRegistro, type Ofensiva } from './ofensiva'
import { mesclarProgresso } from './progresso'
import { filtrarSessoes, gravarDominio, lerDominio, lerDominioGravado, mesclarSessoes, type DominioDia } from './sessoes'
import { CHAVE_META_SEMANA, lerMetaSemana, type MetaSemana } from './metaSemana'
import type { Baralho, Cartao } from './types'

interface Backup {
  /** Identificador do formato (o app se chamava tatino.); continua igual para restaurar backups antigos. */
  app: 'tatino'
  formato: 1
  data: string
  estados: Estado[]
  revisoes: Revisao[]
  reportes: Reporte[]
  marcas: Marca[]
  /** A partir da fase 2: os baralhos também vivem no aparelho. */
  baralhos?: Baralho[]
  /** A partir da v3.12: dias da ofensiva e folgas. */
  ofensiva?: Ofensiva
  /** A partir da v3.21: sessões de estudo, domínio por dia e meta da semana (painel Seu progresso). */
  sessoes?: SessaoGravada[]
  dominio?: DominioDia[]
  metaSemana?: MetaSemana | null
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
    ofensiva: await lerOfensiva(),
    sessoes: await db.sessoes.toArray(),
    dominio: await lerDominioGravado(),
    metaSemana: lerMetaSemana((await db.meta.get(CHAVE_META_SEMANA))?.valor),
  }
  return new Blob([JSON.stringify(dados)], { type: 'application/json' })
}

/** Restaura mesclando: o estado mais recente de cada cartão vence; nada é apagado. */
export async function importar(texto: string): Promise<{ estados: number; revisoes: number; baralhos: number }> {
  const d = JSON.parse(texto) as Backup
  if (d.app !== 'tatino' || !Array.isArray(d.estados)) throw new Error('Este arquivo não é um backup do Filidilo.')
  let nEst = 0
  let nRev = 0
  let nBar = 0
  await db.transaction('rw', [db.estados, db.revisoes, db.reportes, db.marcas, db.baralhos, db.sessoes], async () => {
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
  // Ofensiva: junta os dias dos dois lados; das folgas, fica a maior.
  const recebida = d.ofensiva ? lerRegistro(JSON.stringify(d.ofensiva)) : null
  if (recebida) await db.meta.put({ chave: CHAVE_OFENSIVA, valor: JSON.stringify(juntar(await lerOfensiva(), recebida)) })
  await mesclarSessoes(filtrarSessoes(d.sessoes))
  // Domínio por dia: no mesmo dia, o daqui vence (é o mais recente neste aparelho).
  const dominio = lerDominio(JSON.stringify(d.dominio ?? []))
  if (dominio.length) await gravarDominio([...dominio, ...(await lerDominioGravado())])
  // Meta da semana: só entra se aqui ainda não tem uma.
  const meta = lerMetaSemana(JSON.stringify(d.metaSemana ?? null))
  if (meta && !(await db.meta.get(CHAVE_META_SEMANA))) await db.meta.put({ chave: CHAVE_META_SEMANA, valor: JSON.stringify(meta) })
  return { estados: nEst, revisoes: nRev, baralhos: nBar }
}

/** Texto dos reportes e marcações de erro, pronto para WhatsApp ou e-mail. */
export async function textoReportes(baralhos: Baralho[], apenasNovos: boolean): Promise<{ texto: string; ids: string[] }> {
  const reportes = (await db.reportes.toArray()).filter((r) => !apenasNovos || !r.enviado).sort((a, z) => a.data - z.data)
  const marcas = (await db.marcas.toArray()).filter((m) => m.status !== 'ok')
  const porId = new Map<string, Cartao>(baralhos.flatMap((b) => b.cartoes.map((c): [string, Cartao] => [`${b.id}/${c.id}`, c])))
  const linhas = [`Filidilo — reportes (${new Date().toLocaleString('pt-BR')})`, '']
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
