import { aleatorio as padrao, embaralhar, inteiro } from './aleatorio'
import type { CartaoAssociacao } from './types'

/** Quantas erradas aparecem de cada vez. */
export const ERRADAS_POR_VEZ = 3

/**
 * Alternativas de uma vez em que o cartão aparece: uma das formas da certa
 * e até 3 erradas sorteadas, em ordem aleatória.
 */
export function sortearAlternativas(c: CartaoAssociacao, aleatorio: () => number = padrao): { opcoes: string[]; correta: number } {
  const formas = [c.opcoes[c.correta], ...(c.outrasFormas ?? [])]
  const certa = formas[inteiro(formas.length, aleatorio)]
  const erradas = embaralhar(c.opcoes.filter((_, i) => i !== c.correta), aleatorio).slice(0, ERRADAS_POR_VEZ)
  const opcoes = embaralhar([certa, ...erradas], aleatorio)
  return { opcoes, correta: opcoes.indexOf(certa) }
}

/** Uma das formas da resposta certa (para mostrar a resposta sem alternativas). */
export function formaDaCerta(c: CartaoAssociacao, aleatorio: () => number = padrao): string {
  const formas = [c.opcoes[c.correta], ...(c.outrasFormas ?? [])]
  return formas[inteiro(formas.length, aleatorio)]
}
