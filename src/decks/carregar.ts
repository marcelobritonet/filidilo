import type { Semente } from '../core/baralhos'
import type { Baralho, Cartao } from '../core/types'

// Baralhos que vêm com o app: src/decks/<id>/baralho.json (temas, versão e cartões retirados)
// + partes/*.json (cartões, um arquivo por tema).
type Meta = Omit<Baralho, 'cartoes'> & { retirados?: string[] }
const metas = import.meta.glob<Meta>('./*/baralho.json', { eager: true, import: 'default' })
const partes = import.meta.glob<{ cartoes: Cartao[] }>('./*/partes/*.json', { eager: true, import: 'default' })

const fabrica = Object.entries(metas).map(([caminho, { retirados = [], ...meta }]) => {
  const pasta = caminho.slice(0, caminho.lastIndexOf('/'))
  const baralho: Baralho = {
    ...meta,
    cartoes: Object.keys(partes)
      .filter((k) => k.startsWith(`${pasta}/partes/`))
      .sort()
      .flatMap((k) => partes[k].cartoes),
  }
  return { baralho, retirados }
})

export const baralhosDeFabrica: Baralho[] = fabrica.map((f) => f.baralho)

export const sementesDeFabrica: Semente[] = fabrica.map((f) => () => ({ baralho: structuredClone(f.baralho), retirados: f.retirados }))
