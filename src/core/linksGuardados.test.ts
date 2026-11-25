import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status })
const DIA = 24 * 60 * 60 * 1000
const AGORA = Date.UTC(2026, 10, 25, 12)

beforeEach(() => {
  const dados = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => void dados.set(k, v), removeItem: (k: string) => void dados.delete(k) })
  vi.stubGlobal('location', { origin: 'https://app.example' })
  vi.stubEnv('VITE_LINKS_URL', 'https://links.example')
  vi.stubEnv('VITE_LINK_PUBLICO', 'https://b.example')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

/** Worker de mentira: conta as chamadas por método. */
function worker(vence = AGORA + 30 * DIA) {
  let n = 0
  const f = vi.fn(async (_url: string, o: RequestInit) => {
    if (o.method === 'POST') return resposta(201, { codigo: `Codigo${String(++n).padStart(4, '0')}`, chave: `chave${n}`, expiraEm: new Date(vence).toISOString() })
    if (o.method === 'PUT') return resposta(200, { expiraEm: new Date(vence).toISOString() })
    return new Response(null, { status: 204 })
  })
  const metodos = () => f.mock.calls.map(([, o]) => o.method)
  return { f: f as unknown as typeof fetch, metodos, chamadas: f.mock.calls }
}

describe('um link por baralho', () => {
  it('cria uma vez e reaproveita enquanto o conteúdo é o mesmo', async () => {
    const { linkPara } = await import('./linksGuardados')
    const w = worker()
    const a = await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    const b = await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA + DIA)
    expect(a).toMatchObject({ url: 'https://b.example/Codigo0001', como: 'novo' })
    expect(b).toMatchObject({ url: 'https://b.example/Codigo0001', como: 'reaproveitado' })
    expect(w.metodos()).toEqual(['POST'])
  })

  it('conteúdo mudou: atualiza o mesmo link', async () => {
    const { linkPara } = await import('./linksGuardados')
    const w = worker()
    await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    const b = await linkPara('baralho:q', 'q', '{"v":2}', '30d', w.f, AGORA + DIA)
    expect(b).toMatchObject({ codigo: 'Codigo0001', como: 'atualizado' })
    expect(w.metodos()).toEqual(['POST', 'PUT'])
    expect(w.chamadas[1][1]).toMatchObject({ body: '{"v":2}', headers: expect.objectContaining({ 'x-chave': 'chave1' }) })
  })

  it('perto de vencer: renova sem mandar o conteúdo de novo', async () => {
    const { linkPara } = await import('./linksGuardados')
    const w = worker()
    await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    const b = await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA + 20 * DIA)
    expect(b.como).toBe('renovado')
    expect(w.chamadas[1][1]).toMatchObject({ method: 'PUT', body: '' })
  })

  it('vencido, ou o worker não o conhece mais: cria outro', async () => {
    const { linkPara } = await import('./linksGuardados')
    const w = worker()
    await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    expect((await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA + 31 * DIA)).como).toBe('novo')
    const sumiu = vi.fn(async (_u: string, o: RequestInit) => (o.method === 'PUT' ? resposta(404, {}) : resposta(201, { codigo: 'Outro12345', chave: 'k', expiraEm: new Date(AGORA + 30 * DIA).toISOString() })))
    const c = await linkPara('baralho:q', 'q', '{"v":2}', '30d', sumiu as unknown as typeof fetch, AGORA + 32 * DIA - 29 * DIA)
    expect(c).toMatchObject({ codigo: 'Outro12345', como: 'novo' })
  })

  it('cada variante tem o seu link', async () => {
    const { linkPara } = await import('./linksGuardados')
    const w = worker()
    const sem = await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    const com = await linkPara('baralho:q:progresso', 'q', '{"v":1,"p":1}', '30d', w.f, AGORA)
    expect(sem.codigo).not.toBe(com.codigo)
    expect((await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)).codigo).toBe(sem.codigo)
  })

  it('apaga no worker os links de baralhos que não existem mais', async () => {
    const { limparLinks, linkPara } = await import('./linksGuardados')
    const w = worker()
    await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)
    await linkPara('baralho:f', 'f', '{"v":1}', '30d', w.f, AGORA)
    expect(await limparLinks(['q'], w.f, AGORA)).toBe(1)
    expect(w.metodos()).toEqual(['POST', 'POST', 'DELETE'])
    expect(w.chamadas[2][0]).toBe('https://links.example/l/Codigo0002')
    expect(await limparLinks(['q'], w.f, AGORA)).toBe(0)
    expect((await linkPara('baralho:q', 'q', '{"v":1}', '30d', w.f, AGORA)).como).toBe('reaproveitado')
  })
})
