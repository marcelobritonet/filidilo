// Contexto das estatísticas de uso (P119): de que aparelho, com quanto conteúdo, de onde veio o baralho.
// Só categorias e faixas: nada que identifique a pessoa ou o conteúdo dos cartões.
import { baralhosDeFabrica } from '../decks/carregar'
import { db } from './db'
import { diaLocal, lerOfensiva, sequencia } from './ofensiva'
import { evento } from './telemetria'
import type { Baralho } from './types'

/** Faixa de um número: '0', '1-5', '6-20'… Os limites são os topos de cada faixa. */
export function faixa(n: number, limites: number[]): string {
  if (n <= 0) return '0'
  let de = 1
  for (const ate of limites) {
    if (n <= ate) return de === ate ? String(ate) : `${de}-${ate}`
    de = ate + 1
  }
  return `${de}+`
}

export type Plataforma = 'ios' | 'android' | 'desktop'

/** Sistema do aparelho, pelo user-agent (o iPad novo se diz Macintosh, mas tem toque). */
export function plataforma(ua: string, toques = 0): Plataforma {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && toques > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/** Largura da tela em três tamanhos. */
export const tamanhoTela = (largura: number): 'pequena' | 'media' | 'grande' => (largura < 600 ? 'pequena' : largura < 1024 ? 'media' : 'grande')

export type OrigemBaralho = 'fabrica' | 'aprender' | 'ia' | 'recebido' | 'manual' | 'vazio'

/** De onde veio o baralho: de fábrica, do Aprender (tem objetivo) ou pela origem da maioria dos cartões. */
export function origemBaralho(b: Baralho, fabrica: ReadonlySet<string> = idsFabrica): OrigemBaralho {
  if (fabrica.has(b.id)) return 'fabrica'
  if (b.objetivo) return 'aprender'
  if (!b.cartoes.length) return 'vazio'
  const conta = { ia: 0, importado: 0, manual: 0 }
  for (const c of b.cartoes) conta[c.origem ?? 'manual']++
  const [maior] = (Object.entries(conta) as [keyof typeof conta, number][]).sort((a, z) => z[1] - a[1])
  return maior[0] === 'importado' ? 'recebido' : maior[0]
}
const idsFabrica = new Set(baralhosDeFabrica.map((b) => b.id))

/** Uma vez por abertura: quanto conteúdo a pessoa tem e há quanto tempo estuda. */
export async function registrarEstado(baralhos: Baralho[], agora = Date.now()): Promise<void> {
  const ativos = baralhos.filter((b) => !b.arquivadoEm)
  const cartoes = ativos.reduce((s, b) => s + b.cartoes.filter((c) => !c.arquivadoEm).length, 0)
  const primeira = await db.revisoes.orderBy('data').first()
  const dias = primeira ? Math.floor((agora - primeira.data) / 86400000) : -1
  const ofensiva = sequencia(await lerOfensiva(agora), diaLocal(agora))
  evento('app_estado', {
    baralhos: ativos.length,
    baralhos_arquivados: baralhos.length - ativos.length,
    so_de_fabrica: ativos.every((b) => idsFabrica.has(b.id)),
    cartoes: faixa(cartoes, [20, 100, 500]),
    dias_de_uso: dias < 0 ? 'nunca_respondeu' : faixa(dias + 1, [1, 7, 30, 90]),
    ofensiva: faixa(ofensiva, [1, 3, 7, 30]),
  })
}
