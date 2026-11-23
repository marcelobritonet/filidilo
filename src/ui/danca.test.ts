import { describe, expect, it } from 'vitest'
import { DURACAO, DURACAO_COMEMORACAO, FASES, FASES_COMEMORACAO, PENAS, quadro, quadroComemoracao, tocarDanca } from './danca'

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

describe('comemoração do fim da sessão', () => {
  const aberturaC = (t: number) => {
    const q = quadroComemoracao(t)
    return q.penas[PENAS - 1].angulo - q.penas[0].angulo
  }

  it('começa fechada e abaixo, sem o nome', () => {
    const q = quadroComemoracao(0)
    expect(aberturaC(0)).toBeLessThan(10)
    expect(q.subida).toBeGreaterThan(50)
    expect(q.opacidadeNome).toBe(0)
  })

  it('abre o leque até ±68° e sacode as penas por mais tempo que a abertura', () => {
    expect(quadroComemoracao(FASES_COMEMORACAO.abertura + 1).penas[0].angulo).toBeCloseTo(-68, -1)
    expect(FASES_COMEMORACAO.tremor - FASES_COMEMORACAO.abertura).toBeGreaterThan(FASES.tremor - FASES.abertura)
    const meio = (FASES_COMEMORACAO.abertura + FASES_COMEMORACAO.tremor) / 2
    const desvios = Array.from({ length: 20 }, (_, i) => quadroComemoracao(meio + i * 10).penas[4].angulo)
    expect(Math.max(...desvios) - Math.min(...desvios)).toBeGreaterThan(0.5)
  })

  it('termina com o leque aberto e parado', () => {
    for (const t of [DURACAO_COMEMORACAO, DURACAO_COMEMORACAO + 500, DURACAO_COMEMORACAO + 5000]) {
      const q = quadroComemoracao(t)
      expect(q.penas[0].angulo).toBeCloseTo(-68, 6)
      expect(q.penas[PENAS - 1].angulo).toBeCloseTo(68, 6)
      expect(q.penas[4].angulo).toBeCloseTo(0, 6)
      expect(q.subida).toBe(0)
    }
  })
})

describe('quando tocar a dança', () => {
  it('em toda abertura, menos com reduzir movimento', () => {
    expect(tocarDanca(false)).toBe(true)
    expect(tocarDanca(true)).toBe(false)
  })
})
