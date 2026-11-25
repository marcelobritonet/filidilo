import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const eventos: { nome: string; props?: Record<string, unknown> }[] = []
vi.mock('./telemetria', () => ({ evento: (nome: string, props?: Record<string, unknown>) => eventos.push({ nome, props }) }))
vi.mock('./link', () => ({ URL_LINKS: 'https://api.teste', URL_PUBLICA: 'https://filidilo.teste' }))

const { instantaneo, mesclarTudo } = await import('./backup')
const { salvar } = await import('./baralhos')
const { gravarCartao } = await import('./cartoes')
const { db } = await import('./db')
const sync = await import('./sync')

/** Worker de mentira: guarda o cofre e confere a x-chave como o de verdade. */
function servidor() {
  const cofres = new Map<string, { dados: Uint8Array<ArrayBuffer>; chave: string }>()
  const f = (async (url: string, init?: RequestInit) => {
    const id = new URL(url).pathname.replace('/s/', '')
    const metodo = init?.method ?? 'GET'
    const chave = (init?.headers as Record<string, string> | undefined)?.['x-chave'] ?? ''
    const c = cofres.get(id)
    if (metodo === 'GET') return c ? new Response(c.dados) : new Response(null, { status: 404 })
    if (c && c.chave !== chave) return new Response(null, { status: 403 })
    if (metodo === 'DELETE') return cofres.delete(id) ? new Response(null, { status: 204 }) : new Response(null, { status: 404 })
    cofres.set(id, { dados: new Uint8Array(init!.body as Uint8Array<ArrayBuffer>), chave })
    return new Response('{"ok":true}')
  }) as typeof fetch
  return { f, cofres }
}

const limpar = () => Promise.all(db.tables.map((t) => t.clear()))
const baralho = (cartoes: string[]) => ({ id: 'b', titulo: 'B', versao: 1, temas: [{ id: 'geral', nome: 'Geral' }], cartoes: cartoes.map((id) => ({ id, tipo: 'conceito' as const, tema: 'geral', frente: id, verso: 'v' })) })

beforeEach(async () => {
  await limpar()
  eventos.length = 0
})

describe('código', () => {
  it('cria, formata e lê de volta, aceitando o jeito que a pessoa digita', () => {
    const c = sync.criarCodigo()
    expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(sync.lerCodigo(c)).toBe(c)
    expect(sync.lerCodigo(sync.formatarCodigo(c))).toBe(c)
    expect(sync.lerCodigo(` ${sync.formatarCodigo(c).toLowerCase()} `)).toBe(c)
    expect(sync.lerCodigo(c.replace(/1/g, 'l').replace(/0/g, 'o'))).toBe(c)
    expect(sync.lerCodigo('FILI-1234')).toBeNull()
    expect(sync.lerCodigo(c.slice(0, 25) + 'U')).toBeNull()
  })
  it('o mesmo código dá o mesmo endereço; códigos diferentes, endereços diferentes', async () => {
    const c = sync.criarCodigo()
    const a = await sync.derivar(c)
    expect(a.endereco).toMatch(/^[0-9a-f]{32}$/)
    expect((await sync.derivar(c)).endereco).toBe(a.endereco)
    expect((await sync.derivar(sync.criarCodigo())).endereco).not.toBe(a.endereco)
    expect(a.xChave.length).toBeGreaterThanOrEqual(16)
  })
  it('cifra e decifra; com outro código não abre', async () => {
    const { chave } = await sync.derivar(sync.criarCodigo())
    const cofre = await sync.cifrar({ oi: 'olá', n: [1, 2] }, chave)
    expect(new TextDecoder().decode(cofre)).not.toContain('olá')
    expect(await sync.decifrar(cofre, chave)).toEqual({ oi: 'olá', n: [1, 2] })
    const outra = (await sync.derivar(sync.criarCodigo())).chave
    await expect(sync.decifrar(cofre, outra)).rejects.toThrow('cifra')
  })
  it('o link leva o código depois do #', () => {
    expect(sync.linkDoCodigo('ABC', 'http://x', '/filidilo/', 'https://filidilo.teste')).toBe('https://filidilo.teste/#sync=ABC')
    expect(sync.linkDoCodigo('ABC', 'http://localhost:5173', '/filidilo/', '')).toBe('http://localhost:5173/filidilo/#sync=ABC')
  })
})

