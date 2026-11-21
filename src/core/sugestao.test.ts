import { describe, expect, it } from 'vitest'
import { temaComPoucosCartoes } from './sugestao'

const temas = [
  { id: 'a', nome: 'A' },
  { id: 'b', nome: 'B' },
  { id: 'c', nome: 'C' },
]
const cartoes = (...porTema: [string, number][]) =>
  porTema.flatMap(([tema, n]) => Array.from({ length: n }, () => ({ tema })))
const baralho = (...porTema: [string, number][]) => ({ temas, cartoes: cartoes(...porTema) as never })

describe('temaComPoucosCartoes', () => {
  it('sugere o primeiro tema, na ordem do plano, abaixo da média', () => {
    expect(temaComPoucosCartoes(baralho(['a', 6], ['b', 3], ['c', 2]))?.id).toBe('b')
  })

  it('não sugere nada quando os temas estão equilibrados', () => {
    expect(temaComPoucosCartoes(baralho(['a', 5], ['b', 5], ['c', 5]))).toBeUndefined()
  })

  it('não sugere tema que já tem muitos cartões, mesmo abaixo da média', () => {
    expect(temaComPoucosCartoes(baralho(['a', 30], ['b', 20], ['c', 25]))).toBeUndefined()
  })

  it('conta tema sem cartões como o mais vazio', () => {
    expect(temaComPoucosCartoes(baralho(['b', 4], ['c', 4]))?.id).toBe('a')
  })

  it('não sugere nada com um tema só', () => {
    expect(temaComPoucosCartoes({ temas: [temas[0]], cartoes: cartoes(['a', 2]) as never })).toBeUndefined()
  })
})
