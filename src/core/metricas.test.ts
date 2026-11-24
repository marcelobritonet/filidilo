import { describe, expect, it } from 'vitest'
import { faixa, origemBaralho, plataforma, tamanhoTela } from './metricas'
import type { Baralho, Cartao } from './types'

const cartao = (origem?: Cartao['origem']): Cartao => ({ id: Math.random().toString(36), tipo: 'conceito', tema: 't', frente: 'f', verso: 'v', origem })
const baralho = (b: Partial<Baralho>): Baralho => ({ id: 'x', titulo: 'X', versao: 1, temas: [], cartoes: [], ...b })

describe('métricas das estatísticas', () => {
  it('faixa', () => {
    const l = [1, 7, 30]
    expect([0, 1, 2, 7, 8, 30, 31].map((n) => faixa(n, l))).toEqual(['0', '1', '2-7', '2-7', '8-30', '8-30', '31+'])
    expect(faixa(150, [20, 100, 500])).toBe('101-500')
  })

  it('plataforma pelo user-agent', () => {
    expect(plataforma('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('ios')
    expect(plataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
    expect(plataforma('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop')
    expect(plataforma('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android')
    expect(plataforma('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
  })

  it('tamanho da tela', () => {
    expect([375, 600, 1023, 1440].map(tamanhoTela)).toEqual(['pequena', 'media', 'media', 'grande'])
  })

  it('origem do baralho', () => {
    const fabrica = new Set(['one-piece'])
    expect(origemBaralho(baralho({ id: 'one-piece', cartoes: [cartao('importado')] }), fabrica)).toBe('fabrica')
    expect(origemBaralho(baralho({ objetivo: { resumo: 'r' }, cartoes: [cartao('ia')] }), fabrica)).toBe('aprender')
    expect(origemBaralho(baralho({ cartoes: [cartao('importado'), cartao('importado'), cartao('ia')] }), fabrica)).toBe('recebido')
    expect(origemBaralho(baralho({ cartoes: [cartao('ia'), cartao()] , }), fabrica)).toMatch(/ia|manual/)
    expect(origemBaralho(baralho({ cartoes: [cartao(), cartao(), cartao('ia')] }), fabrica)).toBe('manual')
    expect(origemBaralho(baralho({}), fabrica)).toBe('vazio')
  })
})
