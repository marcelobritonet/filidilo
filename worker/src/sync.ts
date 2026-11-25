// Cofre de sincronização entre aparelhos (P131), sem conta nem login.
// O cliente gera um segredo e deriva dele (HKDF) o endereço do cofre (32 hex), a chave AES-GCM (que
// nunca sai do aparelho) e a x-chave. O servidor só guarda bytes cifrados, no mesmo KV dos links,
// com a chave "s:<id>" e o hash da x-chave nos metadados.
// GET    /s/<id>              → 200 com os bytes (application/octet-stream), ou 404
// PUT    /s/<id>  x-chave     corpo = bytes cifrados (1 byte a 5 MB) → 200 { ok: true }
//                              cria o cofre se não existir; se existir, a x-chave tem de ser a mesma (senão 403)
//                              cada PUT renova o prazo de 365 dias
// DELETE /s/<id>  x-chave     → 204, 404 se não existir, 403 se a chave não bater
// Erros: 400 id ou x-chave inválidos ou corpo vazio · 413 corpo acima de 5 MB · 429 limite por IP (PUT e DELETE).
import { hashDaChave, type Env, type Limite } from './links'

export const RE_ID_SYNC = /^[0-9a-f]{32}$/
export const MAX_BYTES_SYNC = 5 * 1024 * 1024
export const VALIDADE_SYNC_S = 365 * 24 * 60 * 60
export const TAM_CHAVE_SYNC = { min: 16, max: 128 }

export interface MetadadosSync {
  h: string
}

/** A parte do KV do Cloudflare que o cofre usa: valores binários. */
export interface KVSync {
  getWithMetadata<M = unknown>(chave: string, tipo: 'arrayBuffer'): Promise<{ value: ArrayBuffer | null; metadata: M | null }>
  put(chave: string, valor: ArrayBuffer, opcoes: { expirationTtl: number; metadata?: MetadadosSync }): Promise<void>
  delete(chave: string): Promise<void>
}

/** O mesmo binding LINKS, visto como KV binário, e o limite próprio do cofre. */
export interface EnvSync {
  LINKS: KVSync
  /** No máximo 30 PUT/DELETE por minuto por IP (wrangler.toml). */
  LIMITE_SYNC?: Limite
}

type Json = (dados: unknown, status: number, h: Record<string, string>) => Response

const chaveKV = (id: string) => `s:${id}`

async function dentroDoLimite(req: Request, env: EnvSync): Promise<boolean> {
  if (!env.LIMITE_SYNC) return true
  const ip = req.headers.get('cf-connecting-ip') ?? 'sem-ip'
  return (await env.LIMITE_SYNC.limit({ key: ip })).success
}

function xChave(req: Request): string | null {
  const c = req.headers.get('x-chave') ?? ''
  return c.length >= TAM_CHAVE_SYNC.min && c.length <= TAM_CHAVE_SYNC.max ? c : null
}

/** Responde às rotas /s/…; quem chama já tratou o OPTIONS e montou os cabeçalhos CORS `h`. */
export async function rotaSync(req: Request, envLinks: Env, h: Record<string, string>, json: Json): Promise<Response> {
  // O binding LINKS é o KV do Cloudflare, que também lê e grava ArrayBuffer.
  const env = envLinks as unknown as EnvSync
  const m = /^\/s\/([^/]*)$/.exec(new URL(req.url).pathname)
  if (!m) return json({ erro: 'rota' }, 404, h)
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') return json({ erro: 'metodo' }, 405, h)
  if (req.method !== 'GET' && !(await dentroDoLimite(req, env))) return json({ erro: 'muitos_envios' }, 429, h)
  const id = m[1]
  if (!RE_ID_SYNC.test(id)) return json({ erro: 'id' }, 400, h)

  if (req.method === 'GET') {
    const { value } = await env.LINKS.getWithMetadata<MetadadosSync>(chaveKV(id), 'arrayBuffer')
    if (value === null) return json({ erro: 'nao_encontrado' }, 404, h)
    return new Response(value, { status: 200, headers: { ...h, 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } })
  }

  const chave = xChave(req)
  if (!chave) return json({ erro: 'chave' }, 400, h)
  const hash = await hashDaChave(chave)

  if (req.method === 'PUT') {
    if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES_SYNC) return json({ erro: 'grande_demais' }, 413, h)
    const corpo = await req.arrayBuffer()
    if (corpo.byteLength > MAX_BYTES_SYNC) return json({ erro: 'grande_demais' }, 413, h)
    if (corpo.byteLength === 0) return json({ erro: 'vazio' }, 400, h)
    const atual = await env.LINKS.getWithMetadata<MetadadosSync>(chaveKV(id), 'arrayBuffer')
    if (atual.value !== null && atual.metadata?.h !== hash) return json({ erro: 'chave' }, 403, h)
    await env.LINKS.put(chaveKV(id), corpo, { expirationTtl: VALIDADE_SYNC_S, metadata: { h: hash } })
    return json({ ok: true }, 200, h)
  }

  const atual = await env.LINKS.getWithMetadata<MetadadosSync>(chaveKV(id), 'arrayBuffer')
  if (atual.value === null) return json({ erro: 'nao_encontrado' }, 404, h)
  if (atual.metadata?.h !== hash) return json({ erro: 'chave' }, 403, h)
  await env.LINKS.delete(chaveKV(id))
  return new Response(null, { status: 204, headers: h })
}
