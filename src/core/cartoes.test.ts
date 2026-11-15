import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { criar, obter } from './baralhos'
import { adicionarCartoes, excluirCartao, gravarCartao, lerLista, problemasDoCartao, reinserirCartao } from './cartoes'
import { db } from './db'
import type { Cartao } from './types'

describe('lerLista', () => {
  it('aceita travessão, ponto e vírgula, tab e hífen com espaços', () => {
    const l = lerLista('O que é ρ? — massa específica\nCb; coeficiente de bloco\nRe\tReynolds\nNavier-Stokes - equações do movimento\n\n', 't')
    expect(l.map((x) => [x.cartao?.frente, x.cartao?.verso])).toEqual([
      ['O que é ρ?', 'massa específica'],
      ['Cb', 'coeficiente de bloco'],
      ['Re', 'Reynolds'],
      ['Navier-Stokes', 'equações do movimento'],
    ])
    expect(l.every((x) => x.cartao?.tema === 't' && x.cartao.tipo === 'conceito')).toBe(true)
  })
  it('tira marcadores e aponta linhas sem separador', () => {
    const l = lerLista('1. A — B\n- C ; D\nsem separador\n• E —', 't')
    expect(l[0].cartao?.frente).toBe('A')
    expect(l[1].cartao?.frente).toBe('C')
    expect(l[2]).toMatchObject({ linha: 3, erro: expect.stringContaining('separar') })
    expect(l[3].erro).toBe('Resposta vazia')
  })
})

describe('edição de cartões', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })
  it('grava novo como manual, marca edição, exclui e desfaz', async () => {
    let b = await criar('Teste')
    const c: Cartao = { id: 'x1', tipo: 'vf', tema: 'geral', frente: 'Água é fluido', resposta: true }
    b = await gravarCartao(b, c)
    expect(b.cartoes[0]).toMatchObject({ origem: 'manual' })
    expect(b.cartoes[0].editado).toBeUndefined()
    b = await gravarCartao(b, { ...c, frente: 'Água é um fluido' })
    expect(b.cartoes[0]).toMatchObject({ frente: 'Água é um fluido', editado: true })
    b = await adicionarCartoes(b, lerLista('a — b', 'geral').map((l) => l.cartao!))
    const r = await excluirCartao(b, 'x1')
    expect(r.baralho.cartoes.map((x) => x.id)).not.toContain('x1')
    await reinserirCartao(r.baralho, r.cartao!, r.pos)
    expect((await obter(b.id))!.cartoes[0].id).toBe('x1')
  })
  it('explica problemas em português', async () => {
    const b = await criar('T')
    expect(problemasDoCartao(b, { id: 'a', tipo: 'associacao', tema: 'geral', frente: 'x', opcoes: ['só uma'], correta: 0 })).toEqual(['precisa de 2 ou mais opções'])
    expect(problemasDoCartao(b, { id: 'a', tipo: 'conceito', tema: 'geral', frente: 'x', verso: 'y' })).toEqual([])
  })
})
