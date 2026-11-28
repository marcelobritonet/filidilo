import { describe, expect, it } from 'vitest'
import { contarTipos, distribuirTipos, textoProporcaoExata, textoProporcaoPorcentagem } from './proporcao'
import type { Cartao } from '../types'

describe('proporção dos tipos (P141)', () => {
  it('15 cartões sem contas: 5 alternativas, 4 V/F, 2 lacunas, 2 colunas, 2 abertas', () => {
    expect(distribuirTipos(15, false)).toEqual([['associacao', 5], ['vf', 4], ['lacunas', 2], ['colunas', 2], ['conceito', 2]])
  })
  it('soma sempre a quantidade pedida, com e sem contas', () => {
    for (const q of [1, 5, 10, 15, 20, 30, 40]) {
      for (const c of [false, true]) expect(distribuirTipos(q, c).reduce((s, [, n]) => s + n, 0)).toBe(q)
    }
  })
  it('a pergunta aberta nunca passa de 15% (arredondando)', () => {
    for (const q of [10, 20, 40]) {
      const aberta = distribuirTipos(q, false).find(([t]) => t === 'conceito')?.[1] ?? 0
      expect(aberta).toBeLessThanOrEqual(Math.ceil(q * 0.15))
    }
  })
  it('com contas entra cálculo, e o texto diz o que trocar se não houver', () => {
    expect(distribuirTipos(20, true)).toEqual([['associacao', 5], ['vf', 4], ['lacunas', 3], ['colunas', 2], ['conceito', 3], ['calculo', 3]])
    const t = textoProporcaoExata(20, true)
    expect(t).toContain('Por tipo, exatamente: 5 "associacao", 4 "vf", 3 "lacunas", 2 "colunas", 3 "conceito" e 3 "calculo".')
    expect(t).toContain('troque os "calculo" por "associacao"')
    expect(t).toContain('troque os "colunas" por "associacao"')
    expect(textoProporcaoExata(15, false)).not.toContain('calculo')
  })
  it('sem quantidade: porcentagens com teto para a aberta', () => {
    expect(textoProporcaoPorcentagem(false)).toContain('35% "associacao", 25% "vf", 15% "lacunas", 10% "colunas" e 15% "conceito"')
    expect(textoProporcaoPorcentagem(false)).toContain('nunca passa de 15%')
  })
  it('conta os tipos para a telemetria', () => {
    const c = (tipo: string) => ({ tipo }) as Cartao
    expect(contarTipos([c('vf'), c('vf'), c('colunas')])).toEqual({ tipo_vf: 2, tipo_colunas: 1 })
  })
})
