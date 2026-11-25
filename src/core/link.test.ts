import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function carregar(url = 'https://links.example/', publica = '') {
  vi.stubEnv('VITE_LINKS_URL', url)
  vi.stubEnv('VITE_LINK_PUBLICO', publica)
  vi.stubGlobal('location', { origin: 'https://app.example' })
  return import('./link')
}

const resposta = (status: number, corpo: unknown) => new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status })

describe('link', () => {
  it('cria o link do app com o código', async () => {
    const { criarLink } = await carregar()
    const f = vi.fn(async () => resposta(201, { codigo: 'Ab12345678', chave: 'k', expiraEm: '2026-11-19T20:00:00.000Z' }))
    const l = await criarLink('{"app":"tatino"}', f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledWith('https://links.example/l?validade=30d', expect.objectContaining({ method: 'POST', body: '{"app":"tatino"}' }))
    expect(l.url).toMatch(/^https:\/\/app\.example\/.*\?b=Ab12345678$/)
    expect(l.chave).toBe('k')
    expect(l.expiraEm.toISOString()).toBe('2026-11-19T20:00:00.000Z')
  })

  it('com VITE_LINK_PUBLICO, o link é o da página pública', async () => {
    const { criarLink } = await carregar('https://links.example/', 'https://filidilo.britin.workers.dev/')
    const l = await criarLink('{}', (async () => resposta(201, { codigo: 'Ab12345678', chave: 'k', expiraEm: '2026-11-19T20:00:00.000Z' })) as unknown as typeof fetch)
    expect(l.url).toBe('https://filidilo.britin.workers.dev/Ab12345678')
  })

  it('convites e imagens usam o endereço público, sem o nome no endereço', async () => {
    const { urlPublicaDoApp, ENDERECO_VISIVEL } = await carregar('https://links.example/', 'https://filidilo.britin.workers.dev')
    expect(urlPublicaDoApp('convite')).toBe('https://filidilo.britin.workers.dev/?de=convite')
    expect(ENDERECO_VISIVEL).toBe('filidilo.britin.workers.dev')
    const local = await (vi.resetModules(), carregar('https://links.example/', ''))
    expect(local.urlPublicaDoApp('imagem')).toMatch(/^https:\/\/app\.example\/.*\?de=imagem$/)
    expect(local.ENDERECO_VISIVEL).toBe('filidilo.britin.workers.dev')
  })

  it('atualiza com a chave; null quando o link sumiu ou não é deste aparelho', async () => {
    const { atualizarLink, apagarLink } = await carregar()
    const f = vi.fn(async () => resposta(200, { expiraEm: '2026-12-25T20:00:00.000Z' }))
    expect((await atualizarLink('Ab12345678', 'k', '{"x":1}', f as unknown as typeof fetch))?.toISOString()).toBe('2026-12-25T20:00:00.000Z')
    expect(f).toHaveBeenCalledWith('https://links.example/l/Ab12345678?validade=30d', expect.objectContaining({ method: 'PUT', body: '{"x":1}', headers: expect.objectContaining({ 'x-chave': 'k' }) }))
    expect(await atualizarLink('Ab12345678', 'k', '', (async () => resposta(404, {})) as unknown as typeof fetch)).toBeNull()
    expect(await atualizarLink('Ab12345678', 'k', '', (async () => resposta(403, {})) as unknown as typeof fetch)).toBeNull()
    const d = vi.fn(async () => { throw new TypeError('rede') })
    await expect(apagarLink('Ab12345678', 'k', d as unknown as typeof fetch)).resolves.toBeUndefined()
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
    await expect(abrirLink('../x', fetch)).rejects.toThrow('não é do Filidilo')
    await expect(abrirLink('Ab12345678', (async () => resposta(404, {})) as unknown as typeof fetch)).rejects.toMatchObject({ motivo: 'expirou' })
    await expect(abrirLink('Ab12345678', (async () => { throw new TypeError('rede') }) as unknown as typeof fetch)).rejects.toMatchObject({ motivo: 'internet' })
    await expect(abrirLink('Ab12345678', (async () => resposta(500, {})) as unknown as typeof fetch)).rejects.toMatchObject({ motivo: 'outro' })
  })

  it('sem VITE_LINKS_URL fica desligado', async () => {
    const { linkLigado, criarLink } = await carregar('')
    expect(linkLigado()).toBe(false)
    await expect(criarLink('x')).rejects.toThrow('não está disponível')
  })
})
