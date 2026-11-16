import { describe, expect, it } from 'vitest'
import type { Cartao } from '../types'
import { jaCobertos, LIMITE_COBERTOS, resumoCartao } from './cobertos'

const conceito = (id: string, tema: string, frente: string): Cartao => ({ id, tipo: 'conceito', tema, frente, verso: 'x' })
const temas = [{ id: 'din', nome: 'Dinâmica' }, { id: 'cin', nome: 'Cinemática' }]

describe('resumo do que o baralho já cobre', () => {
  it('tira pontuação, $…$ e **, as palavras vazias, e mantém a grafia com acento', () => {
    expect(resumoCartao(conceito('a', 'din', 'Qual a unidade de força no **SI**?'))).toBe('unidade força SI')
  })

  it('usa o título no cálculo e corta em 5 palavras', () => {
    const calc: Cartao = {
      id: 'k', tipo: 'calculo', tema: 'din', titulo: 'Aceleração média do bloco em plano inclinado', enunciado: '', parametros: {}, etapas: [],
    }
    expect(resumoCartao(calc)).toBe('Aceleração média bloco plano inclinado')
  })

  it('tira fórmulas entre $…$', () => {
    expect(resumoCartao(conceito('b', 'din', 'Qual o valor de $F = m a$ para a força?'))).toBe('valor força')
  })
})

describe('jaCobertos', () => {
  it('baralho sem cartões → vazio', () => {
    expect(jaCobertos({ temas, cartoes: [] })).toBe('')
  })

  it('uma linha por tema, sem repetidos', () => {
    const r = jaCobertos({
      temas,
      cartoes: [
        conceito('1', 'din', 'Qual a unidade de força no **SI**?'),
        conceito('2', 'din', 'Qual é a unidade de força no SI?'),
        conceito('3', 'din', 'Enunciado da segunda lei de Newton'),
        conceito('4', 'cin', 'O que é velocidade média?'),
      ],
    })
    expect(r).toBe('Dinâmica: unidade força SI; Enunciado segunda lei Newton\nCinemática: velocidade média')
  })

  it('passando de 3.000 caracteres, fica o mais recente e termina com "(e mais N)"', () => {
    const cartoes = Array.from({ length: 300 }, (_, i) => conceito(`c${i}`, 'din', `Termo${i} aspecto${i} detalhe`))
    const r = jaCobertos({ temas, cartoes })
    expect(r.length).toBeLessThanOrEqual(LIMITE_COBERTOS)
    const m = r.match(/\(e mais (\d+)\)$/)
    expect(m).not.toBeNull()
    const incluidos = r.split('Termo').length - 1
    expect(incluidos + Number(m![1])).toBe(300)
    expect(r).toContain('Termo299 aspecto299 detalhe')
    expect(r).not.toContain('Termo0 ')
  })

  it('sem limite estourado, não tem sufixo', () => {
    expect(jaCobertos({ temas, cartoes: [conceito('1', 'cin', 'O que é velocidade média?')] })).not.toMatch(/e mais/)
  })
})
