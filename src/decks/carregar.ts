import type { Baralho, Cartao } from '../core/types'

// Baralhos que vêm com o app: src/decks/<id>/baralho.json (temas) + partes/*.json (cartões, um arquivo por tema).
const metas = import.meta.glob<Omit<Baralho, 'cartoes'>>('./*/baralho.json', { eager: true, import: 'default' })
const partes = import.meta.glob<{ cartoes: Cartao[] }>('./*/partes/*.json', { eager: true, import: 'default' })

export const baralhosDeFabrica: Baralho[] = Object.entries(metas).map(([caminho, meta]) => {
  const pasta = caminho.slice(0, caminho.lastIndexOf('/'))
  return {
    ...meta,
    cartoes: Object.keys(partes)
      .filter((k) => k.startsWith(`${pasta}/partes/`))
      .sort()
      .flatMap((k) => partes[k].cartoes),
  }
})
