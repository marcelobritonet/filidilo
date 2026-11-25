import { describe, expect, it } from 'vitest'
import { worker, type Env } from './links'
import { MAX_BYTES_SYNC, VALIDADE_SYNC_S, type MetadadosSync } from './sync'

/** KV de mentira que, como o do Cloudflare, guarda texto (links) e bytes (cofres). */
function ambiente(limiteOk = true, limiteLinksOk = true) {
  const guardado = new Map<string, { valor: string | ArrayBuffer; ttl: number; metadata?: unknown }>()
  const kv = {
    get: async (k: string) => {
      const v = guardado.get(k)?.valor
      return typeof v === 'string' ? v : null
    },
    getWithMetadata: async (k: string, tipo?: string) => {
      const g = guardado.get(k)
      if (!g) return { value: null, metadata: null }
      const v = tipo === 'arrayBuffer' && typeof g.valor === 'string' ? new TextEncoder().encode(g.valor).buffer : g.valor
      return { value: v, metadata: g.metadata ?? null }
    },
    put: async (k: string, valor: string | ArrayBuffer, o: { expirationTtl: number; metadata?: unknown }) =>
      void guardado.set(k, { valor, ttl: o.expirationTtl, metadata: o.metadata }),
    delete: async (k: string) => void guardado.delete(k),
  }
  const env = {
    LINKS: kv,
    LIMITE: { limit: async () => ({ success: limiteLinksOk }) },
    LIMITE_SYNC: { limit: async () => ({ success: limiteOk }) },
    ORIGENS: 'https://marcelobritonet.github.io',
  } as unknown as Env
  return { env, guardado }
}

const ORIGEM = 'https://marcelobritonet.github.io'
const ID = '0123456789abcdef0123456789abcdef'
const CHAVE = 'chave-secreta-de-teste-0001'
const bytes = (...b: number[]) => new Uint8Array(b)
const pedido = (metodo: string, id = ID, o: { chave?: string; corpo?: BodyInit; cabecalhos?: Record<string, string> } = {}) =>
  new Request(`https://w.dev/s/${id}`, {
    method: metodo,
    body: o.corpo,
    headers: { origin: ORIGEM, ...(o.chave !== undefined ? { 'x-chave': o.chave } : {}), ...o.cabecalhos },
  })

