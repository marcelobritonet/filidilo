import { describe, expect, it } from 'vitest'
import { resolver } from '../core/calc'
import type { CartaoCalculo } from '../core/types'
import { hidrodinamica } from './carregar'

const calc = (id: string) => hidrodinamica.cartoes.find((c) => c.id === id) as CartaoCalculo
const r = (id: string, vars: Record<string, number>) => resolver(calc(id), { ...vars })

// Conferência dos geradores contra exemplos resolvidos das apostilas e do simulado 01.
describe('gabaritos', () => {
  it('globo da morte (apostila 2.5 p.10): R = 3,6, g = 10 → 6 m/s', () => {
    expect(r('cc-c01', { R: 3.6, g: 10 })[0]).toBeCloseTo(6, 6)
  })
  it('simulado 01, 1b: esfera 2 kg, R 0,5, 120 rpm', () => {
    const [w, ac, T] = r('cc-c02', { m: 2, R: 0.5, rpm: 120 })
    expect(w).toBeCloseTo(12.566, 2)
    expect(ac).toBeCloseTo(78.96, 1)
    expect(T).toBeCloseTo(157.9, 0)
  })
  it('simulado 01, 1c com g = 10: lombada 1000 kg, R 20, 10 m/s → N = 5000 N', () => {
    expect(r('cc-c03', { m: 1000, R: 20, V: 10, lugar: 1 })[1]).toBeCloseTo(5000, 6)
  })
  it('squat (apostila 2.6 p.7): Cb 0,8, 10 nós, canal → 1,6 m', () => {
    expect(r('sq-c01', { Cb: 0.8, V: 10, local: 2 })[0]).toBeCloseTo(1.6, 6)
  })
  it('simulado 01, problema 2 (squat e folga)', () => {
    // calado 12, P 11,5 (dP = −0,5), M 1,8, V 9, Cb 0,82, folga mínima 0,5
    const [S, fe, fd, encalha, Vmax, trim] = r('sq-c02', { Cb: 0.82, calado: 12, dP: -0.5, M: 1.8, V: 9, margem: 0.5 })
    expect(S).toBeCloseTo(1.328, 3)
    expect(fe).toBeCloseTo(1.3, 6)
    expect(fd).toBeCloseTo(-0.028, 3)
    expect(encalha).toBe(0) // "Sim, encalha"
    expect(Vmax).toBeCloseTo(6.98, 2)
    expect(trim).toBe(0) // proa
  })
  it('simulado 01, problema 3 (Pitot na lancha): x = 20 cm, 1 e 2 m/s', () => {
    const [Re1, Re2, regime, d1, d2, haste, xcr] = r('cl-c01', { xcm: 20, V1: 1, dV: 1 })
    expect(Re1).toBeCloseTo(2e5, 0)
    expect(Re2).toBeCloseTo(4e5, 0)
    expect(regime).toBe(0)
    expect(d1).toBeCloseTo(2.236, 3)
    expect(d2).toBeCloseTo(1.581, 3)
    expect(haste).toBeCloseTo(2.236, 3)
    expect(xcr).toBeCloseTo(0.25, 6)
  })
  it('Pitot no dirigível (PUC-Rio ex. 1): 10 cm, 40 km/h → δ ≈ 1,7 mm', () => {
    const [V, Re, d] = r('cl-c02', { xcm: 10, Vmin: 40, Vmax: 160 })
    expect(V).toBeCloseTo(11.11, 2)
    expect(Re).toBeCloseTo(8.35e4, -2)
    expect(d).toBeCloseTo(1.73, 2)
  })
  it('Froude (planilha 1.13): b 4, y 1,2, V 2,8 → Fr ≈ 0,82', () => {
    expect(r('re-c03', { b: 4, y: 1.2, V: 2.8 })[2]).toBeCloseTo(0.816, 2)
  })
  it('Cmr: P 10, M 1, areia 5% → 10,45 m', () => {
    expect(r('ma-c01', { P: 10, M: 1, fundo: 0.05, d: 0 })[1]).toBeCloseTo(10.45, 6)
  })
})
