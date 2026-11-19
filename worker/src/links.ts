// Worker do Cloudflare que guarda, por 2 horas, o conteúdo de um baralho ou de cartões enviados por link.
// POST /l          corpo = o mesmo JSON do arquivo (src/core/compartilhar.ts) → { codigo, expiraEm }
// GET  /l/<codigo> → o JSON, ou 404 quando expirou ou nunca existiu
// Sem listagem e sem login: só quem tem o código (10 caracteres aleatórios) abre.

export interface KV {
  get(chave: string): Promise<string | null>
  put(chave: string, valor: string, opcoes: { expirationTtl: number }): Promise<void>
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
export const MAX_BYTES = 1024 * 1024
const ALFABETO = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const TAM_CODIGO = 10
const RE_CODIGO = /^[0-9A-Za-z]{10}$/

export function novoCodigo(): string {
  // 248 é o maior múltiplo de 62 abaixo de 256: descartar o resto evita viés.
  let s = ''
  while (s.length < TAM_CODIGO) {
    for (const b of crypto.getRandomValues(new Uint8Array(16))) {
      if (b < 248 && s.length < TAM_CODIGO) s += ALFABETO[b % 62]
    }
  }
  return s
}

function cabecalhos(req: Request, env: Env): Record<string, string> {
  const origem = req.headers.get('origin') ?? ''
  const permitidas = (env.ORIGENS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const h: Record<string, string> = { vary: 'origin' }
  if (permitidas.includes(origem)) {
    h['access-control-allow-origin'] = origem
    h['access-control-allow-methods'] = 'GET, POST, OPTIONS'
    h['access-control-allow-headers'] = 'content-type'
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

export const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cabecalhos(req, env)
    const { pathname } = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })

    if (req.method === 'POST' && pathname === '/l') {
      if (env.LIMITE) {
        const ip = req.headers.get('cf-connecting-ip') ?? 'sem-ip'
        if (!(await env.LIMITE.limit({ key: ip })).success) return json({ erro: 'muitos_envios' }, 429, h)
      }
      const tamanho = Number(req.headers.get('content-length') ?? 0)
      if (tamanho > MAX_BYTES) return json({ erro: 'grande_demais' }, 413, h)
      const texto = await req.text()
      if (new TextEncoder().encode(texto).length > MAX_BYTES) return json({ erro: 'grande_demais' }, 413, h)
      if (!conteudoValido(texto)) return json({ erro: 'invalido' }, 400, h)
      const codigo = novoCodigo()
      await env.LINKS.put(codigo, texto, { expirationTtl: VALIDADE_S })
      return json({ codigo, expiraEm: new Date(Date.now() + VALIDADE_S * 1000).toISOString() }, 201, h)
    }

    const m = /^\/l\/([^/]+)$/.exec(pathname)
    if (req.method === 'GET' && m) {
      const texto = RE_CODIGO.test(m[1]) ? await env.LINKS.get(m[1]) : null
      if (texto === null) return json({ erro: 'nao_encontrado' }, 404, h)
      return new Response(texto, { status: 200, headers: { ...h, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
    }

    return json({ erro: 'rota' }, 404, h)
  },
}
