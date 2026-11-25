import { db, type Estado, type Marca, type Reporte, type Revisao, type SessaoGravada } from './db'
import { CHAVE_OFENSIVA, juntar, lerOfensiva, lerRegistro, type Ofensiva } from './ofensiva'
import { mesclarProgresso } from './progresso'
import { filtrarSessoes, gravarDominio, lerDominio, lerDominioGravado, mesclarSessoes, type DominioDia } from './sessoes'
import { CHAVE_META_SEMANA, lerMetaSemana, type MetaSemana } from './metaSemana'
import type { Baralho, Cartao } from './types'
import { CHAVE_MARCOS } from './conquistas'
import { gravarOrdem, lerOrdem, lerOrdemEm } from './baralhos'
import { gravarExcluidos, juntarExcluidos, lerExcluidos, lerExcluidosDe, type Excluidos } from './excluidos'

export interface Backup {
  /** Identificador do formato (o app se chamava tatino.); continua igual para restaurar backups antigos. */
  app: 'tatino'
  /** 2 a partir da sincronização (P131): marcas de exclusão, ordem e marcos. O 1 continua sendo lido. */
  formato: 1 | 2
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
  /** Formato 2: o que foi excluído e quando, para juntar sem trazer de volta. */
  excluidos?: Excluidos
  /** Formato 2: ordem da lista de baralhos e quando foi escolhida. */
  ordem?: { ids: string[]; em: number } | null
  /** Formato 2: marcos já comemorados. */
  marcos?: string[]
}

const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, z) => (a.id < z.id ? -1 : a.id > z.id ? 1 : 0))

/**
 * Tudo o que é da pessoa, num objeto só (backup e sincronização). As listas vão ordenadas pelo id,
 * para dois aparelhos com os mesmos dados gerarem o mesmo conteúdo.
 */
export async function instantaneo(): Promise<Backup> {
  const ordem = await lerOrdem()
  const marcos = (await db.meta.get(CHAVE_MARCOS))?.valor
  let listaMarcos: string[] | undefined
  try {
    const v = marcos && JSON.parse(marcos)
    if (Array.isArray(v)) listaMarcos = v.filter((x): x is string => typeof x === 'string').sort()
  } catch {
    /* marcos ilegíveis: ficam de fora */
  }
  return {
    app: 'tatino',
    formato: 2,
    data: new Date().toISOString(),
    estados: await db.estados.toArray(),
    revisoes: porId((await db.revisoes.toArray()).map(({ seq: _seq, ...r }) => r)),
    reportes: await db.reportes.toArray(),
    marcas: await db.marcas.toArray(),
    baralhos: await db.baralhos.toArray(),
    ofensiva: await lerOfensiva(),
    sessoes: await db.sessoes.toArray(),
    dominio: await lerDominioGravado(),
    metaSemana: lerMetaSemana((await db.meta.get(CHAVE_META_SEMANA))?.valor),
    excluidos: await lerExcluidos(),
    ordem: ordem ? { ids: ordem, em: await lerOrdemEm() } : null,
    marcos: listaMarcos,
  }
}

export async function exportar(): Promise<Blob> {
  return new Blob([JSON.stringify(await instantaneo())], { type: 'application/json' })
}

const em = (x: { atualizadoEm?: number }) => x.atualizadoEm ?? 0

/**
 * Junta duas versões do mesmo baralho, cartão a cartão. Os dados do baralho (título, temas,
 * configuração, arquivado) vêm da versão mexida por último; de cada cartão, fica a versão mais
 * recente (empate: a do baralho mais recente). Cartões excluídos ficam de fora, a não ser que tenham
 * sido mexidos depois da exclusão. Os temas dos dois lados ficam.
 */
