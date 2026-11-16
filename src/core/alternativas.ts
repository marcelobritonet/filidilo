import type { CartaoAssociacao } from './types'

/** Quantas erradas aparecem de cada vez. */
export const ERRADAS_POR_VEZ = 3

const embaralhar = <T>(l: T[], aleatorio: () => number): T[] => {
  const a = [...l]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Alternativas de uma vez em que o cartão aparece: uma das formas da certa
 * e até 3 erradas sorteadas, em ordem aleatória.
 */
export function sortearAlternativas(c: CartaoAssociacao, aleatorio: () => number = Math.random): { opcoes: string[]; correta: number } {
  const formas = [c.opcoes[c.correta], ...(c.outrasFormas ?? [])]
  const certa = formas[Math.floor(aleatorio() * formas.length)]
  const erradas = embaralhar(c.opcoes.filter((_, i) => i !== c.correta), aleatorio).slice(0, ERRADAS_POR_VEZ)
  const opcoes = embaralhar([certa, ...erradas], aleatorio)
  return { opcoes, correta: opcoes.indexOf(certa) }
}

/** Uma das formas da resposta certa (para mostrar a resposta sem alternativas). */
export function formaDaCerta(c: CartaoAssociacao, aleatorio: () => number = Math.random): string {
  const formas = [c.opcoes[c.correta], ...(c.outrasFormas ?? [])]
  return formas[Math.floor(aleatorio() * formas.length)]
}
