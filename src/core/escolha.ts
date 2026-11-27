// Regras do "Como estudar?" que não dependem da tela: quais cartões a escolha cobre e quando há a linha de favoritos.
import { MINIMO_FAVORITOS } from './cartoes'
import type { Filtro } from './fila'
import type { Cartao } from './types'

export interface Recorte {
  temas: string[]
  soFavoritos: boolean
  filtro: Filtro
}

/** A linha "Favoritos" só aparece quando já vale uma rodada só deles. */
export const temLinhaFavoritos = (nFavoritos: number) => nFavoritos >= MINIMO_FAVORITOS

/** Cartões (já sem os arquivados) que a escolha cobre: os favoritos ou os temas marcados, no conteúdo escolhido. */
export function cartoesDoRecorte(cartoes: Cartao[], r: Recorte): Cartao[] {
  return cartoes.filter(
    (c) =>
      (r.soFavoritos ? !!c.favoritoEm : r.temas.includes(c.tema)) &&
      (r.filtro === 'calculo' ? c.tipo === 'calculo' : r.filtro === 'teoria' ? c.tipo !== 'calculo' : true),
  )
}
