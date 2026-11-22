import Dexie, { type Table } from 'dexie'
import type { Card as FsrsCard } from 'ts-fsrs'
import type { Baralho } from './types'

export type Nota = 1 | 2 | 3 | 4 // Errei, Difícil, Acertei, Fácil

export interface Estado {
  id: string // "<baralho>/<cartão>"
  fsrs: FsrsCard
  ultimaNota: Nota
  ultimaData: number
  acertos: number
  erros: number
}

/** Histórico só por acréscimo: base para a sincronização da fase 2. */
export interface Revisao {
  seq?: number
  id: string // uuid
  cartao: string
  nota: Nota
  data: number
  aparelho: string
  modo: 'prova' | 'espacada' | 'calculo'
}

export interface Reporte {
  id: string
  cartao: string
  motivo: string
  texto: string
  data: number
  enviado: boolean
}

export interface Marca {
  cartao: string
  status: 'ok' | 'erro' | 'nota'
  nota: string
  data: number
}

export interface Meta {
  chave: string
  valor: string
}

class FilidiloDB extends Dexie {
  estados!: Table<Estado, string>
  revisoes!: Table<Revisao, number>
  reportes!: Table<Reporte, string>
  marcas!: Table<Marca, string>
  meta!: Table<Meta, string>
  baralhos!: Table<Baralho, string>

  constructor() {
    // O banco continua com o nome antigo (o app se chamava tatino.): trocar apagaria os baralhos de quem já usa.
    super('tatino')
    this.version(1).stores({
      estados: 'id',
      revisoes: '++seq, id, cartao, data',
      reportes: 'id, cartao, data',
      marcas: 'cartao',
      meta: 'chave',
    })
    // Fase 2: baralhos passam a viver no aparelho.
    this.version(2).stores({ baralhos: 'id' })
  }
}

export const db = new FilidiloDB()

export const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

let aparelhoCache: string | null = null
export async function aparelho(): Promise<string> {
  if (aparelhoCache) return aparelhoCache
  const m = await db.meta.get('aparelho')
  if (m) return (aparelhoCache = m.valor)
  const v = uuid()
  await db.meta.put({ chave: 'aparelho', valor: v })
  return (aparelhoCache = v)
}

/** Pede ao navegador para não apagar os dados do app. */
export async function pedirPersistencia() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    /* sem suporte */
  }
}
