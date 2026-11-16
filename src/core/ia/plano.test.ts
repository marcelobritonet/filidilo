import { describe, expect, it } from 'vitest'
import { validar } from '../validar'
import { EXEMPLO_PLANO, montarPlano, VERSAO_PLANO } from './plano'
import { extrairJson } from './resposta'

describe('instrução de planejamento (Aprender)', () => {
  it('versão 1', () => {
    expect(VERSAO_PLANO).toBe(1)
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

  it('o material de PDF entra com nome e páginas', () => {
    const t = montarPlano({ pedido: 'cinemática', origem: 'pdf', nomePdf: 'Aula 2', paginas: '1-4' })
    expect(t).toContain('"Aula 2"')
    expect(t).toContain('somente as páginas 1-4')
  })

  it('o exemplo dentro da instrução é o JSON de EXEMPLO_PLANO', () => {
    expect(extrairJson(montarPlano({ pedido: 'xadrez' }))).toEqual(JSON.parse(JSON.stringify(EXEMPLO_PLANO)))
  })
})
