import { aleatorio as padrao, embaralhar, inteiro } from './aleatorio'
import type { CartaoAssociacao, CartaoVF } from './types'

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

/** Um dos enunciados do cartão (a frente ou um de `outrasFrentes`), para a pergunta não voltar sempre igual. */
export function sortearFrente(c: { frente: string; outrasFrentes?: string[] }, aleatorio: () => number = padrao): string {
  const frentes = [c.frente, ...(c.outrasFrentes ?? [])]
  return frentes[inteiro(frentes.length, aleatorio)]
}

/** Uma das afirmações do V/F (a principal ou uma variante), com a resposta e a explicação dela. */
export function sortearVF(c: CartaoVF, aleatorio: () => number = padrao): { frente: string; resposta: boolean; explicacao?: string } {
  const todas = [{ frente: c.frente, resposta: c.resposta, explicacao: c.explicacao }, ...(c.variantes ?? [])]
  const v = todas[inteiro(todas.length, aleatorio)]
  return { frente: v.frente, resposta: v.resposta, explicacao: v.explicacao?.trim() || c.explicacao }
}
