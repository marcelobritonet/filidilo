import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { hidrodinamica } from '../decks/carregar'
import { criar, duplicar, excluir, listar, restaurar, salvar, semear } from './baralhos'
import { db } from './db'
import { registrar } from './srs'

const semente = () => structuredClone(hidrodinamica)

describe('baralhos no aparelho', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('semeia Hidrodinâmica uma única vez e mantém o progresso da fase 1', async () => {
    // Progresso gravado antes da fase 2 (mesma chave "baralho/cartão").
    await registrar('hidrodinamica/cc-001', 3, 'prova')
    await semear([semente])
    const l = await listar()
    expect(l.map((b) => b.id)).toEqual(['hidrodinamica'])
    expect(l[0].cartoes.length).toBe(hidrodinamica.cartoes.length)
    expect((await db.estados.get('hidrodinamica/cc-001'))?.ultimaNota).toBe(3)

    // Se ela excluir, o app não recria.
    await excluir('hidrodinamica')
    await semear([semente])
    expect(await listar()).toEqual([])
  })

  it('cria, duplica (sem progresso), exclui e restaura', async () => {
    const b = await criar('Física 1')
    expect(b.id).toMatch(/^fisica-1-[a-z0-9]{1,4}$/)
    expect(b.temas).toEqual([{ id: 'geral', nome: 'Geral' }])
    await salvar({ ...b, cartoes: [{ id: 'c1', tipo: 'vf', tema: 'geral', frente: 'x', resposta: true }] })
    const d = await duplicar(b.id)
    expect(d.titulo).toBe('Cópia de Física 1')
    expect(d.id).not.toBe(b.id)
    expect(d.cartoes).toHaveLength(1)
    const removido = await excluir(b.id)
    expect((await listar()).map((x) => x.id)).toEqual([d.id])
    await restaurar(removido!)
    expect(await listar()).toHaveLength(2)
  })
})
