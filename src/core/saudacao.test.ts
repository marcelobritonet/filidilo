import { describe, expect, it } from 'vitest'
import { fraseDoDia, saudacao } from './saudacao'

const as = (h: number, m = 0) => new Date(2026, 10, 24, h, m)

describe('saudacao', () => {
  it('muda nos limites de hora', () => {
    expect(saudacao(as(4, 59))).toBe('Boa noite')
    expect(saudacao(as(5))).toBe('Bom dia')
    expect(saudacao(as(11, 59))).toBe('Bom dia')
    expect(saudacao(as(12))).toBe('Boa tarde')
    expect(saudacao(as(17, 59))).toBe('Boa tarde')
    expect(saudacao(as(18))).toBe('Boa noite')
  })
})

describe('fraseDoDia', () => {
  const base = { hojeFeito: false, sequencia: 0 }
  it('sem baralhos convida a começar', () => {
    expect(fraseDoDia({ ...base, baralhos: [] }, as(9))).toBe('Que tal aprender uma coisa nova hoje?')
  })
  it('estudou hoje vem antes dos cartões para revisar', () => {
    const baralhos = [{ titulo: 'One Piece', revisar: 11 }]
    expect(fraseDoDia({ baralhos, hojeFeito: true, sequencia: 1 }, as(9))).toBe('Hoje já está garantido. Bom trabalho!')
    expect(fraseDoDia({ baralhos, hojeFeito: true, sequencia: 4 }, as(9))).toBe('Hoje já está garantido: 4 dias seguidos. Bom trabalho!')
  })
  it('aponta o baralho com mais cartões para revisar', () => {
    const baralhos = [{ titulo: 'A', revisar: 3 }, { titulo: 'One Piece', revisar: 11 }]
    expect(fraseDoDia({ ...base, baralhos }, as(9))).toBe('11 cartões para revisar hoje em One Piece.')
    expect(fraseDoDia({ ...base, baralhos: [{ titulo: 'A', revisar: 1 }] }, as(9))).toBe('1 cartão para revisar hoje em A.')
  })
  it('sem nada para revisar, frase pela hora', () => {
    const baralhos = [{ titulo: 'A', revisar: 0 }]
    expect(fraseDoDia({ ...base, baralhos }, as(9))).toBe('Tenha uma manhã boa de estudo.')
    expect(fraseDoDia({ ...base, baralhos }, as(14))).toBe('Tenha uma tarde boa de estudo.')
    expect(fraseDoDia({ ...base, baralhos }, as(22))).toBe('Tenha uma noite boa de estudo.')
  })
})
