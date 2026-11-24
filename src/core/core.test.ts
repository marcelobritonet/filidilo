import { describe, expect, it } from 'vitest'
import { confere, formatar, lerNumero, preencher, sortear } from './calc'
import { avaliar } from './expr'
import { filaEspacada, filaProva, intercalar } from './fila'
import type { Estado } from './db'
import type { Baralho, CartaoCalculo } from './types'

describe('expr', () => {
  it('respeita precedência e potência à direita', () => {
    expect(avaliar('2*Cb*V^2/100', { Cb: 0.8, V: 10 })).toBeCloseTo(1.6)
    expect(avaliar('-2^2', {})).toBe(-4)
    expect(avaliar('2^3^2', {})).toBe(512)
    expect(avaliar('sqrt(50*S/Cb)', { S: 1, Cb: 0.8 })).toBeCloseTo(7.9057, 3)
    expect(avaliar('se(x < 0, 0, 1)', { x: -1 })).toBe(0)
    expect(avaliar('5*x/sqrt(Re)', { x: 0.1, Re: 83459 })).toBeCloseTo(0.001731, 5)
    expect(avaliar('1.33e-5*2', {})).toBeCloseTo(2.66e-5)
  })
  it('recusa código e variáveis desconhecidas', () => {
    expect(() => avaliar('constructor', {})).toThrow()
    expect(() => avaliar('alert(1)', {})).toThrow()
    expect(() => avaliar('a;b', { a: 1, b: 1 })).toThrow()
    expect(() => avaliar('__proto__', {})).toThrow()
  })
})

describe('calc', () => {
  it('lê números no formato brasileiro', () => {
    expect(lerNumero('1,6')).toBe(1.6)
    expect(lerNumero(' 1.234,5 ')).toBe(1234.5)
    expect(lerNumero('8,4e4')).toBe(84000)
    expect(lerNumero('1,33x10^-5')).toBeCloseTo(1.33e-5)
    expect(lerNumero('abc')).toBeNull()
    expect(lerNumero('')).toBeNull()
  })
  it('confere com tolerância relativa ou de uma casa', () => {
    expect(confere(1.6, 1.6)).toBe(true)
    expect(confere(1.62, 1.6)).toBe(true)
    expect(confere(1.7, 1.6)).toBe(false)
    expect(confere(0.01, 0.003, 2)).toBe(true)
  })
  it('formata em pt-BR', () => {
    expect(formatar(1.6, 2)).toBe('1,6')
    expect(formatar(83459, 0)).toBe('83.459')
    expect(formatar(1.33e-5, 2)).toBe('1,33·10⁻⁵')
    expect(formatar(5e5, 1)).toBe('5·10⁵')
  })
  it('sorteia respeitando passo e condição', () => {
    const c: CartaoCalculo = {
      id: 't', tipo: 'calculo', tema: 'x', titulo: 't', enunciado: 'Cb={Cb}, local {L}',
      parametros: { Cb: { min: 0.6, max: 0.8, passo: 0.05 }, L: { opcoes: [{ valor: 1, rotulo: 'aberto' }, { valor: 2, rotulo: 'canal' }] } },
      condicao: 'Cb > 0.65',
      etapas: [{ pergunta: 'S', expr: 'L*Cb', resolucao: ['{resultado:2}'], nome: 'S' }],
    }
    for (let i = 0; i < 100; i++) {
      const s = sortear(c)
      expect([0.7, 0.75, 0.8]).toContain(s.vars.Cb)
      expect(preencher(c.enunciado, s)).toMatch(/Cb=0,(7|75|8), local (aberto|canal)/)
      expect(s.respostas[0]).toBeCloseTo(s.vars.L * s.vars.Cb)
    }
  })
})

describe('fila do modo prova', () => {
  const b: Baralho = {
    id: 'b', titulo: 'b', versao: 1,
    temas: [{ id: 'p', nome: 'P' }, { id: 'o', nome: 'O' }],
    cartoes: [
      { id: 'p1', tipo: 'vf', tema: 'p', frente: 'x', resposta: true },
      { id: 'p2', tipo: 'vf', tema: 'p', frente: 'x', resposta: true },
      { id: 'o1', tipo: 'vf', tema: 'o', frente: 'x', resposta: true },
      { id: 'o2', tipo: 'vf', tema: 'o', frente: 'x', resposta: true },
    ],
  }
  const futuro = new Date(Date.now() + 86400000)
  const passado = new Date(Date.now() - 86400000)
  const est = (id: string, nota: 1 | 3, due = futuro): [string, Estado] => [`b/${id}`, { id: `b/${id}`, ultimaNota: nota, ultimaData: 1, acertos: 0, erros: 0, fsrs: { due } as Estado['fsrs'] }]
  it('ordem única: errados, vencidos hoje, nunca vistos e por último os acertados', () => {
    const f = filaProva(b, new Map([est('o2', 1), est('p1', 3), est('o1', 3, passado)]))
    expect(f.map((c) => c.id)).toEqual(['o2', 'o1', 'p2', 'p1'])
  })
  it('intercala um nunca visto a cada 3 cartões, mesmo com muitos errados', () => {
    const grande: Baralho = {
      ...b,
      temas: [{ id: 't', nome: 'T' }],
      cartoes: Array.from({ length: 15 }, (_, i) => ({ id: `c${i}`, tipo: 'vf' as const, tema: 't', frente: 'x', resposta: true })),
    }
    const errados = new Map(Array.from({ length: 10 }, (_, i) => est(`c${i}`, 1)))
    const f = filaProva(grande, errados, { tamanho: 9 })
    const novo = f.map((c) => !errados.has(`b/${c.id}`))
    expect(novo).toEqual([false, false, true, false, false, true, false, false, true])
  })
  it('sem nada para revisar, só nunca vistos; com soNovos, só os sem estado', () => {
    expect(filaProva(b, new Map()).length).toBe(4)
    const f = filaProva(b, new Map([est('o2', 1), est('p1', 3)]), { soNovos: true })
    expect(f.map((c) => c.id).sort()).toEqual(['o1', 'p2'])
  })
  it('cartão arquivado não entra em nenhuma fila', () => {
    const comArquivado: Baralho = { ...b, cartoes: b.cartoes.map((c) => (c.id === 'o2' || c.id === 'p2' ? { ...c, arquivadoEm: 1 } : c)) }
    const estados = new Map([est('o2', 1), est('p1', 3, passado)])
    expect(filaProva(comArquivado, estados).map((c) => c.id).sort()).toEqual(['o1', 'p1'])
    expect(filaProva(comArquivado, estados, { soNovos: true }).map((c) => c.id)).toEqual(['o1'])
    expect(filaEspacada(comArquivado, estados).map((c) => c.id).sort()).toEqual(['o1', 'p1'])
  })
  it('intercalar: sobra de uma lista vai no fim', () => {
    expect(intercalar(['r1'], ['n1', 'n2', 'n3'], 3)).toEqual(['r1', 'n1', 'n2', 'n3'])
    expect(intercalar(['r1', 'r2', 'r3', 'r4'], ['n1'], 3)).toEqual(['r1', 'r2', 'n1', 'r3', 'r4'])
  })
})
