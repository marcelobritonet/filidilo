import { describe, expect, it } from 'vitest'
import { sortearAlternativas, sortearFrente, sortearVF } from './alternativas'
import { lerResposta } from './ia/resposta'
import type { Baralho, Cartao, CartaoAssociacao, CartaoVF } from './types'
import { validar } from './validar'

const baralho = (cartoes: Cartao[]): Baralho => ({ id: 'b', titulo: 'B', versao: 1, temas: [{ id: 't', nome: 'T' }], cartoes })

const alt: CartaoAssociacao = {
  id: 'a', tipo: 'associacao', tema: 't', frente: 'Unidade de força no SI?',
  outrasFrentes: ['Em que unidade se mede o peso?', 'O dinamômetro mostra a leitura em qual unidade?'],
  opcoes: ['N', 'J', 'W', 'Pa', 'dyn', 'kg', 'kgf', 'lbf', 'C', 'A', 'Hz', 'K', 'T'],
  correta: 0,
  outrasFormas: ['newton', 'o newton'],
}

const vf: CartaoVF = {
  id: 'v', tipo: 'vf', tema: 't', frente: 'Resultante nula implica corpo parado.', resposta: false, explicacao: 'Pode estar em MRU.',
  variantes: [
    { frente: 'Com resultante nula, o corpo pode estar em MRU.', resposta: true },
    { frente: 'Velocidade constante exige força.', resposta: false, explicacao: 'Força muda a velocidade.' },
  ],
}

describe('variações do cartão', () => {
  it('sorteia todos os enunciados ao longo das vezes', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < 300; i++) vistos.add(sortearFrente(alt))
    expect(vistos).toEqual(new Set([alt.frente, ...alt.outrasFrentes!]))
    expect(sortearFrente({ frente: 'só esta' })).toBe('só esta')
  })
  it('com 12 erradas e 3 formas da certa, cada vez mostra 4 e varia', () => {
    const certas = new Set<string>()
    const erradas = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const { opcoes, correta } = sortearAlternativas(alt)
      expect(opcoes).toHaveLength(4)
      certas.add(opcoes[correta])
      opcoes.forEach((o, k) => k !== correta && erradas.add(o))
    }
    expect(certas.size).toBe(3)
    expect(erradas.size).toBe(12)
  })
  it('V/F sorteia a principal ou uma variante, cada uma com a sua resposta e explicação', () => {
    const vistos = new Map<string, { resposta: boolean; explicacao?: string }>()
    for (let i = 0; i < 300; i++) {
      const v = sortearVF(vf)
      vistos.set(v.frente, { resposta: v.resposta, explicacao: v.explicacao })
    }
    expect(vistos.size).toBe(3)
    expect(vistos.get(vf.frente)).toEqual({ resposta: false, explicacao: 'Pode estar em MRU.' })
    expect(vistos.get('Velocidade constante exige força.')).toEqual({ resposta: false, explicacao: 'Força muda a velocidade.' })
    // Variante verdadeira sem explicação própria mostra a do cartão.
    expect(vistos.get('Com resultante nula, o corpo pode estar em MRU.')).toEqual({ resposta: true, explicacao: 'Pode estar em MRU.' })
  })
})

describe('validador das variações', () => {
  it('aceita as variações e o cartão sem elas', () => {
    expect(validar(baralho([alt, vf]))).toEqual([])
    const { outrasFrentes: _f, ...semFrentes } = alt
    const { variantes: _v, ...semVariantes } = vf
    expect(validar(baralho([semFrentes, semVariantes]))).toEqual([])
  })
  it('até 16 opções', () => {
    const muitas = { ...alt, opcoes: Array.from({ length: 17 }, (_, i) => `o${i}`) }
    expect(validar(baralho([muitas])).join()).toMatch(/no máximo 16 opções/)
    expect(validar(baralho([{ ...muitas, opcoes: muitas.opcoes.slice(0, 16) }]))).toEqual([])
  })
  it('recusa enunciado vazio ou repetido', () => {
    expect(validar(baralho([{ ...alt, outrasFrentes: [''] }])).join()).toMatch(/outro enunciado vazio/)
    expect(validar(baralho([{ ...alt, outrasFrentes: [alt.frente] }])).join()).toMatch(/enunciados repetidos/)
    expect(validar(baralho([{ id: 'c', tipo: 'conceito', tema: 't', frente: 'P?', verso: 'R', outrasFrentes: ['P?'] }])).join()).toMatch(/enunciados repetidos/)
  })
  it('recusa variante falsa sem explicação, sem resposta ou repetida', () => {
    expect(validar(baralho([{ ...vf, variantes: [{ frente: 'x', resposta: false }] }])).join()).toMatch(/variante falsa precisa/)
    expect(validar(baralho([{ ...vf, variantes: [{ frente: 'x' } as never] }])).join()).toMatch(/true ou false/)
    expect(validar(baralho([{ ...vf, variantes: [{ frente: vf.frente, resposta: true }] }])).join()).toMatch(/afirmações repetidas/)
  })
})

