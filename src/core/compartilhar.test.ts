import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listar, obter, salvar } from './baralhos'
import { gravarCartao } from './cartoes'
import { adicionarCartoesRecebidos, aplicar, arquivoDoBaralho, arquivoDosCartoes, importarComoCopia, lerBaralho, lerRecebido, planejar } from './compartilhar'
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
    expect(() => lerBaralho('olá')).toThrow(/não é do tatino/)
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

describe('enviar cartões soltos', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('vai e volta; casa temas pelo nome, cria os que faltam e evita id repetido', async () => {
    const origem: Baralho = {
      id: 'fis',
      titulo: 'Física',
      versao: 1,
      temas: [{ id: 'g', nome: 'Geral' }, { id: 'din', nome: 'Dinâmica' }],
      cartoes: [
        { id: 'a', tipo: 'conceito', tema: 'din', frente: 'O que é força?', verso: 'Interação.' },
        { id: 'b', tipo: 'conceito', tema: 'g', frente: 'B?', verso: 'b' },
      ],
    }
    const { nome, texto } = arquivoDosCartoes(origem, [origem.cartoes[0]])
    expect(nome).toBe('Cartão - O que é força (Tatino).txt')
    const r = lerRecebido(texto)
    expect(r.tipo).toBe('cartoes')
    if (r.tipo !== 'cartoes') return
    expect(r.origem).toBe('Física')
    expect(r.temas).toEqual([{ id: 'din', nome: 'Dinâmica' }])

    // Destino com tema "dinâmica" (outro id) e um cartão de id "a".
    const destino = await salvar({ id: 'meu', titulo: 'Minha física', versao: 1, temas: [{ id: 'x1', nome: 'dinâmica' }], cartoes: [{ id: 'a', tipo: 'conceito', tema: 'x1', frente: 'outro', verso: 'v' }] })
    const b = await adicionarCartoesRecebidos(destino, r)
    expect(b.cartoes).toHaveLength(2)
    expect(b.cartoes[1]).toMatchObject({ tema: 'x1', origem: 'importado', frente: 'O que é força?' })
    expect(b.cartoes[1].id).not.toBe('a')
    expect(b.temas).toHaveLength(1)

    // Tema que não existe no destino é criado.
    const vazio = await salvar({ id: 'v', titulo: 'V', versao: 1, temas: [{ id: 'geral', nome: 'Geral' }], cartoes: [] })
    const b2 = await adicionarCartoesRecebidos(vazio, r)
    expect(b2.temas.map((t) => t.nome)).toEqual(['Geral', 'Dinâmica'])
    expect(b2.cartoes[0].tema).toBe('din')
  })

  it('baralho inteiro continua sendo lido como baralho', () => {
    expect(lerRecebido(arquivoDoBaralho(base()).texto).tipo).toBe('baralho')
    expect(() => lerRecebido('oi')).toThrow(/não é do tatino/)
  })
})

describe('objetivo do baralho', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('baralho e backup antigos (sem objetivo, com prova) continuam válidos', () => {
    const antigo = { ...base(), prova: '2026-12-01' }
    expect(lerBaralho(JSON.stringify(antigo))).toEqual(antigo)
    expect(lerBaralho(arquivoDoBaralho(antigo).texto).prova).toBe('2026-12-01')
  })

  it('objetivo inválido é recusado pelo validador; objetivo válido passa', () => {
    const com = (extra: Partial<Baralho>) => JSON.stringify({ ...base(), ...extra })
    expect(lerBaralho(com({ objetivo: { resumo: 'Conversar no México', nivel: 'nocoes', foco: ['frases'], evitar: ['gramática'] } })).objetivo?.nivel).toBe('nocoes')
    expect(() => lerBaralho(com({ objetivo: { nivel: 'mestre' } as unknown as Baralho['objetivo'] }))).toThrow(/problema/)
    expect(() => lerBaralho(com({ objetivo: { resumo: 'x'.repeat(161) } }))).toThrow(/problema/)
    expect(() => lerBaralho(com({ objetivo: { foco: ['a', 'b', 'c', 'd', 'e', 'f'] } }))).toThrow(/problema/)
    expect(() => lerBaralho(com({ objetivo: { evitar: ['x'.repeat(61)] } }))).toThrow(/problema/)
    expect(() => lerBaralho(com({ objetivo: 'texto' as unknown as Baralho['objetivo'] }))).toThrow(/problema/)
    expect(() => lerBaralho(com({ temas: [{ id: 'g', nome: 'Geral', descricao: 'd'.repeat(121) }] }))).toThrow(/problema/)
  })

  it('receber atualização mantém o objetivo de quem recebe', async () => {
    await aplicar(await planejar({ ...base(), objetivo: { resumo: 'Do autor', nivel: 'iniciante' } }))
    await salvar({ ...(await obter('fis'))!, objetivo: { resumo: 'Meu objetivo', nivel: 'bastante' } })

    await aplicar(await planejar({ ...base(), objetivo: { resumo: 'Do autor, versão 2', nivel: 'iniciante' } }))
    expect((await obter('fis'))!.objetivo).toEqual({ resumo: 'Meu objetivo', nivel: 'bastante' })
  })

  it('se quem recebe não tem objetivo, entra o recebido', async () => {
    await aplicar(await planejar(base()))
    await aplicar(await planejar({ ...base(), objetivo: { resumo: 'Do autor' } }))
    expect((await obter('fis'))!.objetivo).toEqual({ resumo: 'Do autor' })
  })
})
