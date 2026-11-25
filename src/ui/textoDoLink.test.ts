import { describe, expect, it } from 'vitest'
import { textoDoLink } from './EnviarModal'

describe('textoDoLink', () => {
  it('baralho: convite com o nome e quantos cartões, sem prazo', () => {
    expect(textoDoLink({ o_que: 'baralho', nomeBaralho: 'Química', cartoes: 24, progresso: false })).toBe('Bora estudar Química comigo? São 24 cartões no Filidilo.')
    expect(textoDoLink({ o_que: 'baralho', nomeBaralho: 'X', cartoes: 1, progresso: false })).toBe('Bora estudar X comigo? É 1 cartão no Filidilo.')
  })
  it('com o progresso, sem o convite', () => {
    expect(textoDoLink({ o_que: 'baralho', nomeBaralho: 'Química', cartoes: 24, progresso: true })).toBe('Química no Filidilo, com o meu progresso.')
  })
  it('cartão', () => {
    expect(textoDoLink({ o_que: 'cartao', nomeBaralho: 'Química', cartoes: 1, progresso: false })).toBe('Consegue responder este cartão do Filidilo?')
  })
})
