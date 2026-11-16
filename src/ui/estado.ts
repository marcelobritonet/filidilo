import { useEffect, useState } from 'preact/hooks'
import { listar, semear } from '../core/baralhos'
import { db, type Estado } from '../core/db'
import type { Baralho } from '../core/types'
import { sementesDeFabrica } from '../decks/carregar'

/** Baralhos que vêm instalados na primeira abertura. */
const SEMENTES = sementesDeFabrica

let pronto: Promise<void> | null = null
export const prepararBanco = () => (pronto ??= semear(SEMENTES))

export const nomeTema = (b: Baralho, id: string) => b.temas.find((t) => t.id === id)?.nome ?? id

/** Lista de baralhos, recarregada quando `versao` muda. */
export function useBaralhos(versao: number) {
  const [baralhos, setBaralhos] = useState<Baralho[] | null>(null)
  useEffect(() => {
    prepararBanco()
      .then(listar)
      .then(setBaralhos)
  }, [versao])
  return baralhos
}

/** Mapa id → estado, recarregado quando `versao` muda. */
export function useEstados(versao: number) {
  const [estados, setEstados] = useState<Map<string, Estado> | null>(null)
  useEffect(() => {
    db.estados.toArray().then((l) => setEstados(new Map(l.map((e) => [e.id, e]))))
  }, [versao])
  return estados
}
