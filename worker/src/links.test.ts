import { describe, expect, it } from 'vitest'
import { MAX_BYTES, VALIDADE_S, VALIDADES, novoCodigo, worker, type Env, type Metadados } from './links'

export function ambiente(limiteOk = true) {
  const guardado = new Map<string, { valor: string; ttl: number; metadata?: Metadados }>()
  const env: Env = {
    LINKS: {
      get: async (k) => guardado.get(k)?.valor ?? null,
      getWithMetadata: async <M,>(k: string) => ({ value: guardado.get(k)?.valor ?? null, metadata: (guardado.get(k)?.metadata ?? null) as M | null }),
      put: async (k, valor, o) => void guardado.set(k, { valor, ttl: o.expirationTtl, metadata: o.metadata }),
      delete: async (k) => void guardado.delete(k),
    },
    LIMITE: { limit: async () => ({ success: limiteOk }) },
    ORIGENS: 'https://marcelobritonet.github.io,http://localhost:5173',
  }
  return { env, guardado }
}

const ORIGEM = 'https://marcelobritonet.github.io'
const baralho = JSON.stringify({ app: 'tatino', tipo: 'baralho', formato: 2, baralho: { id: 'a', titulo: 'A', versao: 1, temas: [], cartoes: [] } })
const post = (corpo: string, origem = ORIGEM, busca = '') => new Request(`https://w.dev/l${busca}`, { method: 'POST', body: corpo, headers: { origin: origem, 'content-type': 'application/json' } })
const comChave = (metodo: 'PUT' | 'DELETE', codigo: string, chave: string, corpo = '', busca = '') =>
  new Request(`https://w.dev/l/${codigo}${busca}`, { method: metodo, body: metodo === 'PUT' ? corpo : undefined, headers: { origin: ORIGEM, 'x-chave': chave } })
const get = (codigo: string) => new Request(`https://w.dev/l/${codigo}`, { headers: { origin: ORIGEM } })

