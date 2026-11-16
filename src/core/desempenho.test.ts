import { describe, expect, it } from 'vitest'
import { normalizarNivel } from './types'
import { decidir, MINIMO } from './desempenho'
import type { Nota } from './db'

const n = (q: number, nota: Nota) => Array.from({ length: q }, () => nota)

describe('sugestão de nível pelo desempenho recente', () => {
  it('poucas respostas: não sugere nada', () => {
    const a = decidir(n(MINIMO - 1, 1), 'bastante')
    expect(a.sugestao).toBe('manter')
    expect(a.nivel).toBe('bastante')
  })

  it('errou demais: sugere um nível abaixo', () => {
    const a = decidir([...n(10, 1), ...n(5, 3)], 'bastante')
    expect(a.sugestao).toBe('descer')
    expect(a.nivel).toBe('nocoes')
  })

  it('acertou quase tudo e a maioria veio fácil: sugere subir', () => {
    const a = decidir([...n(12, 4), ...n(3, 3)], 'nocoes')
    expect(a.sugestao).toBe('subir')
    expect(a.nivel).toBe('bastante')
  })

  it('acertou bem mas sem ser fácil: mantém', () => {
    const a = decidir([...n(10, 3), ...n(5, 4)], 'nocoes')
    expect(a.sugestao).toBe('manter')
  })

  it('no limite de baixo não desce; no de cima não sobe', () => {
    expect(decidir(n(20, 1), 'zero')).toMatchObject({ sugestao: 'manter', nivel: 'zero' })
    expect(decidir(n(20, 4), 'extremo')).toMatchObject({ sugestao: 'manter', nivel: 'extremo' })
  })

  it('sem nível no baralho: não sugere', () => {
    expect(decidir(n(20, 1), undefined).sugestao).toBe('manter')
  })

  it('nível antigo, já convertido, desce a partir do novo valor', () => {
    expect(decidir(n(20, 1), normalizarNivel('avancado'))).toMatchObject({ sugestao: 'descer', nivel: 'nocoes' })
  })
})
