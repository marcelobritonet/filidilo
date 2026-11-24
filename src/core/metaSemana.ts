// Meta da semana (painel Seu progresso): dias com sessão concluída ou minutos de estudo, de domingo a sábado.
import { db, type SessaoGravada } from './db'
import { diaLocal, somarDias, type Ofensiva } from './ofensiva'

export type MetaSemana = { tipo: 'dias'; n: number } | { tipo: 'minutos'; n: number }

export const OPCOES_DIAS = [3, 5, 7]
export const OPCOES_MINUTOS = [30, 60, 120, 180]
export const CHAVE_META_SEMANA = 'meta-semana'

/** Lê a meta guardada; aceita só o formato certo. */
export function lerMetaSemana(valor: string | undefined): MetaSemana | null {
  if (!valor) return null
  try {
    const x = JSON.parse(valor) as Partial<MetaSemana> | null
    if (!x || (x.tipo !== 'dias' && x.tipo !== 'minutos')) return null
    const n = Math.floor(Number(x.n))
    if (x.tipo === 'dias' && n >= 1 && n <= 7) return { tipo: 'dias', n }
    if (x.tipo === 'minutos' && n >= 1 && n <= 10080) return { tipo: 'minutos', n }
    return null
  } catch {
    return null
  }
}

/** Domingo da semana do dia ("AAAA-MM-DD"). */
export function inicioDaSemana(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  return somarDias(dia, -new Date(a, m - 1, d, 12).getDay())
}

export interface AndamentoMeta {
  meta: MetaSemana
  feito: number
  batida: boolean
  /** Domingo da semana medida. */
  semana: string
}

/**
 * Quanto da meta já foi feito na semana de `hoje`. Dias: dias com sessão concluída (folga não conta).
 * Minutos: tempo de estudo das sessões gravadas.
 */
export function andamento(meta: MetaSemana, ofensiva: Ofensiva, sessoes: Pick<SessaoGravada, 'inicio' | 'ativoMs'>[], hoje: string): AndamentoMeta {
  const semana = inicioDaSemana(hoje)
  const fim = somarDias(semana, 6)
  const naSemana = (d: string) => d >= semana && d <= fim
  const feito =
    meta.tipo === 'dias'
      ? new Set(ofensiva.concluidos.filter(naSemana)).size
      : Math.floor(sessoes.filter((s) => naSemana(diaLocal(s.inicio))).reduce((t, s) => t + s.ativoMs, 0) / 60000)
  return { meta, feito, batida: feito >= meta.n, semana }
}

export async function lerMetaGravada(): Promise<MetaSemana | null> {
  return lerMetaSemana((await db.meta.get(CHAVE_META_SEMANA))?.valor)
}

export async function gravarMetaSemana(m: MetaSemana | null) {
  if (m) await db.meta.put({ chave: CHAVE_META_SEMANA, valor: JSON.stringify(m) })
  else await db.meta.delete(CHAVE_META_SEMANA)
}
