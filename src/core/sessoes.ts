// Sessões de estudo e domínio por dia: o que o painel Seu progresso precisa e as respostas sozinhas não dão
// (tempo de estudo, metas batidas, evolução do domínio). Gravado a partir da v3.21; o passado não é estimado.
import { aparelho, db, uuid, type SessaoGravada } from './db'
import { ativos } from './cartoes'
import { chave, dominado } from './srs'
import { diaLocal, somarDias } from './ofensiva'
import type { Baralho } from './types'

/** Entre um toque e outro, conta no máximo isso: o celular largado na mesa não vira estudo. */
export const PAUSA_MAX_MS = 2 * 60000

/**
 * Relógio do tempo de estudo. `tocar` a cada resposta (ou pulo), `pausar` quando a tela some
 * e `retomar` quando volta. Cada trecho conta no máximo `PAUSA_MAX_MS`.
 */
export class Cronometro {
  ativoMs = 0
  private ultimo: number | null

  constructor(agora: number) {
    this.ultimo = agora
  }

  tocar(agora: number) {
    if (this.ultimo === null) return // tela escondida: só volta a contar no retomar
    this.ativoMs += Math.min(PAUSA_MAX_MS, Math.max(0, agora - this.ultimo))
    this.ultimo = agora
  }

  pausar(agora: number) {
    this.tocar(agora)
    this.ultimo = null
  }

  retomar(agora: number) {
    if (this.ultimo === null) this.ultimo = agora
  }
}

export type DadosSessao = Omit<SessaoGravada, 'id' | 'aparelho'>

let gravando: Promise<unknown> = Promise.resolve()

/** Espera a última sessão terminar de gravar (as conquistas do fim leem o tempo da semana). */
export const aguardarGravacao = () => gravando.catch(() => undefined)

/** Grava a sessão. Sem nenhuma resposta, não grava. */
export function gravarSessao(s: DadosSessao): Promise<SessaoGravada | undefined> {
  if (s.respostas <= 0) return Promise.resolve(undefined)
  const p = (async () => {
    const sessao: SessaoGravada = { ...s, id: uuid(), aparelho: await aparelho() }
    await db.sessoes.put(sessao)
    return sessao
  })()
  gravando = p
  return p
}

// ── Domínio por dia ─────────────────────────────────────────────────────────

/** Quantos cartões do baralho estavam dominados naquele dia (o último registro do dia vence). */
export interface DominioDia {
  dia: string
  baralho: string
  dominados: number
  total: number
}

export const CHAVE_DOMINIO = 'dominio'
const DIAS_GUARDADOS = 400

/** Lê o registro guardado; aceita só o formato certo. */
export function lerDominio(valor: string | undefined): DominioDia[] {
  if (!valor) return []
  try {
    const l = JSON.parse(valor) as unknown
    if (!Array.isArray(l)) return []
    return l.filter(
      (d): d is DominioDia =>
        !!d && typeof d.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dia) && typeof d.baralho === 'string' && Number.isFinite(d.dominados) && Number.isFinite(d.total),
    )
  } catch {
    return []
  }
}

/** Junta registros: um por baralho por dia; no mesmo dia, `b` vence. Tira o que passou de 400 dias. */
export function juntarDominio(a: DominioDia[], b: DominioDia[], hoje: string): DominioDia[] {
  const m = new Map<string, DominioDia>()
  for (const d of [...a, ...b]) m.set(`${d.dia}|${d.baralho}`, d)
  const limite = somarDias(hoje, -DIAS_GUARDADOS)
  return [...m.values()].filter((d) => d.dia > limite).sort((x, y) => (x.dia < y.dia ? -1 : x.dia > y.dia ? 1 : 0))
}

export async function lerDominioGravado(): Promise<DominioDia[]> {
  return lerDominio((await db.meta.get(CHAVE_DOMINIO))?.valor)
}

export async function gravarDominio(novos: DominioDia[], agora = Date.now()) {
  const atual = await lerDominioGravado()
  await db.meta.put({ chave: CHAVE_DOMINIO, valor: JSON.stringify(juntarDominio(atual, novos, diaLocal(agora))) })
}

/** Fotografa o domínio de hoje do baralho (só os cartões ativos). */
export async function fotografarDominio(b: Baralho, agora = Date.now()) {
  const estados = await db.estados.where('id').startsWith(`${b.id}/`).toArray()
  const m = new Map(estados.map((e) => [e.id, e]))
  const lista = ativos(b)
  const dominados = lista.filter((c) => dominado(m.get(chave(b.id, c.id)))).length
  await gravarDominio([{ dia: diaLocal(agora), baralho: b.id, dominados, total: lista.length }], agora)
}

// ── Backup e envio com progresso ────────────────────────────────────────────

/** Só sessões com o formato certo (e, com `baralhoId`, só as daquele baralho). */
export function filtrarSessoes(l: unknown, baralhoId?: string): SessaoGravada[] {
  if (!Array.isArray(l)) return []
  return l.filter(
    (s): s is SessaoGravada =>
      !!s &&
      typeof s.id === 'string' &&
      typeof s.baralho === 'string' &&
      (!baralhoId || s.baralho === baralhoId) &&
      Number.isFinite(s.inicio) &&
      Number.isFinite(s.fim) &&
      Number.isFinite(s.ativoMs) &&
      Number.isFinite(s.respostas),
  )
}

/** Junta sessões recebidas: entram uma vez só (pelo id). Devolve quantas entraram. */
export async function mesclarSessoes(l: SessaoGravada[]): Promise<number> {
  if (!l.length) return 0
  const existentes = new Set((await db.sessoes.where('id').anyOf(l.map((s) => s.id)).toArray()).map((s) => s.id))
  const novas = l.filter((s) => !existentes.has(s.id))
  if (novas.length) await db.sessoes.bulkPut(novas)
  return novas.length
}
