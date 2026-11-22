import { describe, expect, it } from 'vitest'
import type { Baralho } from '../types'
import { montarInstrucao, montarMaisDoMaterial } from './instrucao'
import { montarPlano } from './plano'
import { parecePerguntas } from './resposta'

const baralho: Pick<Baralho, 'temas' | 'cartoes'> = {
  temas: [{ id: 'dinamica', nome: 'Dinâmica' }],
  cartoes: [{ id: 'a', tipo: 'conceito', tema: 'dinamica', frente: 'O que diz a 1ª lei de Newton?', verso: 'Inércia.', fonte: { apostila: 'Aula 3', pagina: 2 } }],
}

describe('material em arquivo (PDF ou imagens) (P99)', () => {
  it('a instrução pede o arquivo se não houver, conta o que leu e pergunta a quantidade', () => {
    const t = montarInstrucao({ origem: 'arquivo', quantidade: 20, mistura: 'misto' })
    expect(t).toContain('PDF ou imagens (fotos, prints)')
    expect(t).toContain('## Antes de criar os cartões')
    expect(t).toContain('Se ainda não houver arquivo anexado nesta conversa, peça')
    expect(t).toContain('Quantos cartões você quer? Sugiro N.')
    expect(t).toContain('Primeiro siga "Antes de criar os cartões"')
    expect(t).toContain('número da imagem')
    // Sem campo de nome no app: a fonte é o nome do arquivo.
    expect(t).toContain('"apostila": "nome do arquivo, sem a extensão"')
  })

  it('texto e assunto continuam respondendo direto, sem perguntas', () => {
    const t = montarInstrucao({ origem: 'tema', assunto: 'Leis de Newton', quantidade: 10, mistura: 'misto' })
    expect(t).not.toContain('Antes de criar os cartões')
    expect(t).toContain('Crie 10 cartões')
  })

  it('no Aprender, com arquivo o pedido pode ficar vazio e a quantidade é perguntada', () => {
    const t = montarPlano({ pedido: '', nivel: 'iniciante', origem: 'arquivo' })
    expect(t).toContain('Não escrevi um pedido: monte o plano para estudar o que está no material anexado.')
    expect(t).toContain('Crie a quantidade de cartões que eu pedir')
    expect(t).not.toContain('Crie 15 cartões')
    expect(t).toContain('Fiel ao material')
    expect(t).toContain('"Antes de criar os cartões"')
  })

  it('mais cartões do mesmo material: sem anexar de novo, sem repetir, com os temas do baralho', () => {
    const t = montarMaisDoMaterial({ baralho, mistura: 'teoria' })
    expect(t).toContain('não vou anexar de novo')
    expect(t).toContain('Dinâmica: diz 1ª lei Newton')
    expect(t).toContain('"dinamica" (Dinâmica)')
    expect(t).toContain('Pergunte quantos cartões eu quero')
    expect(t).toContain('Não crie "calculo"')
  })

  it('a pergunta da IA sobre a quantidade é reconhecida como pergunta, não como erro', () => {
    expect(parecePerguntas('Li 12 páginas sobre Dinâmica.\nQuantos cartões você quer? Sugiro 20.')).toBe(true)
  })
})
