import { describe, expect, it } from 'vitest'
import { validar } from '../validar'
import { EXEMPLO_PLANO, montarPlano, VERSAO_PLANO } from './plano'
import { extrairJson } from './resposta'

describe('instrução de planejamento (Aprender)', () => {
  it('versão 1', () => {
    expect(VERSAO_PLANO).toBe(11)
  })

  it('o exemplo passa no validador do app', () => {
    expect(validar({ id: 'x', titulo: 'x', versao: 1, temas: EXEMPLO_PLANO.temas, cartoes: EXEMPLO_PLANO.cartoes }, 200)).toEqual([])
  })

  it('contém o pedido, as seções e 15 cartões', () => {
    const t = montarPlano({ pedido: 'espanhol para viajar ao México' })
    expect(t).toContain('===\nespanhol para viajar ao México\n===')
    expect(t).toContain('Crie 15 cartões')
    expect(t).toContain('## Antes de responder')
    expect(t).toContain('até 3 perguntas')
    expect(t).toContain('Não há material anexado')
  })

  it('não pede data, prazo nem meta', () => {
    const t = montarPlano({ pedido: 'revisão de Cálculo 1' })
    expect(t).not.toMatch(/\bdata\b|\bprazo\b|\bmeta\b|\bHoje\b/i)
    expect(t).not.toContain('"data"')
    expect(t).not.toContain('"meta"')
  })

  it('com arquivo, a IA pergunta o recorte e usa o nome do arquivo como fonte', () => {
    const t = montarPlano({ pedido: 'cinemática', origem: 'arquivo' })
    expect(t).toContain('Quer usar o material todo ou só algumas páginas?')
    expect(t).toContain('"apostila": "nome do arquivo, sem a extensão"')
  })

  it('o exemplo dentro da instrução é o JSON de EXEMPLO_PLANO', () => {
    expect(extrairJson(montarPlano({ pedido: 'xadrez' }))).toEqual(JSON.parse(JSON.stringify(EXEMPLO_PLANO)))
  })
})

describe('nível de conhecimento no pedido', () => {
  it('põe o nível escolhido e a instrução de tom na instrução', () => {
    const t = montarPlano({ pedido: 'cálculo 1', nivel: 'extremo' })
    expect(t).toContain('Nível "Extremo" (extremo)')
    expect(t).toContain('perguntas difíceis de verdade')
    expect(t).toContain('não mude')
    expect(t).toContain('"nivel" é "extremo"'.replace('"nivel" é', 'O nível é'))
  })

  it('sem nível, a IA escolhe entre as seis opções', () => {
    const t = montarPlano({ pedido: 'xadrez' })
    expect(t).not.toContain('Quanto a pessoa já sabe')
    expect(t).toContain('"zero", "iniciante", "nocoes", "bastante", "expert" e "extremo"')
  })
})

describe('regras de conteúdo (P58)', () => {
  it('pede conferir as erradas, lacuna com resposta única e cálculo com sutileza nos níveis altos', () => {
    const t = montarPlano({ pedido: 'Derivadas', nivel: 'extremo' })
    expect(t).toContain('nenhuma pode também responder à pergunta')
    expect(t).toContain('Cada lacuna precisa ter uma resposta certa clara')
    expect(t).toContain('nunca a aplicação direta de uma fórmula')
    expect(t).toContain('revise cada cartão como um professor que corrige prova')
  })
})

describe('o enunciado não entrega a resposta (P89)', () => {
  it('o plano traz a regra', () => {
    expect(montarPlano({ pedido: 'fotossíntese' })).toContain('## Não entregue a resposta')
  })
})
