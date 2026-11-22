import { describe, expect, it } from 'vitest'
import { MAX_BYTES, VALIDADE_S, VALIDADES, novoCodigo, worker, type Env } from './links'

function ambiente(limiteOk = true) {
  const guardado = new Map<string, { valor: string; ttl: number }>()
  const env: Env = {
    LINKS: {
      get: async (k) => guardado.get(k)?.valor ?? null,
      put: async (k, valor, o) => void guardado.set(k, { valor, ttl: o.expirationTtl }),
    },
    LIMITE: { limit: async () => ({ success: limiteOk }) },
    ORIGENS: 'https://marcelobritonet.github.io,http://localhost:5173',
  }
  return { env, guardado }
}

const ORIGEM = 'https://marcelobritonet.github.io'
const baralho = JSON.stringify({ app: 'tatino', tipo: 'baralho', formato: 2, baralho: { id: 'a', titulo: 'A', versao: 1, temas: [], cartoes: [] } })
const post = (corpo: string, origem = ORIGEM, busca = '') => new Request(`https://w.dev/l${busca}`, { method: 'POST', body: corpo, headers: { origin: origem, 'content-type': 'application/json' } })
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
    expect((await worker.fetch(post(baralho, ORIGEM, '?validade=30d'), env)).status).toBe(400)
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