describe('cofre de sincronização (/s/)', () => {
  it('recusa id que não seja 32 hex minúsculos', async () => {
    const { env } = ambiente()
    for (const id of ['abc', ID.toUpperCase(), ID + '0', 'g'.repeat(32), '']) {
      expect((await worker.fetch(pedido('GET', id), env)).status).toBe(400)
      expect((await worker.fetch(pedido('PUT', id, { chave: CHAVE, corpo: bytes(1) }), env)).status).toBe(400)
    }
    expect((await worker.fetch(new Request(`https://w.dev/s/${ID}/x`), env)).status).toBe(404)
  })

  it('cria, lê e atualiza o cofre; o KV guarda só o hash da chave e renova o prazo', async () => {
    const { env, guardado } = ambiente()
    expect((await worker.fetch(pedido('GET'), env)).status).toBe(404)

    const r = await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1, 2, 3) }), env)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true })
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGEM)
    const g = guardado.get(`s:${ID}`)!
    expect(g.ttl).toBe(VALIDADE_SYNC_S)
    expect((g.metadata as MetadadosSync).h).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(g.metadata)).not.toContain(CHAVE)

    const lido = await worker.fetch(pedido('GET'), env)
    expect(lido.status).toBe(200)
    expect(lido.headers.get('content-type')).toBe('application/octet-stream')
    expect(lido.headers.get('access-control-allow-origin')).toBe(ORIGEM)
    expect([...new Uint8Array(await lido.arrayBuffer())]).toEqual([1, 2, 3])

    guardado.get(`s:${ID}`)!.ttl = 1
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(9, 8) }), env)).status).toBe(200)
    expect(guardado.get(`s:${ID}`)!.ttl).toBe(VALIDADE_SYNC_S)
    expect([...new Uint8Array(await (await worker.fetch(pedido('GET'), env)).arrayBuffer())]).toEqual([9, 8])
  })

  it('chave errada dá 403 e não muda nada; chave ausente ou fora do tamanho dá 400', async () => {
    const { env } = ambiente()
    await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1) }), env)
    expect((await worker.fetch(pedido('PUT', ID, { chave: 'outra-chave-qualquer-01', corpo: bytes(2) }), env)).status).toBe(403)
    expect((await worker.fetch(pedido('DELETE', ID, { chave: 'outra-chave-qualquer-01' }), env)).status).toBe(403)
    expect((await worker.fetch(pedido('PUT', ID, { corpo: bytes(2) }), env)).status).toBe(400)
    expect((await worker.fetch(pedido('PUT', ID, { chave: 'curta', corpo: bytes(2) }), env)).status).toBe(400)
    expect((await worker.fetch(pedido('PUT', ID, { chave: 'x'.repeat(129), corpo: bytes(2) }), env)).status).toBe(400)
    expect([...new Uint8Array(await (await worker.fetch(pedido('GET'), env)).arrayBuffer())]).toEqual([1])
  })

  it('corpo acima de 5 MB dá 413 (pelo content-length ou pelo tamanho lido); corpo vazio dá 400', async () => {
    const { env, guardado } = ambiente()
    const grande = new Uint8Array(MAX_BYTES_SYNC + 1)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: grande }), env)).status).toBe(413)
    const mentindo = pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1), cabecalhos: { 'content-length': String(MAX_BYTES_SYNC + 1) } })
    expect((await worker.fetch(mentindo, env)).status).toBe(413)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: new Uint8Array(0) }), env)).status).toBe(400)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE }), env)).status).toBe(400)
    expect(guardado.size).toBe(0)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: new Uint8Array(MAX_BYTES_SYNC) }), env)).status).toBe(200)
  })

  it('DELETE apaga com a chave certa (204) e dá 404 quando não existe', async () => {
    const { env, guardado } = ambiente()
    expect((await worker.fetch(pedido('DELETE', ID, { chave: CHAVE }), env)).status).toBe(404)
    await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1) }), env)
    const r = await worker.fetch(pedido('DELETE', ID, { chave: CHAVE }), env)
    expect(r.status).toBe(204)
    expect(guardado.has(`s:${ID}`)).toBe(false)
    expect((await worker.fetch(pedido('GET'), env)).status).toBe(404)
  })

  it('acima do LIMITE_SYNC, PUT e DELETE dão 429; GET continua', async () => {
    const { env } = ambiente(false)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1) }), env)).status).toBe(429)
    expect((await worker.fetch(pedido('DELETE', ID, { chave: CHAVE }), env)).status).toBe(429)
    expect((await worker.fetch(pedido('GET'), env)).status).toBe(404)
  })

  it('o LIMITE dos links não vale para o cofre', async () => {
    const { env } = ambiente(true, false)
    expect((await worker.fetch(pedido('PUT', ID, { chave: CHAVE, corpo: bytes(1) }), env)).status).toBe(200)
  })

  it('/l/ continua respondendo como antes', async () => {
    const { env } = ambiente()
    const baralho = JSON.stringify({ app: 'tatino', tipo: 'baralho', formato: 2, baralho: { id: 'a', titulo: 'A', versao: 1, temas: [], cartoes: [] } })
    const r = await worker.fetch(new Request('https://w.dev/l?validade=30d', { method: 'POST', body: baralho, headers: { origin: ORIGEM } }), env)
    expect(r.status).toBe(201)
    const { codigo } = (await r.json()) as { codigo: string }
    const lido = await worker.fetch(new Request(`https://w.dev/l/${codigo}`, { headers: { origin: ORIGEM } }), env)
    expect(lido.status).toBe(200)
    expect(lido.headers.get('content-type')).toBe('application/json; charset=utf-8')
    expect(await lido.text()).toBe(baralho)
    expect((await worker.fetch(new Request('https://w.dev/x'), env)).status).toBe(404)
  })

  it('OPTIONS de /s/ responde o CORS com PUT, DELETE e x-chave', async () => {
    const { env } = ambiente()
    const r = await worker.fetch(new Request(`https://w.dev/s/${ID}`, { method: 'OPTIONS', headers: { origin: ORIGEM } }), env)
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-methods')).toContain('PUT')
    expect(r.headers.get('access-control-allow-headers')).toContain('x-chave')
  })
})
