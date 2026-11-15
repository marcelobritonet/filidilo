import type { Baralho, Cartao } from '../core/types'
import meta from './hidrodinamica/baralho.json'

// Os cartões ficam em um arquivo por tema (partes/*.json) e são juntados aqui num baralho só.
const partes = import.meta.glob<{ cartoes: Cartao[] }>('./hidrodinamica/partes/*.json', { eager: true, import: 'default' })

export const hidrodinamica: Baralho = {
  ...(meta as Omit<Baralho, 'cartoes'>),
  cartoes: Object.keys(partes)
    .sort()
    .flatMap((k) => partes[k].cartoes),
}
