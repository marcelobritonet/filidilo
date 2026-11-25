// Worker do Cloudflare que guarda o conteúdo de um baralho ou de cartões enviados por link.
// POST   /l?validade=30d  corpo = o mesmo JSON do arquivo (src/core/compartilhar.ts) → { codigo, chave, expiraEm }
//                         validades aceitas: 2h (padrão, dos apps antigos), 7d e 30d (apps desde a v3.30.0)
// PUT    /l/<codigo>?validade=30d  com o cabeçalho x-chave: troca o conteúdo e renova o prazo; corpo vazio só renova
// DELETE /l/<codigo>      com o cabeçalho x-chave: apaga o link
// GET    /l/<codigo>      → o JSON, ou 404 quando expirou ou nunca existiu
// Sem listagem e sem login: só quem tem o código (10 caracteres aleatórios) abre, e só quem tem a chave
// (devolvida uma vez, na criação; o KV guarda só o hash dela) muda ou apaga. Assim o app reaproveita
// um link por baralho em vez de criar um novo a cada envio.
// A página pública do link (filidilo.britin.workers.dev/<codigo>, com a prévia do WhatsApp) fica em pagina.ts.
// /s/<id> é o cofre de sincronização entre aparelhos (P131), em sync.ts.
import { rotaSync } from './sync'

/** O que o KV guarda junto de cada link: o hash da chave de quem criou (links antigos não têm). */
export interface Metadados {
  h?: string
}

export interface KV {
  get(chave: string): Promise<string | null>
  getWithMetadata<M = unknown>(chave: string): Promise<{ value: string | null; metadata: M | null }>
  put(chave: string, valor: string, opcoes: { expirationTtl: number; metadata?: Metadados }): Promise<void>
  delete(chave: string): Promise<void>
}

export interface Limite {
  limit(o: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  LINKS: KV
  LIMITE?: Limite
  /** Origens permitidas, separadas por vírgula. */
  ORIGENS?: string
}

export const VALIDADE_S = 2 * 60 * 60
export const VALIDADES: Record<string, number> = { '2h': VALIDADE_S, '7d': 7 * 24 * 60 * 60, '30d': 30 * 24 * 60 * 60 }
export const MAX_BYTES = 1024 * 1024
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const TAM_CODIGO = 10
export const RE_CODIGO = /^[0-9A-Za-z]{10}$/

function aleatorio(tamanho: number): string {
  // 248 é o maior múltiplo de 62 abaixo de 256: descartar o resto evita viés.
  let s = ''
  while (s.length < tamanho) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < 248 && s.length < tamanho) s += ALFABETO[b % 62]
    }
  }
  return s
}

export const novoCodigo = (): string => aleatorio(TAM_CODIGO)

/** Chave de quem criou o link: 22 caracteres (~131 bits). */
export const novaChave = (): string => aleatorio(22)

export async function hashDaChave(chave: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chave))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function cabecalhos(req: Request, env: Env): Record<string, string> {
  const origem = req.headers.get('origin') ?? ''
  const permitidas = (env.ORIGENS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const h: Record<string, string> = { vary: 'origin' }
  if (permitidas.includes(origem)) {
    h['access-control-allow-origin'] = origem
    h['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    h['access-control-allow-headers'] = 'content-type, x-chave'
    h['access-control-max-age'] = '86400'
  }
  return h
}

const json = (dados: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(dados), { status, headers: { ...h, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

function conteudoValido(texto: string): boolean {
  try {
    const d = JSON.parse(texto) as { app?: unknown; tipo?: unknown }
    return d?.app === 'tatino' && (d.tipo === 'baralho' || d.tipo === 'cartoes')
  } catch {
    return false
  }
}

/** Lê e confere o corpo de um envio; devolve o texto ou a resposta de erro. */
async function lerCorpo(req: Request, h: Record<string, string>, vazioPode = false): Promise<string | Response> {
  const tamanho = Number(req.headers.get('content-length') ?? 0)
  if (tamanho > MAX_BYTES) return json({ erro: 'grande_demais' }, 413, h)
  const texto = await req.text()
  if (vazioPode && texto === '') return texto
  if (new TextEncoder().encode(texto).length > MAX_BYTES) return json({ erro: 'grande_demais' }, 413, h)
  if (!conteudoValido(texto)) return json({ erro: 'invalido' }, 400, h)
  return texto
}

async function dentroDoLimite(req: Request, env: Env): Promise<boolean> {
  if (!env.LIMITE) return true
  const ip = req.headers.get('cf-connecting-ip') ?? 'sem-ip'
  return (await env.LIMITE.limit({ key: ip })).success
}

const expiraEm = (validade: number) => new Date(Date.now() + validade * 1000).toISOString()

export const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cabecalhos(req, env)
    const { pathname, searchParams } = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    // Cofre de sincronização entre aparelhos (P131): sync.ts.
    if (pathname.startsWith('/s/')) return rotaSync(req, env, h, json)

    if (req.method === 'POST' && pathname === '/l') {
      if (!(await dentroDoLimite(req, env))) return json({ erro: 'muitos_envios' }, 429, h)
      const validade = VALIDADES[searchParams.get('validade') ?? '2h']
      if (!validade) return json({ erro: 'validade' }, 400, h)
      const texto = await lerCorpo(req, h)
      if (texto instanceof Response) return texto
      const codigo = novoCodigo()
      const chave = novaChave()
      await env.LINKS.put(codigo, texto, { expirationTtl: validade, metadata: { h: await hashDaChave(chave) } })
      return json({ codigo, chave, expiraEm: expiraEm(validade) }, 201, h)
    }

    const m = /^\/l\/([^/]+)$/.exec(pathname)
    if (!m) return json({ erro: 'rota' }, 404, h)
    const codigo = RE_CODIGO.test(m[1]) ? m[1] : null

    if (req.method === 'GET') {
      const texto = codigo ? await env.LINKS.get(codigo) : null
      if (texto === null) return json({ erro: 'nao_encontrado' }, 404, h)
      return new Response(texto, { status: 200, headers: { ...h, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
    }

    if (req.method === 'PUT' || req.method === 'DELETE') {
      if (!(await dentroDoLimite(req, env))) return json({ erro: 'muitos_envios' }, 429, h)
      const atual = codigo ? await env.LINKS.getWithMetadata<Metadados>(codigo) : null
      if (!atual || atual.value === null) return json({ erro: 'nao_encontrado' }, 404, h)
      const chave = req.headers.get('x-chave') ?? ''
      if (!atual.metadata?.h || !chave || (await hashDaChave(chave)) !== atual.metadata.h) return json({ erro: 'chave' }, 403, h)
      if (req.method === 'DELETE') {
        await env.LINKS.delete(codigo!)
        return new Response(null, { status: 204, headers: h })
      }
      const validade = VALIDADES[searchParams.get('validade') ?? '30d']
      if (!validade) return json({ erro: 'validade' }, 400, h)
      const texto = await lerCorpo(req, h, true)
      if (texto instanceof Response) return texto
      await env.LINKS.put(codigo!, texto || atual.value, { expirationTtl: validade, metadata: atual.metadata })
      return json({ codigo, expiraEm: expiraEm(validade) }, 200, h)
    }

    return json({ erro: 'rota' }, 404, h)
  },
}
