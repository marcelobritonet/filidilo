import type { Baralho, Tema } from './types'

/** Abaixo disso um tema conta como "poucos cartões", mesmo que esteja na média. */
const POUCOS = 8

/**
 * Primeiro tema (na ordem do plano) que ainda tem poucos cartões: menos que a média
 * por tema e menos de 8. Serve para o "Que tal mais cartões?" depois da primeira
 * sessão de um baralho novo. Sem tema assim (ou com um tema só), não sugere nada.
 */
export function temaComPoucosCartoes(baralho: Pick<Baralho, 'temas' | 'cartoes'>): Tema | undefined {
  if (baralho.temas.length < 2) return undefined
  const conta = new Map(baralho.temas.map((t) => [t.id, 0]))
  for (const c of baralho.cartoes) if (conta.has(c.tema)) conta.set(c.tema, conta.get(c.tema)! + 1)
  const media = [...conta.values()].reduce((a, n) => a + n, 0) / baralho.temas.length
  return baralho.temas.find((t) => {
    const n = conta.get(t.id)!
    return n < media && n < POUCOS
  })
}
