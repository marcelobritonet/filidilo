// Worker "filidilo": a página pública do link (https://filidilo.britin.workers.dev/<codigo>).
// Mostra ao WhatsApp (e a outros apps de conversa) a prévia com o nome do baralho, pelas tags og:,
// e leva quem toca ao app (APP_URL?b=<codigo>), que baixa o conteúdo pelo worker de links. Pessoas recebem
// um 302 direto (o Android abre o app instalado); só os robôs de prévia recebem a página (ver ehRobo).
// O app continua no mesmo endereço: os dados das pessoas ficam onde sempre estiveram.
// Link vencido ou inexistente também leva ao app, que mostra o aviso "Este link expirou".
// A raiz (filidilo.britin.workers.dev/?de=convite etc.) é o endereço público do app: prévia da marca e leva
// ao app com os mesmos parâmetros (?de=, ?teste=…), para o endereço com o nome do Marcelo não aparecer.
import { RE_CODIGO, type KV } from './links'

export interface EnvPagina {
  LINKS: KV
  /** Endereço do app, com a barra no fim (https://marcelobritonet.github.io/filidilo/). */
  APP_URL: string
}

const DESCRICAO = 'Estude no Filidilo, no seu ritmo, até offline'

const escapar = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Título da prévia a partir do conteúdo guardado (o mesmo JSON do arquivo). */
export function tituloDaPrevia(texto: string | null): string {
  if (!texto) return 'Filidilo: flashcards com IA'
  try {
    const d = JSON.parse(texto) as { tipo?: string; baralho?: { titulo?: unknown; cartoes?: unknown[] }; cartoes?: unknown[] }
    if (d.tipo === 'baralho' && typeof d.baralho?.titulo === 'string') {
      const n = Array.isArray(d.baralho.cartoes) ? d.baralho.cartoes.length : 0
      const titulo = d.baralho.titulo.trim().slice(0, 80) || 'Baralho'
      return `${titulo} · ${n === 1 ? '1 cartão' : `${n} cartões`}`
    }
    if (d.tipo === 'cartoes') return Array.isArray(d.cartoes) && d.cartoes.length > 1 ? `${d.cartoes.length} cartões do Filidilo` : 'Um cartão do Filidilo'
  } catch {
    /* conteúdo estranho: prévia da marca */
  }
  return 'Filidilo: flashcards com IA'
}

export function paginaDoLink(titulo: string, destino: string, proprio: string, imagem: string): string {
  const t = escapar(titulo)
  const d = escapar(destino)
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t}</title>
<meta name="robots" content="noindex" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Filidilo" />
<meta property="og:locale" content="pt_BR" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${DESCRICAO}" />
<meta property="og:url" content="${escapar(proprio)}" />
<meta property="og:image" content="${escapar(imagem)}" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Logo do Filidilo" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0; url=${d}" />
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:17px system-ui,sans-serif;background:#F6F1E7;color:#0B1E3F}a{color:#0B1E3F}</style>
</head>
<body>
<p>Abrindo o Filidilo… <a href="${d}">Abrir</a></p>
<script>location.replace(${JSON.stringify(destino).replace(/</g, '\\u003c')})</script>
</body>
</html>`
}

/**
 * Robôs que montam a prévia do link (WhatsApp, Facebook/Instagram/iMessage, Telegram, X, Slack, Discord,
 * LinkedIn, buscadores…). Só eles recebem a página com as tags og:; as pessoas vão direto ao app.
 */
const RE_ROBO = /whatsapp|facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|vkshare|googlebot|bingbot|applebot|yandex|duckduckbot|bot\b|crawler|spider|preview/i

/** Sem user-agent também é tratado como robô: a página serve aos dois. */
export const ehRobo = (ua: string | null): boolean => !ua || RE_ROBO.test(ua)

export const paginaWorker = {
  async fetch(req: Request, env: EnvPagina): Promise<Response> {
    const { pathname, origin, search } = new URL(req.url)
    const app = env.APP_URL.endsWith('/') ? env.APP_URL : `${env.APP_URL}/`
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405 })
    const m = /^\/([^/]+)\/?$/.exec(pathname)
    const codigo = m && RE_CODIGO.test(m[1]) ? m[1] : null
    if (pathname !== '/' && !codigo) return Response.redirect(app, 302)
    const destino = codigo ? `${app}?b=${codigo}` : `${app}${search}`

    // Pessoas: redirecionamento do servidor (302). Assim o Android pode abrir o app instalado (o Chrome
    // entrega ao app um redirecionamento vindo de um link externo; um redirecionamento feito pela página, não).
    if (!ehRobo(req.headers.get('user-agent')))
      return new Response(null, { status: 302, headers: { location: destino, 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', vary: 'user-agent' } })

    const texto = codigo ? await env.LINKS.get(codigo) : null
    const html = paginaDoLink(tituloDaPrevia(texto), destino, `${origin}/${codigo ?? ''}`, `${app}og-imagem.png?v=1`)
    return new Response(req.method === 'HEAD' ? null : html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff', vary: 'user-agent' },
    })
  },
}
