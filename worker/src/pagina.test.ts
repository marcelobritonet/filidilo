import { describe, expect, it } from 'vitest'
import { paginaWorker, tituloDaPrevia, type EnvPagina } from './pagina'

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

const pedir = (caminho: string, e: EnvPagina) => paginaWorker.fetch(new Request(`https://filidilo.britin.workers.dev${caminho}`), e)

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

  it('raiz e código malformado vão para o app', async () => {
    for (const c of ['/', '/..%2F', '/abc', '/Ab12345678/x']) {
      const r = await pedir(c, env())
      expect(r.status).toBe(302)
      expect(r.headers.get('location')).toBe('https://app.example/filidilo/')
    }
  })
})