export function juntarBaralho(local: Baralho, recebido: Baralho, excluidos: Excluidos): Baralho {
  const recebidoVence = em(recebido) > em(local)
  const [novo, velho] = recebidoVence ? [recebido, local] : [local, recebido]
  const doVelho = new Map(velho.cartoes.map((c) => [c.id, c]))
  const ids = new Set<string>()
  const cartoes: Cartao[] = []
  for (const c of [...novo.cartoes, ...velho.cartoes]) {
    if (ids.has(c.id)) continue
    ids.add(c.id)
    const outro = novo.cartoes.includes(c) ? doVelho.get(c.id) : undefined
    const escolhido = outro && em(outro) > em(c) ? outro : c
    const exclusao = excluidos.cartoes[`${local.id}/${c.id}`]
    if (exclusao !== undefined && em(escolhido) <= exclusao) continue
    cartoes.push(escolhido)
  }
  const temas = [...novo.temas, ...velho.temas.filter((t) => !novo.temas.some((x) => x.id === t.id))]
  const criadoEm = Math.min(local.criadoEm ?? Infinity, recebido.criadoEm ?? Infinity)
  return { ...novo, temas, cartoes, ...(Number.isFinite(criadoEm) && { criadoEm }), atualizadoEm: Math.max(em(local), em(recebido)) }
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export interface Juntado {
  estados: number
  revisoes: number
  /** Baralhos que entraram ou mudaram aqui. */
  baralhos: number
  /** Baralhos apagados aqui por terem sido excluídos no outro lado. */
  removidos: number
}

/**
 * Junta dados recebidos (backup ou outro aparelho) aos daqui. Só acrescenta: o mais recente de cada
 * coisa vence, e o que foi excluído (num lado ou no outro) só volta se foi mexido depois.
 */
export async function mesclarTudo(d: Backup): Promise<Juntado> {
  if (d.app !== 'tatino' || !Array.isArray(d.estados)) throw new Error('Este arquivo não é um backup do Filidilo.')
  let nEst = 0
  let nRev = 0
  let nBar = 0
  let nRem = 0
  const excluidos = juntarExcluidos(await lerExcluidos(), lerExcluidosDe(d.excluidos))
  await db.transaction('rw', [db.estados, db.revisoes, db.reportes, db.marcas, db.baralhos, db.sessoes, db.meta], async () => {
    await gravarExcluidos(excluidos)
    const recebidos = new Map((d.baralhos ?? []).filter((b) => typeof b?.id === 'string' && Array.isArray(b.cartoes)).map((b) => [b.id, b]))
    const ids = new Set([...recebidos.keys(), ...(await db.baralhos.toCollection().primaryKeys())])
    for (const id of ids) {
      const atual = await db.baralhos.get(id)
      const veio = recebidos.get(id)
      // Só de um lado: junta consigo mesmo, para tirar os cartões excluídos do outro lado.
      const final = juntarBaralho((atual ?? veio)!, (veio ?? atual)!, excluidos)
      const exclusao = excluidos.baralhos[id]
      if (exclusao !== undefined && em(final) <= exclusao) {
        if (atual) {
          await db.baralhos.delete(id)
          nRem++
        }
        continue
      }
      if (!atual || !igual(atual, final)) {
        await db.baralhos.put(final)
        nBar++
      }
    }
    const r = await mesclarProgresso({ estados: d.estados, revisoes: d.revisoes ?? [], marcas: d.marcas ?? [] })
    nEst = r.estados
    nRev = r.revisoes
    for (const rep of d.reportes ?? []) await db.reportes.put(rep)
    // Ordem da lista: a escolhida por último vence.
    if (d.ordem && Array.isArray(d.ordem.ids) && typeof d.ordem.em === 'number' && d.ordem.em > (await lerOrdemEm()))
      await gravarOrdem(d.ordem.ids.filter((x): x is string => typeof x === 'string'), d.ordem.em)
    // Marcos comemorados: os dos dois lados (o que já foi comemorado lá não comemora de novo aqui).
    if (Array.isArray(d.marcos)) {
      const m = await db.meta.get(CHAVE_MARCOS)
      let daqui: string[] = []
      try {
        daqui = m ? (JSON.parse(m.valor) as string[]) : []
      } catch {
        /* ilegível: fica só o recebido */
      }
      const todos = [...new Set([...daqui, ...d.marcos.filter((x): x is string => typeof x === 'string')])].sort()
      if (!m || !igual([...daqui].sort(), todos)) await db.meta.put({ chave: CHAVE_MARCOS, valor: JSON.stringify(todos) })
    }
  })
  // Ofensiva: junta os dias dos dois lados; das folgas, fica a maior.
  const recebida = d.ofensiva ? lerRegistro(JSON.stringify(d.ofensiva)) : null
  if (recebida) {
    const daqui = await lerOfensiva()
    const junta = juntar(daqui, recebida)
    if (!igual(junta, juntar(daqui, daqui))) await db.meta.put({ chave: CHAVE_OFENSIVA, valor: JSON.stringify(junta) })
  }
  await mesclarSessoes(filtrarSessoes(d.sessoes))
  // Domínio por dia: no mesmo dia, o daqui vence (é o mais recente neste aparelho).
  const dominio = lerDominio(JSON.stringify(d.dominio ?? []))
  if (dominio.length) await gravarDominio([...dominio, ...(await lerDominioGravado())])
  // Meta da semana: só entra se aqui ainda não tem uma.
  const meta = lerMetaSemana(JSON.stringify(d.metaSemana ?? null))
  if (meta && !(await db.meta.get(CHAVE_META_SEMANA))) await db.meta.put({ chave: CHAVE_META_SEMANA, valor: JSON.stringify(meta) })
  return { estados: nEst, revisoes: nRev, baralhos: nBar, removidos: nRem }
}

/** Restaura mesclando: o estado mais recente de cada cartão vence; nada é apagado (só o que foi excluído). */
export async function importar(texto: string): Promise<{ estados: number; revisoes: number; baralhos: number }> {
  const r = await mesclarTudo(JSON.parse(texto) as Backup)
  return { estados: r.estados, revisoes: r.revisoes, baralhos: r.baralhos }
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
