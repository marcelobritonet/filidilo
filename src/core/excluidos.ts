import { db } from './db'

/**
 * Marcas de exclusão: o que a pessoa excluiu e quando. Vão no backup e na sincronização, para que
 * juntar com outro aparelho não traga de volta o que já foi excluído. Um item recebido só volta se foi
 * mexido depois da exclusão (o `atualizadoEm` dele é mais novo que a marca).
 */
export interface Excluidos {
  /** id do baralho → quando foi excluído. */
  baralhos: Record<string, number>
  /** "baralho/cartão" → quando foi excluído. */
  cartoes: Record<string, number>
}

export const CHAVE_EXCLUIDOS = 'excluidos'

export const vazios = (): Excluidos => ({ baralhos: {}, cartoes: {} })

const soNumeros = (x: unknown): Record<string, number> => {
  const out: Record<string, number> = {}
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  return out
}

/** Lê marcas de exclusão de qualquer origem (arquivo, cofre); o que não tem o formato certo é ignorado. */
export function lerExcluidosDe(x: unknown): Excluidos {
  const e = x as Partial<Excluidos> | undefined
  return { baralhos: soNumeros(e?.baralhos), cartoes: soNumeros(e?.cartoes) }
}

export async function lerExcluidos(): Promise<Excluidos> {
  const m = await db.meta.get(CHAVE_EXCLUIDOS)
  if (!m) return vazios()
  try {
    return lerExcluidosDe(JSON.parse(m.valor))
  } catch {
    return vazios()
  }
}

export const gravarExcluidos = (e: Excluidos) => db.meta.put({ chave: CHAVE_EXCLUIDOS, valor: JSON.stringify(e) })

/** Junta as marcas dos dois lados: de cada item, fica a exclusão mais recente. */
export function juntarExcluidos(a: Excluidos, b: Excluidos): Excluidos {
  const j = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x }
    for (const [k, v] of Object.entries(y)) out[k] = Math.max(out[k] ?? 0, v)
    return out
  }
  return { baralhos: j(a.baralhos, b.baralhos), cartoes: j(a.cartoes, b.cartoes) }
}

async function mudar(f: (e: Excluidos) => void): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const e = await lerExcluidos()
    f(e)
    await gravarExcluidos(e)
  })
}

export const marcarBaralhoExcluido = (id: string, quando = Date.now()) => mudar((e) => void (e.baralhos[id] = quando))

export const marcarCartaoExcluido = (baralho: string, cartao: string, quando = Date.now()) => mudar((e) => void (e.cartoes[`${baralho}/${cartao}`] = quando))

/** Desfazer a exclusão: a marca sai. */
export const desmarcarBaralho = (id: string) => mudar((e) => void delete e.baralhos[id])

export const desmarcarCartao = (baralho: string, cartao: string) => mudar((e) => void delete e.cartoes[`${baralho}/${cartao}`])
