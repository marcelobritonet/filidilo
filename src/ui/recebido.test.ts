import { afterEach, describe, expect, it, vi } from 'vitest'
import { atualizarSozinho, chegouAlgo } from './recebido'

describe('atualizar sozinho', () => {
  it('na tela inicial, aplica a versão nova sem perguntar', () => {
    expect(atualizarSozinho({ atualizar: true, naInicial: true, recebeu: false })).toBe(true)
  })
  it('fora da tela inicial, só avisa', () => {
    expect(atualizarSozinho({ atualizar: true, naInicial: false, recebeu: false })).toBe(false)
  })
  it('se o app abriu trazendo um baralho, não recarrega (perderia o baralho)', () => {
    expect(atualizarSozinho({ atualizar: true, naInicial: true, recebeu: true })).toBe(false)
  })
  it('sem versão nova, nada', () => {
    expect(atualizarSozinho({ atualizar: false, naInicial: true, recebeu: false })).toBe(false)
  })
})

describe('chegouAlgo', () => {
  afterEach(() => vi.unstubAllGlobals())
  const em = (search: string) => vi.stubGlobal('location', { search })
  it('reconhece link e compartilhamento', () => {
    em('?b=abc')
    expect(chegouAlgo()).toBe(true)
    em('?receber=1')
    expect(chegouAlgo()).toBe(true)
    em('?teste=1')
    expect(chegouAlgo()).toBe(false)
  })
})
