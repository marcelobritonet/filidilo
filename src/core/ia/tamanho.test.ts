import { describe, expect, it } from 'vitest'
import type { Cartao } from '../types'
import { ERRO_LONGA, ERRO_OPCAO_LONGA, problemasDeTamanho, respostaLonga, temVariasPartes } from './tamanho'

const conceito = (verso: string) => ({ id: 'c', tipo: 'conceito', tema: 't', frente: 'P?', verso }) as Cartao

describe('respostas curtas (P142)', () => {
  it('aceita resposta curta, com fórmula ou com uma explicação breve', () => {
    expect(problemasDeTamanho(conceito('Rotação.'))).toEqual([])
    expect(problemasDeTamanho(conceito('A razão entre o deslocamento e o intervalo de tempo: $v_m = \\Delta s / \\Delta t$.'))).toEqual([])
    expect(problemasDeTamanho(conceito('Um garoto que servia Alvida. Depois de conhecer Luffy, entrou na Marinha.'))).toEqual([])
  })
  it('recusa resposta longa demais', () => {
    expect(problemasDeTamanho(conceito('a '.repeat(90)))).toEqual([ERRO_LONGA])
  })
  it('recusa resposta com lista dentro', () => {
    expect(temVariasPartes('1) luz 2) água 3) gás carbônico')).toBe(true)
    expect(temVariasPartes('a. clorofila b. luz c. água')).toBe(true)
    expect(temVariasPartes('luz\nágua\ngás carbônico')).toBe(true)
    expect(temVariasPartes('luz; água; gás carbônico')).toBe(true)
    expect(temVariasPartes('Luz e água; é feita na folha.')).toBe(false)
    expect(respostaLonga(conceito('Fatores: 1) luz 2) água 3) CO2'))).toBe(true)
  })
  it('alternativa longa demais', () => {
    const c = { id: 'a', tipo: 'associacao', tema: 't', frente: 'P?', opcoes: ['curta', 'b '.repeat(70)], correta: 0 } as Cartao
    expect(problemasDeTamanho(c)).toEqual([ERRO_OPCAO_LONGA])
  })
})

describe('onde a checagem vale', async () => {
  const { lerResposta } = await import('./resposta')
  const { montarInstrucao, montarInstrucaoFormatacao, montarMaisDoMaterial } = await import('./instrucao')
  const { montarPlano } = await import('./plano')
  const { precisaRenovar } = await import('./renovar')
  const longo = { id: 'c1', tipo: 'conceito', tema: 't', frente: 'Quais os fatores?', verso: '1) luz 2) água 3) gás carbônico' }
  const destino = { id: 'b', titulo: 'B', versao: 1, temas: [{ id: 't', nome: 'T' }] }

  it('na criação com IA a resposta longa volta com erro; nas perguntas da pessoa, não', () => {
    expect(lerResposta({ cartoes: [longo] }, destino, undefined, { conferirTamanho: true }).cartoes[0].erros).toContain(ERRO_LONGA)
    expect(lerResposta({ cartoes: [longo] }, destino).cartoes[0].erros).toEqual([])
  })
  it('a regra vai em criar, plano e mais cartões; não na formatação', () => {
    for (const t of [montarInstrucao({ origem: 'tema', assunto: 'x', quantidade: 10, mistura: 'misto' }), montarPlano({ pedido: 'x' }), montarMaisDoMaterial({ baralho: { temas: [], cartoes: [] }, mistura: 'misto' })])
      expect(t).toContain('## Uma resposta, um fato')
    expect(montarInstrucaoFormatacao({ texto: 'P: a? R: b' })).not.toContain('## Uma resposta, um fato')
  })
  it('cartão com resposta longa volta para a renovação, mesmo já renovado', () => {
    expect(precisaRenovar({ ...longo, renovadoEm: 1, outrasFrentes: ['x?'] } as Cartao)).toBe(true)
    expect(precisaRenovar({ ...longo, verso: 'Luz.', renovadoEm: 1 } as Cartao)).toBe(false)
  })
})