describe('dois aparelhos', () => {
  it('A começa, B liga com o código, os dois mexem e ficam iguais', async () => {
    const { f, cofres } = servidor()
    await salvar(baralho(['1']))
    expect((await sync.comecar(f)).ok).toBe(true)
    const codigo = (await sync.lerEstado())!.codigo
    const aparelhoA = await instantaneo()

    // B: outro aparelho, com um baralho dele.
    await limpar()
    await salvar({ ...baralho([]), id: 'deB', titulo: 'De B' })
    expect((await sync.ligar(sync.formatarCodigo(codigo), 'qr', f)).ok).toBe(true)
    expect((await db.baralhos.toArray()).map((b) => b.id).sort()).toEqual(['b', 'deB'])
    await gravarCartao((await db.baralhos.get('b'))!, { id: '2', tipo: 'conceito', tema: 'geral', frente: 'de B', verso: 'v' })
    expect((await sync.sincronizar('botao', f)).subiu).toBe(true)

    // Volta para A.
    await limpar()
    await mesclarTudo(aparelhoA)
    await db.meta.put({ chave: sync.CHAVE_SYNC, valor: JSON.stringify({ codigo }) })
    const r = await sync.sincronizar('abrir', f)
    expect(r.ok).toBe(true)
    expect((await db.baralhos.get('b'))!.cartoes.map((c) => c.id)).toEqual(['1', '2'])
    expect(await db.baralhos.get('deB')).toBeDefined()

    // Sem novidade: não regrava o cofre.
    expect((await sync.sincronizar('abrir', f)).subiu).toBe(false)
    expect(cofres.size).toBe(1)
  })

  it('sincronizar antes de ligar não trava as próximas sincronizações', async () => {
    const { f, cofres } = servidor()
    expect((await sync.sincronizar('abrir', f)).motivo).toBe('desligado')
    await sync.comecar(f)
    await salvar(baralho(['1']))
    expect((await sync.sincronizar('botao', f)).ok).toBe(true)
    expect(cofres.size).toBe(1)
  })

  it('código que não existe não liga o aparelho', async () => {
    const { f } = servidor()
    const r = await sync.ligar(sync.criarCodigo(), 'codigo', f)
    expect(r).toEqual({ ok: false, motivo: 'nao_encontrado' })
    expect(await sync.lerEstado()).toBeNull()
    expect((await sync.ligar('errado', 'codigo', f)).motivo).toBe('codigo_invalido')
  })

  it('trocar o código apaga o cofre velho; o aparelho com o código velho recebe erro e fica pendente', async () => {
    const { f, cofres } = servidor()
    await sync.comecar(f)
    const velho = (await sync.lerEstado())!.codigo
    expect((await sync.trocarCodigo(f)).ok).toBe(true)
    const novo = (await sync.lerEstado())!.codigo
    expect(novo).not.toBe(velho)
    expect(cofres.has((await sync.derivar(velho)).endereco)).toBe(false)
    expect(cofres.has((await sync.derivar(novo)).endereco)).toBe(true)

    await db.meta.put({ chave: sync.CHAVE_SYNC, valor: JSON.stringify({ codigo: velho }) })
    expect((await sync.sincronizar('abrir', f)).motivo).toBe('nao_encontrado')
    expect(await sync.lerEstado()).toMatchObject({ pendente: true, erro: 'nao_encontrado' })
  })

  it('sem internet fica pendente e não manda estatística no automático', async () => {
    const { f } = servidor()
    await sync.comecar(f)
    eventos.length = 0
    const semRede = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    const r = await sync.sincronizar('abrir', semRede)
    expect(r.ok).toBe(false)
    expect((await sync.lerEstado())!.pendente).toBe(true)
    expect(eventos.filter((e) => e.nome === 'sync_erro' && e.props?.gatilho === 'abrir' && e.props?.motivo === 'offline')).toHaveLength(0)
  })
})

describe('privacidade', () => {
  it('nenhum evento leva o código ou o endereço do cofre, e o código não vai no backup', async () => {
    const { f } = servidor()
    await salvar(baralho(['1']))
    await sync.comecar(f)
    const { codigo } = (await sync.lerEstado())!
    const { endereco, xChave } = await sync.derivar(codigo)
    await sync.sincronizar('botao', f)
    await sync.ligar(sync.criarCodigo(), 'codigo', f)
    await sync.trocarCodigo(f)
    await sync.desligar()
    const tudo = JSON.stringify(eventos)
    for (const segredo of [codigo, endereco, xChave]) expect(tudo).not.toContain(segredo)
    expect(eventos.map((e) => e.nome)).toEqual(expect.arrayContaining(['sync_ligado', 'sync_feito', 'sync_erro', 'sync_codigo_trocado', 'sync_desligado']))
    expect(eventos.find((e) => e.nome === 'sync_erro')!.props).toEqual({ gatilho: 'ligar', motivo: 'nao_encontrado' })

    await db.meta.put({ chave: sync.CHAVE_SYNC, valor: JSON.stringify({ codigo }) })
    expect(JSON.stringify(await instantaneo())).not.toContain(codigo)
  })
})
