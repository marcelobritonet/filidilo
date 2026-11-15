import { describe, expect, it } from 'vitest'
import { validar } from '../core/validar'
import { hidrodinamica } from './carregar'

describe('baralho Hidrodinâmica', () => {
  const b = hidrodinamica
  it('é válido (ids, temas, opções, fórmulas e marcadores)', () => {
    expect(validar(b, 200)).toEqual([])
  })
  it('todo cartão cita a apostila', () => {
    expect(b.cartoes.filter((c) => !c.fonte?.apostila).map((c) => c.id)).toEqual([])
  })
})
