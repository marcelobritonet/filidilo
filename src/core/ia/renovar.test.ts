import { describe, expect, it } from 'vitest'
import type { Baralho, Cartao } from '../types'
import { cartoesParaRenovar, juntarRenovacao, lerRenovacao, montarRenovacao, opcoesFixas, precisaRenovar, resumoPorTema } from './renovar'

const conceito: Cartao = { id: 'c1', tipo: 'conceito', tema: 't', frente: 'Capital do Brasil?', verso: 'Brasília', favoritoEm: 5 }
const vf: Cartao = { id: 'c2', tipo: 'vf', tema: 't', frente: 'O Sol é uma estrela.', resposta: true }
const prova: Cartao = { id: 'c3', tipo: 'associacao', tema: 't', frente: 'Qual a unidade de força?', opcoes: ['N', 'J', 'W', 'Pa'], correta: 0 }
const renovado: Cartao = { ...conceito, id: 'c4', outrasFrentes: ['Sede do governo federal?'] }
const calculo = { id: 'c5', tipo: 'calculo', tema: 't', titulo: 'x', enunciado: 'x', parametros: {}, etapas: [] } as unknown as Cartao
const arquivado: Cartao = { ...vf, id: 'c6', arquivadoEm: 1 }
const outroTema: Cartao = { ...vf, id: 'c7', tema: 'u' }

const b: Baralho = {
  id: 'b', titulo: 'Geral', versao: 1,
  temas: [{ id: 't', nome: 'Tema T' }, { id: 'u', nome: 'Tema U' }],
  cartoes: [conceito, vf, prova, renovado, calculo, arquivado, outroTema],
  objetivo: { resumo: 'Revisar geografia', nivel: 'iniciante' },
}

