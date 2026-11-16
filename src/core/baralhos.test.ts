import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { baralhosDeFabrica } from '../decks/carregar'
import { criar, duplicar, excluir, listar, restaurar, salvar, semear } from './baralhos'
import { db } from './db'
import { registrar } from './srs'

const fabrica = baralhosDeFabrica[0]
const semente = () => structuredClone(fabrica)

describe('baralhos no aparelho', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('semeia o baralho de fábrica uma única vez e mantém o progresso', async () => {
    await registrar(`${fabrica.id}/${fabrica.cartoes[0].id}`, 3, 'prova')
    await semear([semente])
    const l = await listar()
    expect(l.map((b) => b.id)).toEqual([fabrica.id])
    expect(l[0].cartoes.length).toBe(fabrica.cartoes.length)
    expect((await db.estados.get(`${fabrica.id}/${fabrica.cartoes[0].id}`))?.ultimaNota).toBe(3)

    // Se a pessoa excluir, o app não recria.
    await excluir(fabrica.id)
    await semear([semente])
    expect(await listar()).toEqual([])
  })

  it('quem já usava o app recebe o baralho novo uma vez, sem perder os seus', async () => {
    // Aparelho da versão anterior: marca antiga e um baralho próprio.
    await db.meta.put({ chave: 'semeado', valor: '1' })
    const meu = await criar('Meu baralho')
    await semear([semente])
    expect((await listar()).map((b) => b.id).sort()).toEqual([fabrica.id, meu.id].sort())
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
