import { describe, expect, it } from 'vitest'
import { infoNivel, NIVEIS, normalizarNivel } from './types'

describe('níveis de conhecimento', () => {
  it('são seis, do menos para o mais', () => {
    expect(NIVEIS.map((n) => n.valor)).toEqual(['zero', 'iniciante', 'nocoes', 'bastante', 'expert', 'extremo'])
  })

  it('valores antigos viram os novos', () => {
    expect(normalizarNivel('iniciante')).toBe('iniciante')
    expect(normalizarNivel('intermediario')).toBe('nocoes')
    expect(normalizarNivel('avancado')).toBe('bastante')
    expect(normalizarNivel('qualquer')).toBeUndefined()
    expect(normalizarNivel(undefined)).toBeUndefined()
  })

  it('infoNivel acha o texto mesmo para valor antigo', () => {
    expect(infoNivel('avancado')?.nome).toBe('Já sei bastante')
  })
})
