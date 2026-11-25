import { describe, expect, it } from 'vitest'
import { confere, formatar, lerNumero, preencher, sortear } from './calc'
import { avaliar } from './expr'
import { filaEspacada, filaProva, posicaoReinsercao } from './fila'
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
  /** Gerador previsível para os testes (LCG). */
  const semente = (n: number) => () => ((n = (n * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
  const um = (n: number, tema = 't') => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, tipo: 'vf' as const, tema, frente: 'x', resposta: true }))
  it('nunca vistos e o que precisa revisar vêm antes dos acertados que não venceram', () => {
    const f = filaProva(b, new Map([est('o2', 1), est('p1', 3), est('o1', 3, passado)]))
    expect(f.map((c) => c.id)).toEqual(['p2', 'o2', 'o1', 'p1'])
  })
  it('alterna um a um nunca visto e revisão, a começar pelo nunca visto', () => {
    const grande: Baralho = { ...b, temas: [{ id: 't', nome: 'T' }], cartoes: um(15) }
    const errados = new Map(Array.from({ length: 10 }, (_, i) => est(`c${i}`, 1)))
    const f = filaProva(grande, errados, { tamanho: 12 })
    const novo = f.map((c) => !errados.has(`b/${c.id}`))
    expect(novo).toEqual([true, false, true, false, true, false, true, false, true, false, false, false])
  })
  it('acertados só entram depois de acabarem os nunca vistos', () => {
    const grande: Baralho = { ...b, temas: [{ id: 't', nome: 'T' }], cartoes: um(20) }
    const acertados = new Map(Array.from({ length: 10 }, (_, i) => est(`c${i}`, 3)))
    const f = filaProva(grande, acertados, { tamanho: 20 })
    expect(f.slice(0, 10).every((c) => !acertados.has(`b/${c.id}`))).toBe(true)
  })
  it('os temas se revezam: nunca dois seguidos do mesmo tema quando há outro', () => {
    const tres: Baralho = {
      ...b,
      temas: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' }],
      cartoes: (['a', 'b', 'c'] as const).flatMap((t) => um(6, t).map((c) => ({ ...c, id: `${t}${c.id}` }))),
    }
    const estados = new Map([...['ac0', 'bc0', 'cc0'].map((id) => est(id, 1)), ...['ac1', 'bc1', 'cc1'].map((id) => est(id, 3))])
    for (let s = 1; s <= 20; s++) {
      const f = filaProva(tres, estados, { tamanho: 18 }, semente(s))
      expect(f).toHaveLength(18)
      for (let i = 1; i < f.length; i++) expect(f[i].tema).not.toBe(f[i - 1].tema)
    }
  })
  it('acertados: os de dias atrás primeiro, sorteados dentro do mesmo dia', () => {
    const grande: Baralho = { ...b, temas: [{ id: 't', nome: 'T' }], cartoes: um(10) }
    const hoje = Date.now()
    const estados = new Map(
      Array.from({ length: 10 }, (_, i) => {
        const [k, e] = est(`c${i}`, 3)
        return [k, { ...e, ultimaData: i === 9 ? hoje - 3 * 86400000 : hoje - i * 1000 }] as [string, Estado]
      }),
    )
    const ordens = new Set<string>()
    for (let s = 1; s <= 10; s++) {
      const f = filaProva(grande, estados, {}, semente(s), hoje)
      expect(f[0].id).toBe('c9')
      ordens.add(f.map((c) => c.id).join())
    }
    expect(ordens.size).toBeGreaterThan(1)
  })
  it('errado volta depois de 6 a 10 cartões, sem passar do fim', () => {
    for (let s = 1; s <= 30; s++) {
      const p = posicaoReinsercao(4, 100, semente(s))
      expect(p).toBeGreaterThanOrEqual(10)
      expect(p).toBeLessThanOrEqual(14)
    }
    expect(posicaoReinsercao(4, 7)).toBe(7)
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
})
