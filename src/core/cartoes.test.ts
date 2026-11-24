import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { criar, obter } from './baralhos'
import { adicionarCartoes, arquivarCartao, ativos, desarquivarCartao, excluirCartao, gravarCartao, lerLista, problemasDoCartao, reinserirCartao } from './cartoes'
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
  it('cartão corrigido continua corrigido quando entram cartões novos de uma cópia velha do baralho', async () => {
    const velho = await gravarCartao(await criar('Teste'), { id: 'x1', tipo: 'conceito', tema: 'geral', frente: 'Pergunta', verso: 'errada' })
    // Corrigido na sessão; a tela de Criar com IA ainda tem `velho`.
    await gravarCartao(velho, { id: 'x1', tipo: 'conceito', tema: 'geral', frente: 'Pergunta', verso: 'certa' })
    const b = await adicionarCartoes(velho, [{ id: 'ia-1', tipo: 'conceito', tema: 'novo', frente: 'Nova', verso: 'v' }], [{ id: 'novo', nome: 'Novo' }])
    expect(b.cartoes.find((c) => c.id === 'x1')).toMatchObject({ verso: 'certa', editado: true })
    expect(b.cartoes.map((c) => c.id)).toEqual(['x1', 'ia-1'])
    expect((await obter(b.id))!.temas.map((t) => t.id)).toEqual(['geral', 'novo'])
    // Tema que já existe não duplica.
    const de2 = await adicionarCartoes(velho, [{ id: 'ia-2', tipo: 'conceito', tema: 'novo', frente: 'Outra', verso: 'v' }], [{ id: 'novo', nome: 'Novo' }])
    expect(de2.temas.map((t) => t.id)).toEqual(['geral', 'novo'])
    expect(de2.cartoes.map((c) => c.id)).toEqual(['x1', 'ia-1', 'ia-2'])
  })
  it('duas correções a partir da mesma cópia ficam as duas', async () => {
    let velho = await criar('Teste')
    velho = await adicionarCartoes(velho, [
      { id: 'a', tipo: 'conceito', tema: 'geral', frente: 'A', verso: '1' },
      { id: 'b', tipo: 'conceito', tema: 'geral', frente: 'B', verso: '1' },
    ])
    await gravarCartao(velho, { id: 'a', tipo: 'conceito', tema: 'geral', frente: 'A', verso: '2' })
    await gravarCartao(velho, { id: 'b', tipo: 'conceito', tema: 'geral', frente: 'B', verso: '2' })
    const b = (await obter(velho.id))!
    expect(b.cartoes.map((c) => c.tipo === 'conceito' && c.verso)).toEqual(['2', '2'])
  })
  it('explica problemas em português', async () => {
    const b = await criar('T')
    expect(problemasDoCartao(b, { id: 'a', tipo: 'associacao', tema: 'geral', frente: 'x', opcoes: ['só uma'], correta: 0 })).toEqual(['precisa de 2 ou mais opções'])
    expect(problemasDoCartao(b, { id: 'a', tipo: 'conceito', tema: 'geral', frente: 'x', verso: 'y' })).toEqual([])
  })
  it('arquivar tira o cartão dos ativos sem apagar nem marcar edição, e não desfaz correção feita numa cópia velha', async () => {
    const velho = await gravarCartao(await criar('Teste'), { id: 'x1', tipo: 'conceito', tema: 'geral', frente: 'Pergunta', verso: 'errada' })
    await gravarCartao(velho, { id: 'x1', tipo: 'conceito', tema: 'geral', frente: 'Pergunta', verso: 'certa' })
    const novo = await gravarCartao(velho, { id: 'x2', tipo: 'conceito', tema: 'geral', frente: 'Outra', verso: 'resposta' })
    const arq = await arquivarCartao(velho, 'x2')
    expect(arq.cartoes.map((c) => c.id)).toEqual(['x1', 'x2'])
    expect(ativos(arq).map((c) => c.id)).toEqual(['x1'])
    const x2 = arq.cartoes.find((c) => c.id === 'x2')!
    expect(x2.arquivadoEm).toBeGreaterThan(0)
    expect(x2.editado).toBe(novo.cartoes.find((c) => c.id === 'x2')!.editado)
    expect(arq.cartoes[0].tipo === 'conceito' && arq.cartoes[0].verso).toBe('certa')
    const editado = await gravarCartao(velho, { id: 'x2', tipo: 'conceito', tema: 'geral', frente: 'Outra', verso: 'resposta nova' })
    expect(ativos(editado).map((c) => c.id)).toEqual(['x1'])
    const volta = await desarquivarCartao(velho, 'x2')
    expect(ativos(volta).map((c) => c.id)).toEqual(['x1', 'x2'])
  })
})
