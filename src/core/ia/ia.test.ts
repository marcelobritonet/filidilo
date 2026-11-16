import { describe, expect, it } from 'vitest'
import { validar } from '../validar'
import { EXEMPLOS, montarCorrecao, montarInstrucao } from './instrucao'
import { extrairJson, lerResposta } from './resposta'

const destino = { id: 'fis', titulo: 'Física', versao: 1, temas: [{ id: 'dinamica', nome: 'Dinâmica' }] }

describe('instrução para o Gemini', () => {
  it('os exemplos da instrução passam no validador do app', () => {
    expect(validar({ id: 'x', titulo: 'x', versao: 1, temas: EXEMPLOS.temas, cartoes: EXEMPLOS.cartoes }, 200)).toEqual([])
  })
  it('inclui quantidade, mistura, origem e os temas do baralho', () => {
    const t = montarInstrucao({ origem: 'pdf', nomePdf: 'Aula 4.pdf', paginas: '3-9', quantidade: 20, mistura: 'teoria', baralho: { titulo: 'Física', temas: destino.temas } })
    expect(t).toContain('Crie 20 cartões')
    expect(t).toContain('Não crie "calculo"')
    expect(t).toContain('"Aula 4.pdf"')
    expect(t).toContain('somente as páginas 3-9')
    expect(t).toContain('"dinamica": Dinâmica')
    expect(t).toContain('"pagina": número da página')
    // O exemplo dentro da instrução é JSON válido.
    expect(extrairJson(t)).toEqual(JSON.parse(JSON.stringify(EXEMPLOS)))
  })
  it('texto colado e tema descrito', () => {
    expect(montarInstrucao({ origem: 'texto', texto: 'A água ferve a 100 °C.', quantidade: 10, mistura: 'misto' })).toContain('===\nA água ferve a 100 °C.\n===')
    expect(montarInstrucao({ origem: 'tema', assunto: 'Leis de Newton', quantidade: 10, mistura: 'misto' })).toContain('"Leis de Newton"')
  })
  it('pedido de correção lista os cartões', () => {
    expect(montarCorrecao([{ id: 'c3', erros: ['índice "correta" fora das opções'] }])).toContain('- Cartão "c3": índice "correta" fora das opções')
  })
})

describe('lendo a resposta', () => {
  it('acha o JSON com texto em volta, cercas ```json, vírgula sobrando e aspas tipográficas', () => {
    expect(extrairJson('Claro! Aqui está:\n```json\n{"cartoes": [{"a": 1},]}\n```\nBons estudos!')).toEqual({ cartoes: [{ a: 1 }] })
    expect(extrairJson('{“cartoes”: []}')).toEqual({ cartoes: [] })
    expect(() => extrairJson('')).toThrow(/vazia/)
    expect(() => extrairJson('só texto')).toThrow(/JSON válido/)
  })

  it('reaproveita temas, cria os novos, dá ids novos e valida cartão a cartão', () => {
    const resposta = {
      temas: [{ id: 'Dinâmica', nome: 'Dinâmica' }, { id: 'energia', nome: 'Energia' }],
      cartoes: [
        { id: 'c1', tipo: 'conceito', tema: 'Dinâmica', frente: 'O que é força?', verso: 'Interação que muda o movimento.' },
        { id: 'c2', tipo: 'vf', tema: 'energia', frente: 'Energia se cria do nada.', resposta: 'false', explicacao: 'Conservação da energia.' },
        { id: 'c3', tipo: 'associacao', tema: 'energia', frente: 'Unidade de energia?', opcoes: ['J', 'N'], correta: 5 },
        { id: 'c4', tipo: 'conceito', tema: 'ondas', frente: 'O que é frequência?', verso: 'Oscilações por segundo.' },
      ],
    }
    const r = lerResposta(resposta, destino, 'Aula 4.pdf')
    expect(r.temasNovos).toEqual([{ id: 'energia', nome: 'Energia' }, { id: 'ondas', nome: 'ondas' }])
    expect(r.cartoes.map((c) => c.cartao.tema)).toEqual(['dinamica', 'energia', 'energia', 'ondas'])
    expect(r.cartoes.map((c) => c.erros.length)).toEqual([0, 0, 1, 0])
    expect(r.cartoes[2]).toMatchObject({ idIA: 'c3', erros: ['índice "correta" fora das opções'] })
    expect(r.cartoes[1].cartao).toMatchObject({ resposta: false, origem: 'ia', fonte: { apostila: 'Aula 4.pdf' } })
    expect(new Set(r.cartoes.map((c) => c.cartao.id)).size).toBe(4)
    expect(r.cartoes.every((c) => c.cartao.id.startsWith('ia-'))).toBe(true)
  })

  it('um cálculo com fórmula quebrada é recusado com o motivo', () => {
    const r = lerResposta(
      { cartoes: [{ id: 'k', tipo: 'calculo', tema: 'dinamica', titulo: 't', enunciado: 'm={m}', parametros: { m: { min: 1, max: 2, passo: 1 } }, etapas: [{ pergunta: 'p', expr: 'm*g', resolucao: ['{m}'] }] }] },
      destino,
    )
    expect(r.cartoes[0].erros[0]).toMatch(/Variável desconhecida "g"/)
  })

  it('aceita lista crua de cartões ou "cards"', () => {
    expect(lerResposta([{ tipo: 'conceito', tema: 'x', frente: 'a', verso: 'b' }], destino).cartoes).toHaveLength(1)
    expect(lerResposta({ cards: [{ tipo: 'conceito', tema: 'x', frente: 'a', verso: 'b' }] }, destino).cartoes).toHaveLength(1)
    expect(() => lerResposta({ temas: [] }, destino)).toThrow(/cartoes/)
  })
})
