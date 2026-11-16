import { describe, expect, it } from 'vitest'
import type { Baralho, Cartao } from '../types'
import { lerCartaoCorrigido, montarPedidoCorrecao } from './corrigir'

const b: Baralho = { id: 'q', titulo: 'Química', versao: 1, temas: [{ id: 'est', nome: 'Estequiometria' }], cartoes: [] }
const errado: Cartao = { id: 'c9', tipo: 'vf', tema: 'est', frente: 'Um mol tem 6,02·10²² entidades.', resposta: true, origem: 'ia', editado: false, fonte: { apostila: 'Aula 2', pagina: 3 } }

describe('corrigir um cartão com a IA', () => {
  it('o pedido leva disciplina, tema, o problema e o cartão sem campos internos', () => {
    const p = montarPedidoCorrecao(b, errado, 'o expoente parece errado')
    expect(p).toContain('Disciplina: "Química". Tema: "Estequiometria"')
    expect(p).toContain('O que parece errado: o expoente parece errado')
    expect(p).toContain('"frente": "Um mol tem 6,02·10²² entidades."')
    expect(p).not.toContain('"origem"')
    expect(p).toContain('SOMENTE com um bloco de código JSON')
  })

  it('com objetivo e nível, o pedido mantém o recorte', () => {
    const p = montarPedidoCorrecao(b, errado, undefined, { resumo: 'Estudar estequiometria', nivel: 'avancado', evitar: ['ácidos'] })
    expect(p).toContain('Objetivo do baralho: Estudar estequiometria.')
    expect(p).toContain('Nível: avançado.')
    expect(p).toContain('Não crie nada sobre: ácidos.')
    expect(montarPedidoCorrecao(b, errado)).not.toContain('Nível:')
  })

  it('lê o cartão corrigido, mantém id, tema, origem e fonte', () => {
    const resp = 'Corrigido:\n```json\n{"id":"outro","tipo":"vf","tema":"inventado","frente":"Um mol tem 6,02·10²³ entidades.","resposta":"true","explicacao":"Constante de Avogadro."}\n```'
    const r = lerCartaoCorrigido(resp, b, errado)
    expect(r.erros).toEqual([])
    expect(r.cartao).toMatchObject({ id: 'c9', tema: 'est', origem: 'ia', resposta: true, fonte: { apostila: 'Aula 2', pagina: 3 } })
  })

  it('aceita {"cartoes": [...]} e aponta problemas', () => {
    const r = lerCartaoCorrigido('{"cartoes":[{"tipo":"associacao","frente":"x","opcoes":["a","b"],"correta":4}]}', b, errado)
    expect(r.erros).toEqual(['índice "correta" fora das opções'])
    expect(() => lerCartaoCorrigido('{"oi": 1}', b, errado)).toThrow(/Não encontrei um cartão/)
  })
})
