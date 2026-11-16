import { describe, expect, it } from 'vitest'
import { sortearAlternativas } from './alternativas'
import type { CartaoAssociacao } from './types'
import { validar } from './validar'

const c: CartaoAssociacao = {
  id: 'a', tipo: 'associacao', tema: 't', frente: 'Capital do Brasil?',
  opcoes: ['Rio', 'Brasília', 'Salvador', 'Recife', 'Belém', 'Natal', 'Manaus'],
  correta: 1,
  outrasFormas: ['A cidade de Brasília'],
}

describe('alternativas que mudam', () => {
  it('mostra 4: uma forma da certa e 3 erradas diferentes', () => {
    for (let i = 0; i < 200; i++) {
      const { opcoes, correta } = sortearAlternativas(c)
      expect(opcoes).toHaveLength(4)
      expect(new Set(opcoes).size).toBe(4)
      expect(['Brasília', 'A cidade de Brasília']).toContain(opcoes[correta])
      expect(opcoes.filter((o) => o.includes('Brasília'))).toHaveLength(1)
    }
  })
  it('alterna as formas da certa e varia as erradas', () => {
    const certas = new Set<string>()
    const erradas = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const { opcoes, correta } = sortearAlternativas(c)
      certas.add(opcoes[correta])
      opcoes.forEach((o, k) => k !== correta && erradas.add(o))
    }
    expect(certas.size).toBe(2)
    expect(erradas.size).toBe(6)
  })
  it('cartão antigo (4 opções, sem outras formas) continua igual, só embaralhado', () => {
    const v = { ...c, opcoes: ['a', 'b', 'c', 'd'], correta: 2, outrasFormas: undefined }
    const { opcoes, correta } = sortearAlternativas(v)
    expect([...opcoes].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(opcoes[correta]).toBe('c')
  })
  it('validador recusa outra forma igual a uma opção', () => {
    const b = { id: 'b', titulo: 'B', versao: 1, temas: [{ id: 't', nome: 'T' }], cartoes: [{ ...c, outrasFormas: ['Rio'] }] }
    expect(validar(b).join()).toMatch(/outra forma/)
    expect(validar({ ...b, cartoes: [c] })).toEqual([])
  })
})
