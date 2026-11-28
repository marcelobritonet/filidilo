// Ligar colunas (P140): a cada vez, 4 pares sorteados, com a coluna da direita embaralhada.
import { aleatorio as padrao, embaralhar } from './aleatorio'
import type { CartaoColunas } from './types'

/** Quantos pares aparecem de cada vez. */
export const PARES_POR_VEZ = 4

export interface SorteioColunas {
  esquerda: string[]
  direita: string[]
  /** certo[i] = posição, em `direita`, do item que combina com `esquerda[i]`. */
  certo: number[]
}

export function sortearPares(c: CartaoColunas, aleatorio: () => number = padrao): SorteioColunas {
  const pares = embaralhar(c.pares, aleatorio).slice(0, PARES_POR_VEZ)
  const ordem = embaralhar(pares.map((_, i) => i), aleatorio)
  return {
    esquerda: pares.map((p) => p.esquerda),
    direita: ordem.map((i) => pares[i].direita),
    certo: pares.map((_, i) => ordem.indexOf(i)),
  }
}

/** Todas as ligações certas? (A decisão do Marcelo: só conta acerto com todos os pares certos.) */
export const acertouColunas = (ligacoes: (number | null)[], certo: number[]): boolean =>
  ligacoes.length === certo.length && ligacoes.every((l, i) => l === certo[i])
