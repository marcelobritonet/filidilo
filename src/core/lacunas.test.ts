import { describe, expect, it } from 'vitest'
import { contarLacunas, formasAceitas, fraseCompleta, NIVEIS_COM_ALTERNATIVAS } from './lacunas'
import { validar } from './validar'
import type { Baralho } from './types'

const base = (cartoes: Baralho['cartoes']): Baralho => ({ id: 'b', titulo: 'T', versao: 1, temas: [{ id: 't', nome: 'Tema' }], cartoes })

describe('lacunas', () => {
  it('conta e completa as lacunas', () => {
    expect(contarLacunas('A Terra gira em torno do ____.')).toBe(1)
    expect(contarLacunas('sem lacuna')).toBe(0)
    expect(fraseCompleta('A ____ gira em torno do ____.', ['Terra', 'Sol/astro-rei'])).toBe('A Terra gira em torno do Sol.')
  })

  it('aceita sinônimos separados por /', () => {
    expect(formasAceitas('Sol/astro-rei')).toEqual(['Sol', 'astro-rei'])
  })

  it('níveis fáceis são os iniciais', () => {
    expect(NIVEIS_COM_ALTERNATIVAS).toEqual(['zero', 'iniciante', 'nocoes'])
  })

  it('valida frase sem lacuna, número de respostas e resposta vazia', () => {
    const ok = base([{ id: 'a', tipo: 'lacunas', tema: 't', frente: 'A Terra gira em torno do ____.', respostas: ['Sol'] }])
    expect(validar(ok)).toEqual([])
    const semLacuna = base([{ id: 'a', tipo: 'lacunas', tema: 't', frente: 'Sem marcador', respostas: ['x'] }])
    expect(validar(semLacuna)).toContain('a: sem lacuna: use ____ no texto')
    const faltando = base([{ id: 'a', tipo: 'lacunas', tema: 't', frente: '____ e ____', respostas: ['x'] }])
    expect(validar(faltando)).toContain('a: 2 lacuna(s) pedem 2 resposta(s)')
    const vazia = base([{ id: 'a', tipo: 'lacunas', tema: 't', frente: 'Algo ____', respostas: [' '] }])
    expect(validar(vazia)).toContain('a: resposta de lacuna vazia')
  })
})
