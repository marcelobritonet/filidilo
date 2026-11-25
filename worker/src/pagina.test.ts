import { describe, expect, it } from 'vitest'
import { ehRobo, paginaWorker, tituloDaPrevia, type EnvPagina } from './pagina'

const baralho = (titulo: string, n: number) => JSON.stringify({ app: 'tatino', tipo: 'baralho', baralho: { titulo, cartoes: Array.from({ length: n }, () => ({})) } })

function env(dados: Record<string, string> = {}): EnvPagina {
  return {
    APP_URL: 'https://app.example/filidilo/',
    LINKS: {
      get: async (k) => dados[k] ?? null,
      getWithMetadata: async () => ({ value: null, metadata: null }),
      put: async () => undefined,
      delete: async () => undefined,
    },
  }
}

const WHATSAPP = 'WhatsApp/2.23.20.0 A'
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const pedir = (caminho: string, e: EnvPagina, ua = WHATSAPP) => paginaWorker.fetch(new Request(`https://filidilo.britin.workers.dev${caminho}`, { headers: { 'user-agent': ua } }), e)

describe('página pública do link', () => {
  it('título da prévia: baralho com o número de cartões, cartão solto, sem conteúdo', () => {
    expect(tituloDaPrevia(baralho('Química', 24))).toBe('Química · 24 cartões')
    expect(tituloDaPrevia(baralho('Química', 1))).toBe('Química · 1 cartão')
    expect(tituloDaPrevia(JSON.stringify({ tipo: 'cartoes', cartoes: [{}] }))).toBe('Um cartão do Filidilo')
    expect(tituloDaPrevia(null)).toBe('Filidilo: flashcards com IA')
    expect(tituloDaPrevia('{oi')).toBe('Filidilo: flashcards com IA')
  })

  it('devolve as tags og: com o nome do baralho e leva ao app com o código', async () => {
    const r = await pedir('/Ab12345678', env({ Ab12345678: baralho('Química', 24) }))
    expect(r.status).toBe(200)
    const html = await r.text()
    expect(html).toContain('<meta property="og:title" content="Química · 24 cartões" />')
    expect(html).toContain('og:image" content="https://app.example/filidilo/og-imagem.png?v=1"')
    expect(html).toContain('og:url" content="https://filidilo.britin.workers.dev/Ab12345678"')
    expect(html).toContain('url=https://app.example/filidilo/?b=Ab12345678')
    expect(html).toContain('location.replace("https://app.example/filidilo/?b=Ab12345678")')
  })

  it('escapa o nome do baralho', async () => {
    const html = await (await pedir('/Ab12345678', env({ Ab12345678: baralho('<script>"x"</script>', 2) }))).text()
    expect(html).not.toContain('<script>"x"')
    expect(html).toContain('&lt;script&gt;&quot;x&quot;&lt;/script&gt; · 2 cartões')
  })

  it('link vencido também leva ao app (que avisa que expirou), com a prévia da marca', async () => {
    const html = await (await pedir('/Ab12345678', env())).text()
    expect(html).toContain('og:title" content="Filidilo: flashcards com IA"')
    expect(html).toContain('?b=Ab12345678')
  })

  it('raiz: endereço público do app, com a prévia da marca e os mesmos parâmetros', async () => {
    const html = await (await pedir('/?de=convite', env())).text()
    expect(html).toContain('og:title" content="Filidilo: flashcards com IA"')
    expect(html).toContain('location.replace("https://app.example/filidilo/?de=convite")')
    expect(await (await pedir('/', env())).text()).toContain('location.replace("https://app.example/filidilo/")')
  })

  it('pessoas vão direto ao app por 302 (o Android abre o app instalado)', async () => {
    const r = await pedir('/Ab12345678', env({ Ab12345678: baralho('Química', 24) }), CHROME_ANDROID)
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('https://app.example/filidilo/?b=Ab12345678')
    const raiz = await pedir('/?de=convite', env(), 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1')
    expect(raiz.status).toBe(302)
    expect(raiz.headers.get('location')).toBe('https://app.example/filidilo/?de=convite')
  })

  it('robôs de prévia', () => {
    for (const ua of [WHATSAPP, 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; Discordbot/2.0)', 'Slackbot-LinkExpanding 1.0', 'LinkedInBot/1.0', 'Twitterbot/1.0', null, ''])
      expect(ehRobo(ua)).toBe(true)
    expect(ehRobo(CHROME_ANDROID)).toBe(false)
  })

  it('código malformado e outros caminhos vão para o app', async () => {
    for (const c of ['/..%2F', '/abc', '/Ab12345678/x']) {
      const r = await pedir(c, env())
      expect(r.status).toBe(302)
      expect(r.headers.get('location')).toBe('https://app.example/filidilo/')
    }
  })
})
