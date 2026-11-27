import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { instantaneo, juntarBaralho, mesclarTudo, type Backup } from './backup'
import { excluir, gravarOrdem, lerOrdem, restaurar, salvar } from './baralhos'
import { excluirCartao, gravarCartao, reinserirCartao } from './cartoes'
import { db } from './db'
import { vazios } from './excluidos'
import type { Baralho, Cartao } from './types'

const cartao = (id: string, frente = id, atualizadoEm?: number): Cartao => ({ id, tipo: 'conceito', tema: 'geral', frente, verso: 'v', ...(atualizadoEm && { atualizadoEm }) })
const baralho = (id: string, cartoes: Cartao[], atualizadoEm = 1): Baralho => ({ id, titulo: id, versao: 1, temas: [{ id: 'geral', nome: 'Geral' }], cartoes, criadoEm: 1, atualizadoEm })

const limpar = () => Promise.all(db.tables.map((t) => t.clear()))

/** Troca o "aparelho": o banco passa a ter exatamente os dados do instantâneo. */
async function virar(s: Backup) {
  await limpar()
  await mesclarTudo(s)
}

const semData = (s: Backup) => ({ ...s, data: '' })

beforeEach(limpar)

describe('juntarBaralho', () => {
  it('fica com o cartão mais recente de cada lado e com os cartões novos dos dois', () => {
    const a = baralho('b', [cartao('1', 'A editou', 50), cartao('2'), cartao('3', 'só A', 40)], 50)
    const b = baralho('b', [cartao('1', 'velho', 10), cartao('2', 'B editou', 60), cartao('4', 'só B', 60)], 60)
    const j = juntarBaralho(a, b, vazios())
    expect(Object.fromEntries(j.cartoes.map((c) => [c.id, 'frente' in c ? c.frente : '']))).toEqual({ '1': 'A editou', '2': 'B editou', '3': 'só A', '4': 'só B' })
    expect(j.atualizadoEm).toBe(60)
  })
  it('cartão excluído não volta, a não ser que tenha sido mexido depois', () => {
    const a = baralho('b', [cartao('1', 'x', 10), cartao('2', 'y', 90)])
    const ex = { baralhos: {}, cartoes: { 'b/1': 50, 'b/2': 50 } }
    expect(juntarBaralho(a, a, ex).cartoes.map((c) => c.id)).toEqual(['2'])
  })
  it('favoritar num aparelho chega no outro (e desfavoritar também)', () => {
    const outro = baralho('b', [cartao('1', '1', 10)])
    const fav = baralho('b', [{ ...cartao('1', '1', 20), favoritoEm: 20 }])
    expect(juntarBaralho(outro, fav, vazios()).cartoes[0].favoritoEm).toBe(20)
    const tirou = baralho('b', [cartao('1', '1', 30)])
    expect(juntarBaralho(fav, tirou, vazios()).cartoes[0].favoritoEm).toBeUndefined()
  })
})

describe('mesclarTudo entre dois aparelhos', () => {
  it('converge: A e B mexem em cartões diferentes do mesmo baralho e os dois ficam', async () => {
    await salvar(baralho('b', [cartao('1'), cartao('2')]))
    const base = await instantaneo()

    const b0 = (await db.baralhos.get('b'))!
    await gravarCartao(b0, cartao('1', 'A editou'))
    const a = await instantaneo()

    await virar(base)
    await gravarCartao((await db.baralhos.get('b'))!, cartao('2', 'B editou'))
    await gravarCartao((await db.baralhos.get('b'))!, cartao('3', 'B criou'))
    await mesclarTudo(a) // B recebe A
    const b = await instantaneo()

    await virar(a)
    await mesclarTudo(b) // A recebe B
    const final = await instantaneo()
    const frentes = (s: Backup) => Object.fromEntries(s.baralhos![0].cartoes.map((c) => [c.id, 'frente' in c ? c.frente : '']))
    expect(frentes(final)).toEqual({ '1': 'A editou', '2': 'B editou', '3': 'B criou' })
    expect(frentes(b)).toEqual(frentes(final))
  })

  it('baralho e cartão excluídos em A não voltam ao juntar com B, nem na volta', async () => {
    await salvar(baralho('fica', [cartao('1'), cartao('2')]))
    await salvar(baralho('sai', [cartao('x')]))
    const b = await instantaneo()

    await excluirCartao((await db.baralhos.get('fica'))!, '2')
    await excluir('sai')
    const a = await instantaneo()

    await virar(b)
    const r = await mesclarTudo(a)
    expect(r.removidos).toBe(1)
    expect(await db.baralhos.get('sai')).toBeUndefined()
    expect((await db.baralhos.get('fica'))!.cartoes.map((c) => c.id)).toEqual(['1'])

    // A recebe a cópia velha de B (de antes da exclusão): nada volta.
    await virar(a)
    await mesclarTudo(b)
    expect(await db.baralhos.get('sai')).toBeUndefined()
    expect((await db.baralhos.get('fica'))!.cartoes.map((c) => c.id)).toEqual(['1'])
  })

  it('desfazer a exclusão vence a exclusão que o outro aparelho já recebeu', async () => {
    await salvar(baralho('b', [cartao('1'), cartao('2')]))
    const removido = await excluir('b')
    const r = await excluirCartao(baralho('c', [cartao('9')]), '9')
    const comExclusao = await instantaneo()
    await new Promise((ok) => setTimeout(ok, 2))
    await restaurar(removido!)
    if (r.cartao) await reinserirCartao(r.baralho, r.cartao, r.pos)
    const desfeito = await instantaneo()

    await virar(comExclusao)
    await mesclarTudo(desfeito)
    expect(await db.baralhos.get('b')).toBeDefined()
  })

  it('a ordem escolhida por último vence', async () => {
    await salvar(baralho('x', []))
    await salvar(baralho('y', []))
    await gravarOrdem(['x', 'y'], 10)
    const a = await instantaneo()
    await gravarOrdem(['y', 'x'], 20)
    const b = await instantaneo()
    await virar(b)
    await mesclarTudo(a)
    expect(await lerOrdem()).toEqual(['y', 'x'])
    await virar(a)
    await mesclarTudo(b)
    expect(await lerOrdem()).toEqual(['y', 'x'])
  })

  it('juntar de novo o que já foi juntado não muda nada', async () => {
    await salvar(baralho('b', [cartao('1')]))
    await db.revisoes.add({ id: 'r1', cartao: 'b/1', data: 5, nota: 3 } as never)
    const a = await instantaneo()
    const r = await mesclarTudo(a)
    expect(r).toEqual({ estados: 0, revisoes: 0, baralhos: 0, removidos: 0 })
    expect(semData(await instantaneo())).toEqual(semData(a))
  })

  it('o baralho de fábrica recém-instalado perde para a versão do outro aparelho', async () => {
    const { semear } = await import('./baralhos')
    await semear([() => ({ baralho: baralho('fab', [cartao('1', 'de fábrica')]) })])
    expect((await db.baralhos.get('fab'))!.atualizadoEm).toBe(0)
    const novo = await instantaneo()
    await limpar()
    await salvar(baralho('fab', [cartao('1', 'de fábrica')]))
    await excluir('fab')
    const outro = await instantaneo()
    await virar(novo)
    await mesclarTudo(outro)
    expect(await db.baralhos.get('fab')).toBeUndefined()
  })
})
