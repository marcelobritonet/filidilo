import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { baralhosDeFabrica } from '../decks/carregar'
import { criar, duplicar, excluir, listar, restaurar, salvar, semear } from './baralhos'
import { db } from './db'
import { registrar } from './srs'

const fabrica = baralhosDeFabrica[0]
const semente = () => ({ baralho: structuredClone(fabrica) })

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

  it('versão nova de fábrica troca os cartões retirados e mantém os da pessoa e o progresso', async () => {
    const v1 = { id: 'x', titulo: 'X', versao: 1, temas: [{ id: 'a', nome: 'A' }], cartoes: [
      { id: 'velho', tipo: 'vf' as const, tema: 'a', frente: 'spoiler', resposta: true },
      { id: 'fica', tipo: 'vf' as const, tema: 'a', frente: 'ok', resposta: true },
    ] }
    await semear([() => ({ baralho: structuredClone(v1) })])
    const instalado = (await listar())[0]
    await salvar({ ...instalado, cartoes: [...instalado.cartoes, { id: 'meu', tipo: 'vf', tema: 'a', frente: 'meu', resposta: false }] })
    await registrar('x/fica', 3, 'prova')

    const v2 = { ...v1, versao: 2, cartoes: [v1.cartoes[1], { id: 'novo', tipo: 'vf' as const, tema: 'a', frente: 'novo', resposta: true }] }
    const s2 = () => ({ baralho: structuredClone(v2), retirados: ['velho'] })
    await semear([s2])
    await semear([s2])
    const b = (await listar())[0]
    expect(b.versao).toBe(2)
    expect(b.cartoes.map((c) => c.id)).toEqual(['fica', 'meu', 'novo'])
    expect((await db.estados.get('x/fica'))?.ultimaNota).toBe(3)

    // Excluído não volta, nem com versão nova.
    await excluir('x')
    await semear([() => ({ baralho: { ...structuredClone(v2), versao: 3 } })])
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
