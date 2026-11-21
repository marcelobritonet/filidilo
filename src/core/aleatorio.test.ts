import { describe, expect, it } from 'vitest'
import { aleatorio, embaralhar, inteiro } from './aleatorio'

describe('aleatorio', () => {
  it('fica em [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const x = aleatorio()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('inteiro fica em [0, n)', () => {
    for (let i = 0; i < 1000; i++) expect(inteiro(4)).toBeLessThan(4)
  })

  it('embaralhar mantém os itens e não muda a lista original', () => {
    const l = [1, 2, 3, 4, 5]
    const e = embaralhar(l)
    expect([...e].sort()).toEqual(l)
    expect(l).toEqual([1, 2, 3, 4, 5])
  })

  it('embaralhar põe a certa em qualquer posição com a mesma chance', () => {
    const vezes = 40000
    const contagem = [0, 0, 0, 0]
    for (let i = 0; i < vezes; i++) contagem[embaralhar(['certa', 'b', 'c', 'd']).indexOf('certa')]++
    for (const c of contagem) expect(Math.abs(c / vezes - 0.25)).toBeLessThan(0.02)
  })

  it('as 24 ordens de 4 itens saem com a mesma chance', () => {
    const vezes = 48000
    const ordens = new Map<string, number>()
    for (let i = 0; i < vezes; i++) {
      const k = embaralhar([0, 1, 2, 3]).join('')
      ordens.set(k, (ordens.get(k) ?? 0) + 1)
    }
    expect(ordens.size).toBe(24)
    for (const c of ordens.values()) expect(Math.abs(c / vezes - 1 / 24)).toBeLessThan(0.01)
  })
})
