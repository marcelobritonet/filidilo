import { describe, expect, it } from 'vitest'
import { montarInstrucao, montarInstrucaoFormatacao } from './instrucao'
import { montarPlano } from './plano'
import { ERRO_ALTERNATIVAS, separarAlternativas } from './multipla'
import { lerResposta } from './resposta'

const destino = { id: 'nav', titulo: 'Navegação', versao: 1, temas: [{ id: 'bwm', nome: 'BWM' }] }
// O cartão que o Gemini devolveu no teste do Marcelo (P90): alternativas e cabeçalho dentro da pergunta.
const FRENTE = 'Questão 31 | BWM\n\nQual documento descreve os procedimentos adotados pelo navio para gerenciar a água de lastro e cumprir os requisitos aplicáveis?\n\nA) Livro de Registro da Água de Lastro.\nB) Plano de Gerenciamento da Água de Lastro.\nC) Certificado IOPP.\nD) Certificado de Arqueação.'
const OPCOES = ['Livro de Registro da Água de Lastro', 'Plano de Gerenciamento da Água de Lastro', 'Certificado IOPP', 'Certificado de Arqueação']
const PERGUNTA = 'Qual documento descreve os procedimentos adotados pelo navio para gerenciar a água de lastro e cumprir os requisitos aplicáveis?'

const ler = (cartao: Record<string, unknown>) => lerResposta({ cartoes: [{ id: 'q31', tema: 'bwm', ...cartao }] }, destino).cartoes[0]

describe('questões de múltipla escolha (P90)', () => {
  it('as instruções mandam alternativas para "associacao" e resolver quando não há gabarito', () => {
    const f = montarInstrucaoFormatacao({ texto: FRENTE })
    expect(f).toContain('vira SEMPRE "associacao", nunca "conceito"')
    expect(f).toContain('Questão 31 | BWM')
    expect(f).toContain('Sem gabarito, resolva a questão')
    expect(f).toContain('não crie erradas novas')
    const regra = 'Nunca ponha alternativas (A, B, C…) dentro de "frente" ou "verso"'
    expect(montarInstrucao({ origem: 'arquivo', quantidade: 10, mistura: 'misto' })).toContain(regra)
    expect(montarPlano({ pedido: 'BWM' })).toContain(regra)
    expect(montarInstrucao({ origem: 'arquivo', quantidade: 10, mistura: 'misto' })).toContain('use só as alternativas dela, sem criar erradas novas, e sem "outrasFormas"')
  })

  it('separa pergunta, sem cabeçalho, e alternativas', () => {
    expect(separarAlternativas(FRENTE)).toEqual({ pergunta: PERGUNTA, opcoes: OPCOES })
    expect(separarAlternativas('Qual a cor do céu? (a) azul (b) verde (c) roxo')).toEqual({ pergunta: 'Qual a cor do céu?', opcoes: ['azul', 'verde', 'roxo'] })
  })

  it('não confunde "a)" no meio de uma frase com alternativas', () => {
    expect(separarAlternativas('Compare os itens a) e b) do artigo 5.')).toBeUndefined()
    expect(separarAlternativas('O que é velocidade média?')).toBeUndefined()
  })

  it('conceito com a letra certa no verso vira "associacao"', () => {
    for (const verso of ['B) Plano de Gerenciamento da Água de Lastro.', 'B', 'Letra B', 'Plano de Gerenciamento da Água de Lastro']) {
      const r = ler({ tipo: 'conceito', frente: FRENTE, verso })
      expect(r.erros).toEqual([])
      expect(r.cartao).toMatchObject({ tipo: 'associacao', frente: PERGUNTA, opcoes: OPCOES, correta: 1 })
      expect(r.cartao).not.toHaveProperty('verso')
    }
  })

  it('o resto do verso vira explicação', () => {
    const r = ler({ tipo: 'conceito', frente: FRENTE, verso: 'B) Plano de Gerenciamento da Água de Lastro. Ele é exigido pela Convenção BWM.' })
    expect(r.cartao).toMatchObject({ tipo: 'associacao', correta: 1, explicacao: 'Ele é exigido pela Convenção BWM.' })
  })

  it('sem dar para saber a certa, volta com o motivo para o pedido de correção', () => {
    const r = ler({ tipo: 'conceito', frente: FRENTE, verso: 'O plano exigido pela convenção.' })
    expect(r.cartao.tipo).toBe('conceito')
    expect(r.erros).toEqual([ERRO_ALTERNATIVAS])
    expect(ler({ tipo: 'vf', frente: FRENTE, resposta: true }).erros).toContain(ERRO_ALTERNATIVAS)
  })

  it('cartão certo não muda', () => {
    const r = ler({ tipo: 'associacao', frente: PERGUNTA, opcoes: OPCOES, correta: 1 })
    expect(r.erros).toEqual([])
    expect(r.cartao).toMatchObject({ frente: PERGUNTA, opcoes: OPCOES, correta: 1 })
  })

  it('questão de prova: tira a outra forma da certa mais longa que as erradas (P92)', () => {
    const r = ler({ tipo: 'associacao', frente: PERGUNTA, opcoes: OPCOES, correta: 1, outrasFormas: ['Documento que estabelece os procedimentos de gerenciamento da água de lastro a bordo.'] })
    expect(r.erros).toEqual([])
    expect(r.cartao).not.toHaveProperty('outrasFormas')
    const curta = ler({ tipo: 'associacao', frente: 'Qual o anexo?', opcoes: ['óleo', 'esgoto', 'lixo', 'emissões atmosféricas'], correta: 2, outrasFormas: ['resíduos', 'Resíduos e materiais descartados pelos navios.'] })
    expect(curta.cartao).toMatchObject({ outrasFormas: ['resíduos'] })
    // Cartão gerado (6 ou mais opções) segue a regra da instrução, sem corte automático.
    const gerado = ler({ tipo: 'associacao', frente: 'Unidade de força?', opcoes: ['newton (N)', 'joule (J)', 'watt (W)', 'pascal (Pa)', 'dina (dyn)', 'quilograma (kg)'], correta: 0, outrasFormas: ['N, que equivale a kg·m/s²'] })
    expect(gerado.cartao).toMatchObject({ outrasFormas: ['N, que equivale a kg·m/s²'] })
  })

  it('a instrução de formatação proíbe outrasFormas em questão de prova (P92)', () => {
    expect(montarInstrucaoFormatacao({ texto: FRENTE })).toContain('Não use "outrasFormas" aqui')
    expect(montarInstrucaoFormatacao({ texto: FRENTE })).toContain('Nunca mande uma questão de múltipla escolha para "naoConvertidos"')
  })
})
