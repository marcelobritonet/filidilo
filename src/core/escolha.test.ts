import { describe, expect, it } from 'vitest'
import { cartoesDoRecorte, temLinhaFavoritos } from './escolha'
import type { Cartao } from './types'

const c = (id: string, tema: string, fav = false, tipo: 'vf' | 'calculo' = 'vf'): Cartao =>
  (tipo === 'vf' ? { id, tipo, tema, frente: 'x', resposta: true, ...(fav && { favoritoEm: 1 }) } : { id, tipo, tema, enunciado: 'x', variaveis: {}, resposta: 'x', ...(fav && { favoritoEm: 1 }) }) as Cartao

describe('Como estudar?', () => {
  it('a linha de favoritos só aparece a partir de 5', () => {
    expect(temLinhaFavoritos(4)).toBe(false)
    expect(temLinhaFavoritos(5)).toBe(true)
  })
  it('com só favoritos, os temas marcados não importam; sem, valem os temas', () => {
    const cs = [c('1', 'a', true), c('2', 'a'), c('3', 'b', true), c('4', 'b', true, 'calculo')]
    expect(cartoesDoRecorte(cs, { temas: [], soFavoritos: true, filtro: 'tudo' }).map((x) => x.id)).toEqual(['1', '3', '4'])
    expect(cartoesDoRecorte(cs, { temas: ['a'], soFavoritos: true, filtro: 'teoria' }).map((x) => x.id)).toEqual(['1', '3'])
    expect(cartoesDoRecorte(cs, { temas: ['a'], soFavoritos: false, filtro: 'tudo' }).map((x) => x.id)).toEqual(['1', '2'])
  })
})
