import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listar, obter, salvar } from './baralhos'
import { gravarCartao } from './cartoes'
import { aplicar, arquivoDoBaralho, importarComoCopia, lerBaralho, planejar } from './compartilhar'
import { db } from './db'
import type { Baralho, CartaoConceito } from './types'

const base = (): Baralho => ({
  id: 'fis',
  titulo: 'Física',
  versao: 1,
  temas: [{ id: 'g', nome: 'Geral' }],
  cartoes: [
    { id: 'a', tipo: 'conceito', tema: 'g', frente: 'A?', verso: 'a' },
    { id: 'b', tipo: 'conceito', tema: 'g', frente: 'B?', verso: 'b' },
    { id: 'c', tipo: 'conceito', tema: 'g', frente: 'C?', verso: 'c' },
  ],
})

describe('compartilhar baralho', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('o arquivo vai e volta igual; recusa backup e texto qualquer', () => {
    const { nome, texto } = arquivoDoBaralho(base())
    expect(nome).toBe('Física (Tatino).txt')
    expect(lerBaralho(texto)).toEqual(base())
    expect(lerBaralho(JSON.stringify(base()))).toEqual(base()) // baralho "cru"
    expect(() => lerBaralho('{"app":"tatino","estados":[]}')).toThrow(/backup/)
    expect(() => lerBaralho('olá')).toThrow(/não é um baralho/)
    expect(() => lerBaralho(JSON.stringify({ ...base(), cartoes: [{ id: 'x', tipo: 'vf', tema: 'zz', frente: 'f', resposta: true }] }))).toThrow(/problema/)
  })

  it('baralho novo entra inteiro, marcado como importado', async () => {
    const p = await planejar(base())
    expect(p.atual).toBeUndefined()
    expect(p.novos).toHaveLength(3)
    const b = await aplicar(p)
    expect(b.cartoes.every((c) => c.origem === 'importado')).toBe(true)
  })

  it('atualização troca o que mudou, preserva o editado, acrescenta e não apaga', async () => {
    await aplicar(await planejar(base()))
    // Ela edita o cartão "b" e cria um cartão só dela.
    let meu = (await obter('fis'))!
    meu = await gravarCartao(meu, { ...(meu.cartoes[1] as CartaoConceito), verso: 'b (minha versão)' })
    meu = await gravarCartao(meu, { id: 'meu', tipo: 'conceito', tema: 'g', frente: 'Meu?', verso: 'meu' })
    await salvar({ ...meu, titulo: 'Física da Tati' })

    // Eu corrijo "a" e "b", acrescento "d" e um tema novo.
    const correcao = base()
    correcao.cartoes[0] = { ...(correcao.cartoes[0] as CartaoConceito), verso: 'a corrigido' }
    correcao.cartoes[1] = { ...(correcao.cartoes[1] as CartaoConceito), verso: 'b corrigido' }
    correcao.temas.push({ id: 'n', nome: 'Novo' })
    correcao.cartoes.push({ id: 'd', tipo: 'conceito', tema: 'n', frente: 'D?', verso: 'd' })

    const p = await planejar(correcao)
    expect(p.atualizados.map((c) => c.id)).toEqual(['a'])
    expect(p.preservados.map((c) => c.id)).toEqual(['b'])
    expect(p.novos.map((c) => c.id)).toEqual(['d'])
    expect(p.iguais).toBe(1)
    expect(p.soNoMeu).toBe(1)

    const b = await aplicar(p)
    const v = Object.fromEntries(b.cartoes.map((c) => [c.id, c.tipo === 'conceito' ? c.verso : '']))
    expect(v).toEqual({ a: 'a corrigido', b: 'b (minha versão)', c: 'c', meu: 'meu', d: 'd' })
    expect(b.titulo).toBe('Física da Tati')
    expect(b.temas.map((t) => t.id)).toEqual(['g', 'n'])
  })

  it('importar como cópia não toca no original', async () => {
    await aplicar(await planejar(base()))
    const c = await importarComoCopia(base())
    expect(c.titulo).toBe('Física (recebido)')
    expect((await listar()).map((b) => b.id).sort()).toEqual(['fis', c.id].sort())
  })
})