describe('worker de links', () => {
  it('guarda por 2 horas e devolve o mesmo conteúdo pelo código', async () => {
    const { env, guardado } = ambiente()
    const r = await worker.fetch(post(baralho), env)
    expect(r.status).toBe(201)
    expect(r.headers.get('access-control-allow-origin')).toBe(ORIGEM)
    const { codigo, expiraEm } = (await r.json()) as { codigo: string; expiraEm: string }
    expect(codigo).toMatch(/^[0-9A-Za-z]{10}$/)
    expect(new Date(expiraEm).getTime()).toBeGreaterThan(Date.now())
    expect(guardado.get(codigo)?.ttl).toBe(VALIDADE_S)
    const lido = await worker.fetch(get(codigo), env)
    expect(lido.status).toBe(200)
    expect(await lido.text()).toBe(baralho)
  })

  it('desafio: guarda por 7 dias com ?validade=7d e recusa outras validades', async () => {
    const { env, guardado } = ambiente()
    const r = await worker.fetch(post(baralho, ORIGEM, '?validade=7d'), env)
    expect(r.status).toBe(201)
    const { codigo, expiraEm } = (await r.json()) as { codigo: string; expiraEm: string }
    expect(guardado.get(codigo)?.ttl).toBe(VALIDADES['7d'])
    expect(new Date(expiraEm).getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000)
    expect((await worker.fetch(post(baralho, ORIGEM, '?validade=1a'), env)).status).toBe(400)
  })

  it('30 dias com ?validade=30d e devolve a chave de quem criou (o KV guarda só o hash)', async () => {
    const { env, guardado } = ambiente()
    const r = await worker.fetch(post(baralho, ORIGEM, '?validade=30d'), env)
    const { codigo, chave } = (await r.json()) as { codigo: string; chave: string }
    expect(chave).toMatch(/^[0-9A-Za-z]{22}$/)
    expect(guardado.get(codigo)?.ttl).toBe(VALIDADES['30d'])
    expect(guardado.get(codigo)?.metadata?.h).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(guardado.get(codigo))).not.toContain(chave)
  })

  it('PUT com a chave troca o conteúdo e renova; corpo vazio só renova', async () => {
    const { env, guardado } = ambiente()
    const { codigo, chave } = (await (await worker.fetch(post(baralho, ORIGEM, '?validade=30d'), env)).json()) as { codigo: string; chave: string }
    guardado.get(codigo)!.ttl = 1
    const novo = baralho.replace('"A"', '"B"')
    const r = await worker.fetch(comChave('PUT', codigo, chave, novo, '?validade=30d'), env)
    expect(r.status).toBe(200)
    expect(guardado.get(codigo)).toMatchObject({ valor: novo, ttl: VALIDADES['30d'] })
    guardado.get(codigo)!.ttl = 1
    expect((await worker.fetch(comChave('PUT', codigo, chave), env)).status).toBe(200)
    expect(guardado.get(codigo)).toMatchObject({ valor: novo, ttl: VALIDADES['30d'] })
    expect(guardado.get(codigo)?.metadata?.h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('PUT e DELETE recusam chave errada, sem chave e links antigos sem dono', async () => {
    const { env, guardado } = ambiente()
    const { codigo } = (await (await worker.fetch(post(baralho), env)).json()) as { codigo: string }
    expect((await worker.fetch(comChave('PUT', codigo, 'errada', baralho), env)).status).toBe(403)
    expect((await worker.fetch(comChave('DELETE', codigo, ''), env)).status).toBe(403)
    guardado.set('Antigo1234', { valor: baralho, ttl: 10 })
    expect((await worker.fetch(comChave('PUT', 'Antigo1234', 'x', baralho), env)).status).toBe(403)
    expect((await worker.fetch(comChave('PUT', 'Nada123456', 'x', baralho), env)).status).toBe(404)
    expect(guardado.get(codigo)?.valor).toBe(baralho)
  })

  it('PUT recusa conteúdo inválido', async () => {
    const { env } = ambiente()
    const { codigo, chave } = (await (await worker.fetch(post(baralho), env)).json()) as { codigo: string; chave: string }
    expect((await worker.fetch(comChave('PUT', codigo, chave, '{oi'), env)).status).toBe(400)
  })

  it('DELETE com a chave apaga', async () => {
    const { env, guardado } = ambiente()
    const { codigo, chave } = (await (await worker.fetch(post(baralho), env)).json()) as { codigo: string; chave: string }
    expect((await worker.fetch(comChave('DELETE', codigo, chave), env)).status).toBe(204)
    expect(guardado.has(codigo)).toBe(false)
    expect((await worker.fetch(get(codigo), env)).status).toBe(404)
  })

  it('CORS libera PUT, DELETE e o cabeçalho x-chave para a origem do app', async () => {
    const { env } = ambiente()
    const r = await worker.fetch(new Request('https://w.dev/l/Ab12345678', { method: 'OPTIONS', headers: { origin: ORIGEM } }), env)
    expect(r.headers.get('access-control-allow-methods')).toContain('PUT')
    expect(r.headers.get('access-control-allow-methods')).toContain('DELETE')
    expect(r.headers.get('access-control-allow-headers')).toContain('x-chave')
  })

  it('aceita cartões soltos', async () => {
    const { env } = ambiente()
    const r = await worker.fetch(post(JSON.stringify({ app: 'tatino', tipo: 'cartoes', formato: 2, temas: [], cartoes: [] })), env)
    expect(r.status).toBe(201)
  })

  it('404 para código que não existe ou malformado', async () => {
    const { env } = ambiente()
    expect((await worker.fetch(get('AAAAAAAAAA'), env)).status).toBe(404)
    expect((await worker.fetch(get('..%2F'), env)).status).toBe(404)
  })

  it('recusa o que não é do Filidilo, backups e JSON quebrado', async () => {
    const { env } = ambiente()
    expect((await worker.fetch(post('{oi'), env)).status).toBe(400)
    expect((await worker.fetch(post(JSON.stringify({ app: 'outro', tipo: 'baralho' })), env)).status).toBe(400)
    expect((await worker.fetch(post(JSON.stringify({ app: 'tatino', estados: [] })), env)).status).toBe(400)
  })

  it('recusa corpo maior que 1 MB', async () => {
    const { env } = ambiente()
    const grande = JSON.stringify({ app: 'tatino', tipo: 'baralho', x: 'a'.repeat(MAX_BYTES) })
    expect((await worker.fetch(post(grande), env)).status).toBe(413)
  })

  it('429 quando passa do limite por IP', async () => {
    const { env } = ambiente(false)
    expect((await worker.fetch(post(baralho), env)).status).toBe(429)
  })

  it('não libera CORS para origem desconhecida', async () => {
    const { env } = ambiente()
    const r = await worker.fetch(new Request('https://w.dev/l', { method: 'OPTIONS', headers: { origin: 'https://mal.example' } }), env)
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('códigos são aleatórios', () => {
    const vistos = new Set(Array.from({ length: 500 }, novoCodigo))
    expect(vistos.size).toBe(500)
  })
})
