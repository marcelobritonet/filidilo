import { describe, expect, it } from 'vitest'
import { DURACAO, FASES, PENAS, diaLocal, quadro, tocarDanca } from './danca'

const abertura = (t: number) => {
  const q = quadro(t)
  return q.penas[PENAS - 1].angulo - q.penas[0].angulo
}

describe('linha do tempo da abertura', () => {
  it('começa com o feixe fechado, abaixo e inclinado, sem o nome', () => {
    const q = quadro(0)
    expect(abertura(0)).toBeLessThan(10)
    expect(q.subida).toBeGreaterThan(50)
    expect(Math.abs(q.anguloFeixe)).toBeGreaterThan(20)
    expect(q.opacidadeNome).toBe(0)
  })

  it('o feixe balança para os dois lados enquanto sobe', () => {
    const angulos = Array.from({ length: 12 }, (_, i) => quadro((i / 12) * FASES.balanco).anguloFeixe)
    expect(angulos.some((a) => a > 5)).toBe(true)
    expect(angulos.some((a) => a < -5)).toBe(true)
  })

  it('abre o leque até ±68° depois do balanço', () => {
    const q = quadro(FASES.abertura + 1)
    expect(q.penas[0].angulo).toBeCloseTo(-68, -1)
    expect(q.penas[PENAS - 1].angulo).toBeCloseTo(68, -1)
    expect(q.penas[0].escala).toBeLessThan(1)
  })

  it('no fim todas as penas ficam no centro, retas e no tamanho do símbolo, com o nome visível', () => {
    for (const t of [FASES.fechamento, DURACAO, DURACAO + 1000]) {
      const q = quadro(t)
      expect(q.anguloFeixe).toBe(0)
      expect(q.subida).toBe(0)
      expect(q.escalaFeixe).toBe(1)
      for (const p of q.penas) {
        expect(p.angulo).toBeCloseTo(0, 6)
        expect(p.escala).toBeCloseTo(1, 6)
      }
    }
    expect(quadro(DURACAO).opacidadeNome).toBe(1)
  })
})

describe('quando tocar a dança', () => {
  it('só na primeira abertura do dia e nunca com reduzir movimento', () => {
    expect(tocarDanca(null, '2026-11-22', false)).toBe(true)
    expect(tocarDanca('2026-11-21', '2026-11-22', false)).toBe(true)
    expect(tocarDanca('2026-11-22', '2026-11-22', false)).toBe(false)
    expect(tocarDanca(null, '2026-11-22', true)).toBe(false)
  })

  it('usa a data local', () => {
    expect(diaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
