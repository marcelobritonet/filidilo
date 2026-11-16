import { describe, expect, it } from 'vitest'
import { validar } from '../core/validar'
import { baralhosDeFabrica } from './carregar'

describe('baralhos de fábrica', () => {
  it('existe só o de One Piece, com os três temas', () => {
    expect(baralhosDeFabrica.map((b) => b.id)).toEqual(['one-piece'])
    expect(baralhosDeFabrica[0].temas.map((t) => t.nome)).toEqual(['Tripulação do Going Merry', 'Lore', 'Marinha'])
  })
  for (const b of baralhosDeFabrica)
    it(`${b.titulo}: válido e com cartões em todos os temas`, () => {
      expect(validar(b, 50)).toEqual([])
      for (const t of b.temas) expect(b.cartoes.some((c) => c.tema === t.id)).toBe(true)
    })
})