describe('quem entra na renovação', () => {
  it('conceito, V/F e alternativas do tema, sem variações, não arquivados', () => {
    expect(cartoesParaRenovar(b, 't').map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(precisaRenovar({ ...vf, renovadoEm: 1 })).toBe(false)
    expect(resumoPorTema(b)).toEqual([
      { id: 't', nome: 'Tema T', faltam: 3, total: 4 },
      { id: 'u', nome: 'Tema U', faltam: 1, total: 1 },
    ])
  })
  it('alternativas de prova: até 5 opções e sem outras formas', () => {
    expect(opcoesFixas(prova)).toBe(true)
    expect(opcoesFixas({ ...prova, outrasFormas: ['newton'] } as Cartao)).toBe(false)
  })
})

describe('pedido de renovação', () => {
  const bloco = cartoesParaRenovar(b, 't')
  it('primeiro bloco leva o baralho, as regras e os cartões sem campos internos', () => {
    const t = montarRenovacao(b, 't', bloco, { primeiro: true, numero: 1, total: 2 })
    expect(t).toContain('"Geral", tema "Tema T"')
    expect(t).toContain('Objetivo do baralho: Revisar geografia.')
    expect(t).toContain('## Variações')
    expect(t).toContain('"novo-1"')
    expect(t).toContain('bloco 1 de 2, 3 cartões')
    expect(t).toContain('"manterOpcoes": true')
    expect(t).not.toContain('favoritoEm')
  })
  it('blocos seguintes não repetem o contexto, mas mantêm as regras', () => {
    const t = montarRenovacao(b, 't', bloco, { primeiro: false, numero: 2, total: 2 })
    expect(t).toMatch(/^Próximo bloco/)
    expect(t).not.toContain('## Baralho')
    expect(t).toContain('## Campos de variação')
  })
})

describe('leitura da renovação', () => {
  const bloco = cartoesParaRenovar(b, 't')
  const resposta = (cartoes: unknown[]) => '```json\n' + JSON.stringify({ cartoes }) + '\n```'

  it('casa pelo id, mantém tema e fonte, aceita conceito → alternativas e cria as partes novas', () => {
    const r = lerRenovacao(
      resposta([
        { id: 'c1', tipo: 'associacao', tema: 'outro', frente: 'Capital do Brasil?', outrasFrentes: ['Sede do governo?'], opcoes: ['Brasília', 'Rio', 'Salvador', 'São Paulo', 'Recife', 'Belém'], correta: 0 },
        { id: 'c2', tipo: 'vf', frente: 'O Sol é uma estrela.', resposta: 'true', variantes: [{ frente: 'O Sol é um planeta.', resposta: 'false', explicacao: 'É uma estrela.' }] },
        { id: 'novo-1', tipo: 'conceito', tema: 't', frente: 'Estrela mais próxima da Terra?', verso: 'O Sol' },
        { id: 'zz', tipo: 'conceito', frente: 'fora do bloco', verso: 'x' },
      ]),
      b,
      bloco,
    )
    expect(r.renovados.map((x) => [x.cartao.id, x.cartao.tipo, x.cartao.tema, x.erros])).toEqual([
      ['c1', 'associacao', 't', []],
      ['c2', 'vf', 't', []],
    ])
    expect(r.renovados[1].cartao).toMatchObject({ resposta: true, variantes: [{ resposta: false }] })
    expect(r.novos).toHaveLength(1)
    expect(r.novos[0]).toMatchObject({ idIA: 'novo-1', erros: [], cartao: { tema: 't', origem: 'ia' } })
    expect(r.novos[0].cartao.id).not.toBe('novo-1')
    expect(r.faltando).toEqual(['c3'])
  })

  it('recusa troca de tipo que não seja conceito → alternativas', () => {
    const r = lerRenovacao(resposta([{ id: 'c2', tipo: 'conceito', frente: 'O Sol é?', verso: 'estrela' }]), b, bloco)
    expect(r.renovados[0].erros.join()).toMatch(/o tipo mudou/)
  })

  it('pergunta aberta que continua aberta não fica com outros enunciados', () => {
    const r = lerRenovacao(resposta([{ id: 'c1', tipo: 'conceito', frente: 'Capital do Brasil?', verso: 'Brasília', outrasFrentes: ['Qual cidade é a sede do governo?'] }]), b, bloco)
    expect(r.renovados[0].cartao).not.toHaveProperty('outrasFrentes')
    expect(r.renovados[0].erros).toEqual([])
  })

  it('alternativas de prova voltam como estavam, sem outras formas', () => {
    const r = lerRenovacao(
      resposta([{ id: 'c3', tipo: 'associacao', manterOpcoes: true, frente: 'Qual a unidade de força?', outrasFrentes: ['Em que unidade se mede o peso?'], opcoes: ['N', 'J', 'kg', 'W', 'Pa', 'C'], correta: 0, outrasFormas: ['newton'] }]),
      b,
      bloco,
    )
    expect(r.renovados[0].cartao).toEqual({ id: 'c3', tipo: 'associacao', tema: 't', frente: 'Qual a unidade de força?', outrasFrentes: ['Em que unidade se mede o peso?'], opcoes: ['N', 'J', 'W', 'Pa'], correta: 0 })
  })

  it('correção substitui o cartão com erro', () => {
    const r1 = lerRenovacao(resposta([{ id: 'c2', tipo: 'vf', frente: 'O Sol é uma estrela.', resposta: true, variantes: [{ frente: 'x', resposta: false }] }]), b, bloco)
    expect(r1.renovados[0].erros.length).toBeGreaterThan(0)
    const r2 = lerRenovacao(resposta([{ id: 'c2', tipo: 'vf', frente: 'O Sol é uma estrela.', resposta: true, variantes: [{ frente: 'x', resposta: false, explicacao: 'porque' }] }]), b, bloco)
    const j = juntarRenovacao(r1, r2)
    expect(j.renovados).toHaveLength(1)
    expect(j.renovados[0].erros).toEqual([])
  })

  it('resposta sem cartão do bloco é recusada', () => {
    expect(() => lerRenovacao(resposta([{ id: 'zz', tipo: 'vf', frente: 'a', resposta: true }]), b, bloco)).toThrow(/Nenhum cartão/)
  })
})
