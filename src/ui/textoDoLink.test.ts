import { describe, expect, it } from 'vitest'
import { textoDoLink } from './EnviarModal'

describe('textoDoLink', () => {
  it('baralho traz o nome e quantos cartões', () => {
    expect(textoDoLink({ o_que: 'baralho', titulo: 'Baralho “Química”', cartoes: 24 }, '16:48')).toBe('Baralho “Química” no Filidilo, com 24 cartões: toque para estudar. O link vale até 16:48.')
    expect(textoDoLink({ o_que: 'baralho', titulo: 'Baralho “X”', cartoes: 1 }, '09:00')).toContain('com 1 cartão:')
  })
  it('cartão usa só o título', () => {
    expect(textoDoLink({ o_que: 'cartao', titulo: 'Cartão do Filidilo', cartoes: 1 }, '10:00')).toBe('Cartão do Filidilo: toque para abrir. O link vale até 10:00.')
  })
})
