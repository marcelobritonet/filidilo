import { describe, expect, it } from 'vitest'
import { semAlternativas } from './srs'

const r = (cartao: string, nota: 1 | 2 | 3 | 4, data: number) => ({ cartao, nota, data })

describe('semAlternativas', () => {
  it('um acerto só ainda mostra as alternativas', () => {
    expect(semAlternativas([r('b/1', 3, 1)]).has('b/1')).toBe(false)
  })
  it('dois acertos seguidos tiram as alternativas', () => {
    expect(semAlternativas([r('b/1', 3, 1), r('b/1', 3, 2)]).has('b/1')).toBe(true)
  })
  it('erro ou chute depois dos acertos traz as alternativas de volta', () => {
    expect(semAlternativas([r('b/1', 3, 1), r('b/1', 3, 2), r('b/1', 1, 3)]).has('b/1')).toBe(false)
    expect(semAlternativas([r('b/1', 3, 1), r('b/1', 3, 2), r('b/1', 2, 3)]).has('b/1')).toBe(false)
  })
  it('acerto, erro, acerto: não são seguidos', () => {
    expect(semAlternativas([r('b/1', 3, 1), r('b/1', 1, 2), r('b/1', 3, 3)]).has('b/1')).toBe(false)
  })
  it('ordena pela data, não pela ordem da lista (revisões vindas de outro aparelho)', () => {
    expect(semAlternativas([r('b/1', 3, 3), r('b/1', 1, 1), r('b/1', 3, 2)]).has('b/1')).toBe(true)
    expect(semAlternativas([r('b/1', 1, 3), r('b/1', 3, 1), r('b/1', 3, 2)]).has('b/1')).toBe(false)
  })
  it('separa por cartão', () => {
    const s = semAlternativas([r('b/1', 3, 1), r('b/2', 3, 2), r('b/1', 4, 3)])
    expect([...s]).toEqual(['b/1'])
  })
})