describe('leitura da resposta da IA', () => {
  it('conserta "outrasFrentes" em texto e "resposta" das variantes entre aspas', () => {
    const r = lerResposta(
      {
        cartoes: [
          { id: 'c1', tipo: 'associacao', tema: 't', frente: 'P?', outrasFrentes: 'Outra P?', opcoes: ['a', 'b'], correta: 0 },
          { id: 'c2', tipo: 'vf', tema: 't', frente: 'A', resposta: 'true', variantes: [{ frente: 'B', resposta: 'false', explicacao: 'porque' }] },
        ],
      },
      { id: 'b', titulo: 'B', versao: 1, temas: [{ id: 't', nome: 'T' }] },
    )
    expect(r.cartoes.map((c) => c.erros)).toEqual([[], []])
    expect(r.cartoes[0].cartao).toMatchObject({ outrasFrentes: ['Outra P?'] })
    expect(r.cartoes[1].cartao).toMatchObject({ resposta: true, variantes: [{ frente: 'B', resposta: false }] })
  })
})

describe('instruções pedem as variações', () => {
  it('criar, formatar e plano', async () => {
    const { montarInstrucao, montarInstrucaoFormatacao, EXEMPLOS } = await import('./ia/instrucao')
    const { montarPlano, EXEMPLO_PLANO } = await import('./ia/plano')
    for (const t of [montarInstrucao({ origem: 'tema', assunto: 'x', quantidade: 15, mistura: 'misto' }), montarInstrucaoFormatacao({ texto: 'P: a? R: b' }), montarPlano({ pedido: 'x' })]) {
      expect(t).toContain('## Variações')
      expect(t).toContain('"outrasFrentes" (3 ou 4 outros enunciados')
      expect(t).toContain('1 certa e até 12 erradas plausíveis')
      expect(t).toContain('"variantes" (3 ou 4 outras afirmações')
    }
    expect(montarInstrucao({ origem: 'tema', assunto: 'x', quantidade: 15, mistura: 'misto' })).toContain('blocos de até 15 cartões')
    // "Mais cartões" na mesma conversa traz as regras por extenso: a conversa pode ter começado com a instrução antiga.
    const { montarMaisDoMaterial } = await import('./ia/instrucao')
    const mais = montarMaisDoMaterial({ baralho: { temas: [{ id: 't', nome: 'T' }], cartoes: [] }, mistura: 'misto' })
    expect(mais).toContain('## Variações')
    expect(mais).toContain('1 certa e até 12 erradas plausíveis')
    expect(mais).toContain('use-os mesmo assim')
    // "Já tenho as perguntas": a pergunta aberta da pessoa não ganha outros enunciados (no teste, a IA trocava o que se pedia).
    expect(montarInstrucaoFormatacao({ texto: 'P: a? R: b' })).toContain('No tipo "conceito" (pergunta aberta), não crie "outrasFrentes"')
    const assoc = EXEMPLOS.cartoes.find((c) => c.tipo === 'associacao') as CartaoAssociacao
    expect(assoc.opcoes).toHaveLength(13)
    expect(assoc.outrasFormas).toHaveLength(2)
    expect(EXEMPLO_PLANO.cartoes.every((c) => c.tipo === 'calculo' || c.tipo === 'lacunas' || ('outrasFrentes' in c && c.outrasFrentes?.length) || ('variantes' in c && c.variantes?.length))).toBe(true)
  })
})
