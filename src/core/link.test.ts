import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function carregar(url = 'https://links.example/') {
  vi.stubEnv('VITE_LINKS_URL', url)
  vi.stubGlobal('location', { origin: 'https://app.example' })
  return import('./link')
}

const resposta = (status: number, corpo: unknown) => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status })

describe('link', () => {
  it('cria o link do app com o código', async () => {
    const { criarLink } = await carregar()
    const f = vi.fn(async () => resposta(201, { codigo: 'Ab12345678', expiraEm: '2026-11-19T20:00:00.000Z' }))
    const l = await criarLink('{"app":"tatino"}', f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledWith('https://links.example/l', expect.objectContaining({ method: 'POST', body: '{"app":"tatino"}' }))
    expect(l.url).toMatch(/^https:\/\/app\.example\/.*\?b=Ab12345678$/)
    expect(l.expiraEm.toISOString()).toBe('2026-11-19T20:00:00.000Z')
  })

  it('desafio pede 7 dias ao worker', async () => {
    const { criarLink } = await carregar()
    const f = vi.fn(async () => resposta(201, { codigo: 'Ab12345678', expiraEm: '2026-11-26T20:00:00.000Z' }))
    await criarLink('{"app":"tatino"}', f as unknown as typeof fetch, '7d')
    expect(f).toHaveBeenCalledWith('https://links.example/l?validade=7d', expect.anything())
  })

  it('erros ao criar viram mensagens', async () => {
    const { criarLink } = await carregar()
    await expect(criarLink('x', (async () => resposta(413, {})) as unknown as typeof fetch)).rejects.toThrow('grande demais')
    await expect(criarLink('x', (async () => resposta(429, {})) as unknown as typeof fetch)).rejects.toThrow('Muitos links')
    await expect(criarLink('x', (async () => { throw new TypeError('rede') }) as unknown as typeof fetch)).rejects.toThrow('Sem internet')
  })

  it('abre o conteúdo e avisa quando expirou', async () => {
    const { abrirLink } = await carregar()
    expect(await abrirLink('Ab12345678', (async () => resposta(200, '{"ok":1}')) as unknown as typeof fetch)).toBe('{"ok":1}')
    await expect(abrirLink('Ab12345678', (async () => resposta(404, {})) as unknown as typeof fetch)).rejects.toThrow('expirou')
    await expect(abrirLink('../x', fetch)).rejects.toThrow('não é do tatino')
  })

  it('sem VITE_LINKS_URL fica desligado', async () => {
    const { linkLigado, criarLink } = await carregar('')
    expect(linkLigado()).toBe(false)
    await expect(criarLink('x')).rejects.toThrow('não está disponível')
  })
})
