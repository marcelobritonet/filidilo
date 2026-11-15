import { useEffect, useState } from 'preact/hooks'
import { db, type Estado } from '../core/db'
import { hidrodinamica } from '../decks/carregar'

export const baralho = hidrodinamica

export const nomeTema = (id: string) => baralho.temas.find((t) => t.id === id)?.nome ?? id

/** Mapa id → estado, recarregado quando `versao` muda. */
export function useEstados(versao: number) {
  const [estados, setEstados] = useState<Map<string, Estado> | null>(null)
  useEffect(() => {
    db.estados.toArray().then((l) => setEstados(new Map(l.map((e) => [e.id, e]))))
  }, [versao])
  return estados
}

export function diasAte(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1, d).getTime()
  const hoje = new Date()
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
  return Math.round((alvo - h) / 86400000)
}
