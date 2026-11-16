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

export function diasAte(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number)
  const alvo = new Date(a, m - 1, d).getTime()
  const hoje = new Date()
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
  return Math.round((alvo - h) / 86400000)
}

export function textoContagem(prova?: string): string | null {
  if (!prova) return null
  const dias = diasAte(prova)
  if (dias < 0) return null
  return dias === 0 ? 'A prova é hoje. Boa prova!' : dias === 1 ? 'Prova amanhã' : `Faltam ${dias} dias para a prova`
}
