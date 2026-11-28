import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listar, obter, salvar } from './baralhos'
import { gravarCartao } from './cartoes'
import { adicionarCartoesRecebidos, aplicar, arquivoDoBaralho, arquivoDosCartoes, importarComoCopia, lerBaralho, lerRecebido, planejar } from './compartilhar'
import { db, type Nota } from './db'
import { progressoDoBaralho } from './progresso'
import { registrar } from './srs'
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
    expect(nome).toBe('Física (Filidilo).txt')
    expect(lerBaralho(texto)).toEqual(base())
    expect(lerBaralho(JSON.stringify(base()))).toEqual(base()) // baralho "cru"
    // Cartão de um tipo de uma versão mais nova fica de fora; o resto do baralho entra (P140).
    const comNovo = { ...base(), cartoes: [...base().cartoes, { id: 'n1', tipo: 'tipo-do-futuro', tema: base().temas[0].id }] }
    expect(lerBaralho(JSON.stringify(comNovo))).toEqual(base())
    expect(() => lerBaralho('{"app":"tatino","estados":[]}')).toThrow(/backup/)
    expect(() => lerBaralho('olá')).toThrow(/não é do Filidilo/)
    expect(() => lerBaralho(JSON.stringify({ ...base(), cartoes: [{ id: 'x', tipo: 'vf', tema: 'zz', frente: 'f', resposta: true }] }))).toThrow(/problema/)
  })

  it('arquivado não vai no arquivo; receber atualização de um baralho arquivado aqui mantém arquivado', async () => {
    const lido = lerBaralho(arquivoDoBaralho({ ...base(), arquivadoEm: 123 }).texto)
    expect(lido.arquivadoEm).toBeUndefined()
    await salvar({ ...base(), arquivadoEm: 123 })
    const novo = { ...base(), cartoes: [...base().cartoes, { id: 'd', tipo: 'conceito' as const, tema: 'g', frente: 'D?', verso: 'd' }] }
    const b = await aplicar(await planejar(novo))
    expect(b.arquivadoEm).toBe(123)
    expect(b.cartoes.length).toBe(4)
  })

  it('cartão arquivado vai como comum sem progresso e arquivado com progresso; atualizar mantém o arquivado daqui', async () => {
    const comArquivado = { ...base(), cartoes: base().cartoes.map((c) => (c.id === 'b' ? { ...c, arquivadoEm: 123 } : c)) }
    expect(lerBaralho(arquivoDoBaralho(comArquivado).texto).cartoes.every((c) => !c.arquivadoEm)).toBe(true)
    const progresso = { estados: [], revisoes: [], marcas: [] }
    expect(lerBaralho(arquivoDoBaralho(comArquivado, progresso).texto).cartoes[1].arquivadoEm).toBe(123)
    expect(JSON.parse(arquivoDosCartoes(comArquivado, [comArquivado.cartoes[1]]).texto).cartoes[0].arquivadoEm).toBeUndefined()
    await salvar(comArquivado)
    // Igual ao daqui, só sem a marca: não conta como atualização.
    expect((await planejar(base())).iguais).toBe(3)
    const recebido = { ...base(), cartoes: base().cartoes.map((c) => (c.id === 'b' ? { ...c, verso: 'b novo' } : c)) }
    const plano = await planejar(recebido)
    expect(plano.atualizados.map((c) => c.id)).toEqual(['b'])
    const b = await aplicar(plano)
    const cb = b.cartoes.find((c) => c.id === 'b')!
    expect(cb.tipo === 'conceito' && cb.verso).toBe('b novo')
    expect(cb.arquivadoEm).toBe(123)
  })

  it('favorito não vai no arquivo sem progresso; atualizar mantém o favorito daqui', async () => {
    const comFav = { ...base(), cartoes: base().cartoes.map((c) => (c.id === 'b' ? { ...c, favoritoEm: 77 } : c)) }
    expect(lerBaralho(arquivoDoBaralho(comFav).texto).cartoes.every((c) => !c.favoritoEm)).toBe(true)
    expect(lerBaralho(arquivoDoBaralho(comFav, { estados: [], revisoes: [], marcas: [] }).texto).cartoes[1].favoritoEm).toBe(77)
    expect(JSON.parse(arquivoDosCartoes(comFav, [comFav.cartoes[1]]).texto).cartoes[0].favoritoEm).toBeUndefined()
    await salvar(comFav)
    expect((await planejar(base())).iguais).toBe(3)
    const recebido = { ...base(), cartoes: base().cartoes.map((c) => (c.id === 'b' ? { ...c, verso: 'b novo' } : c)) }
    const b = await aplicar(await planejar(recebido))
    expect(b.cartoes.find((c) => c.id === 'b')!.favoritoEm).toBe(77)
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
    expect(nome).toBe('Cartão - O que é força (Filidilo).txt')
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
    expect(() => lerRecebido('oi')).toThrow(/não é do Filidilo/)
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

describe('enviar baralho com o progresso', () => {
  beforeEach(async () => {
    await Promise.all([db.baralhos.clear(), db.estados.clear(), db.revisoes.clear(), db.marcas.clear()])
  })

  const estudar = async (baralho: string, cartao: string, nota: Nota) => registrar(`${baralho}/${cartao}`, nota, 'espacada')

  it('o progresso vai só se pedido, e só o do baralho', async () => {
    await salvar(base())
    await salvar({ ...base(), id: 'outro' })
    await estudar('fis', 'a', 3)
    await estudar('outro', 'a', 1)
    await db.marcas.put({ cartao: 'fis/b', status: 'erro', nota: 'x', data: 1 })
    const p = await progressoDoBaralho('fis')
    expect(p.estados.map((e) => e.id)).toEqual(['fis/a'])
    expect(p.revisoes).toHaveLength(1)
    expect(p.revisoes[0]).not.toHaveProperty('seq')
    expect(p.marcas.map((m) => m.cartao)).toEqual(['fis/b'])

    expect(lerRecebido(arquivoDoBaralho(base()).texto)).toMatchObject({ tipo: 'baralho', progresso: undefined })
    const com = arquivoDoBaralho(base(), p)
    expect(com.nome).toContain('com progresso')
    const lido = lerRecebido(com.texto)
    expect(lido.tipo === 'baralho' && lido.progresso?.estados.map((e) => e.id)).toEqual(['fis/a'])
  })

  it('descarta progresso de outro baralho ou malformado', () => {
    const texto = JSON.stringify({
      app: 'tatino',
      tipo: 'baralho',
      formato: 2,
      baralho: base(),
      progresso: { estados: [{ id: 'outro/a', fsrs: {}, ultimaData: 1 }, { id: 'fis/a' }], revisoes: 'x', marcas: [] },
    })
    expect(lerRecebido(texto)).toMatchObject({ tipo: 'baralho', progresso: undefined })
  })

  it('noutro aparelho: baralho novo chega estudado; o mais recente vence; respostas não duplicam', async () => {
    await salvar(base())
    await estudar('fis', 'a', 3)
    await estudar('fis', 'b', 1)
    const texto = arquivoDoBaralho((await obter('fis'))!, await progressoDoBaralho('fis')).texto

    // "Outro aparelho": banco limpo.
    await Promise.all([db.baralhos.clear(), db.estados.clear(), db.revisoes.clear()])
    const lido = lerRecebido(texto)
    if (lido.tipo !== 'baralho') throw new Error('tipo')
    const plano = await planejar(lido.baralho, lido.progresso)
    expect(plano.estudados).toBe(2)
    await aplicar(plano, { comProgresso: true })
    const a = await db.estados.get('fis/a')
    expect(a?.ultimaNota).toBe(3)
    expect(a?.fsrs.due).toBeInstanceOf(Date)
    expect(await db.revisoes.count()).toBe(2)

    // Aqui ela estuda "b" de novo depois; receber o mesmo arquivo outra vez não volta atrás nem duplica.
    await new Promise((r) => setTimeout(r, 2))
    await estudar('fis', 'b', 4)
    await aplicar(await planejar(lido.baralho, lido.progresso), { comProgresso: true })
    expect((await db.estados.get('fis/b'))?.ultimaNota).toBe(4)
    expect(await db.revisoes.count()).toBe(3)
  })

  it('sem marcar, o progresso não entra; como cópia, vai para o baralho novo', async () => {
    await salvar(base())
    await estudar('fis', 'a', 3)
    const lido = lerRecebido(arquivoDoBaralho(base(), await progressoDoBaralho('fis')).texto)
    if (lido.tipo !== 'baralho') throw new Error('tipo')
    await Promise.all([db.baralhos.clear(), db.estados.clear(), db.revisoes.clear()])

    await aplicar(await planejar(lido.baralho, lido.progresso), { comProgresso: false })
    expect(await db.estados.count()).toBe(0)

    const copia = await importarComoCopia(lido.baralho, lido.progresso)
    expect(copia.id).not.toBe('fis')
    expect((await db.estados.toArray()).map((e) => e.id)).toEqual([`${copia.id}/a`])
    expect((await db.revisoes.toArray()).map((r) => r.cartao)).toEqual([`${copia.id}/a`])
  })
})

describe('desafio', () => {
  it('o baralho leva o cartão do desafio e quem recebe sabe qual responder', () => {
    const r = lerRecebido(arquivoDoBaralho(base(), undefined, 'b').texto)
    expect(r.tipo).toBe('baralho')
    expect(r.desafio?.id).toBe('b')
  })
  it('cartão solto também', () => {
    const b = base()
    expect(lerRecebido(arquivoDosCartoes(b, [b.cartoes[2]], 'c').texto).desafio).toMatchObject({ id: 'c', frente: 'C?' })
  })
  it('sem desafio, ou com id que não existe, abre como antes', () => {
    expect(lerRecebido(arquivoDoBaralho(base()).texto).desafio).toBeUndefined()
    expect(lerRecebido(arquivoDoBaralho(base(), undefined, 'zz').texto).desafio).toBeUndefined()
  })
})
