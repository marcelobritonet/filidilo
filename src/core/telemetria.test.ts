import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Ambiente mínimo de navegador para o módulo.
const armazenamento = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => armazenamento.get(k) ?? null,
  setItem: (k: string, v: string) => void armazenamento.set(k, v),
  removeItem: (k: string) => void armazenamento.delete(k),
})
vi.stubGlobal('__VERSAO__', 'teste')

describe('telemetria', () => {
  beforeEach(() => {
    armazenamento.clear()
    vi.resetModules()
  })

  it('sem chave configurada fica desligada e não guarda nada', async () => {
    const t = await import('./telemetria')
    expect(t.telemetriaDisponivel()).toBe(t.CHAVE_POSTHOG !== '')
    if (t.CHAVE_POSTHOG) return
    t.evento('app_aberto')
    expect(armazenamento.size).toBe(0)
  })

  it('com a chave, o evento entra na fila com nome e propriedades', async () => {
    const t = await import('./telemetria')
    if (!t.CHAVE_POSTHOG) return
    t.evento('resposta', { nota: 3 })
    const fila = JSON.parse(armazenamento.get('tatino-tel-fila') ?? '[]')
    expect(fila).toHaveLength(1)
    expect(fila[0]).toMatchObject({ event: 'resposta', properties: { nota: 3 } })
  })

  it('desligar apaga a fila e o id anônimo', async () => {
    armazenamento.set('tatino-tel-fila', '[{}]')
    armazenamento.set('tatino-tel-id', 'abc')
    const t = await import('./telemetria')
    t.ligarTelemetria(false)
    expect(armazenamento.get('tatino-telemetria')).toBe('off')
    expect(armazenamento.has('tatino-tel-fila')).toBe(false)
    expect(armazenamento.has('tatino-tel-id')).toBe(false)
    expect(t.telemetriaLigada()).toBe(false)
  })

  it('versão vai em cada evento, e a marca de teste também, quando ligada', async () => {
    const t = await import('./telemetria')
    if (!t.CHAVE_POSTHOG) return
    t.evento('resposta')
    armazenamento.set('tatino-teste', '1')
    t.evento('resposta')
    const fila = JSON.parse(armazenamento.get('tatino-tel-fila') ?? '[]')
    expect(fila[0].properties).toEqual({ versao: 'teste', $session_id: expect.any(String) })
    expect(fila[1].properties).toEqual({ versao: 'teste', $session_id: expect.any(String), teste: true })
  })

  it('?teste=1 marca o aparelho, ?teste=0 desmarca, e o parâmetro sai do endereço', async () => {
    const enderecos: string[] = []
    vi.stubGlobal('window', { location: { href: 'https://x.dev/filidilo/?teste=1#a' } })
    vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, u: string) => enderecos.push(u) })
    const t = await import('./telemetria')
    expect(t.marcarTesteDaUrl()).toBe(true)
    expect(t.aparelhoDeTeste()).toBe(true)
    expect(enderecos).toEqual(['/filidilo/#a'])
    vi.stubGlobal('window', { location: { href: 'https://x.dev/filidilo/?teste=0' } })
    expect(t.marcarTesteDaUrl()).toBe(true)
    expect(t.aparelhoDeTeste()).toBe(false)
    vi.stubGlobal('window', { location: { href: 'https://x.dev/filidilo/' } })
    expect(t.marcarTesteDaUrl()).toBe(false)
  })

  it('origem da abertura: link, arquivo, convite, imagem ou direto; a marca ?de= sai do endereço', async () => {
    const enderecos: string[] = []
    vi.stubGlobal('history', { state: null, replaceState: (_s: unknown, _t: string, u: string) => enderecos.push(u) })
    const t = await import('./telemetria')
    const origem = (href: string) => {
      vi.stubGlobal('window', { location: { href } })
      return t.lerOrigemDaUrl()
    }
    expect(origem('https://x.dev/filidilo/?de=convite')).toBe('convite')
    expect(origem('https://x.dev/filidilo/?de=imagem#a')).toBe('imagem')
    expect(enderecos).toEqual(['/filidilo/', '/filidilo/#a'])
    expect(origem('https://x.dev/filidilo/?b=abc')).toBe('link')
    expect(origem('https://x.dev/filidilo/?de=imagem&b=abc')).toBe('link')
    expect(enderecos.at(-1)).toBe('/filidilo/?b=abc')
    expect(origem('https://x.dev/filidilo/?receber=1')).toBe('arquivo')
    expect(origem('https://x.dev/filidilo/?de=outra')).toBe('direto')
    expect(origem('https://x.dev/filidilo/')).toBe('direto')
  })

  describe('com a chave', () => {
    const enviados: { batch: { uuid: string; event: string }[] }[] = []
    beforeEach(() => {
      enviados.length = 0
      vi.stubEnv('VITE_POSTHOG_KEY', 'phc_teste')
      vi.stubGlobal('fetch', async (_u: string, o: { body: string }) => {
        enviados.push(JSON.parse(o.body))
        return { ok: true }
      })
    })
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('desligar manda o aviso antes de apagar a fila', async () => {
      const t = await import('./telemetria')
      t.evento('resposta')
      t.ligarTelemetria(false)
      await Promise.resolve()
      expect(enviados.flatMap((e) => e.batch.map((b) => b.event))).toEqual(['estatisticas_desligadas'])
      expect(armazenamento.has('tatino-tel-fila')).toBe(false)
      t.ligarTelemetria(false)
      expect(enviados).toHaveLength(1)
    })

    it('religar manda estatisticas_ligadas', async () => {
      armazenamento.set('tatino-telemetria', 'off')
      const t = await import('./telemetria')
      t.ligarTelemetria(true)
      expect(t.telemetriaLigada()).toBe(true)
      const fila = JSON.parse(armazenamento.get('tatino-tel-fila') ?? '[]')
      expect(fila.map((e: { event: string }) => e.event)).toEqual(['estatisticas_ligadas'])
    })

    it('todo evento leva um uuid único, que não muda num reenvio', async () => {
      armazenamento.set('tatino-tel-fila', JSON.stringify([{ event: 'antigo', timestamp: '2026-11-20T00:00:00Z', properties: {} }]))
      const t = await import('./telemetria')
      t.evento('a')
      t.evento('b')
      vi.stubGlobal('fetch', async (_u: string, o: { body: string }) => {
        enviados.push(JSON.parse(o.body))
        return { ok: false }
      })
      await t.enviar()
      await t.enviar()
      const [um, dois] = enviados.map((e) => e.batch.map((b) => b.uuid))
      expect(um).toHaveLength(3)
      expect(new Set(um).size).toBe(3)
      for (const u of um) expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(dois).toEqual(um)
    })

    const fila = () => JSON.parse(armazenamento.get('tatino-tel-fila') ?? '[]') as { event: string; properties: Record<string, unknown> }[]

    it('$session_id é UUID v7, igual na mesma sessão e novo depois de 30 min parado', async () => {
      vi.useFakeTimers({ now: new Date('2026-11-24T10:00:00Z') })
      const t = await import('./telemetria')
      t.evento('a')
      vi.setSystemTime(new Date('2026-11-24T10:29:00Z'))
      t.evento('b')
      vi.setSystemTime(new Date('2026-11-24T11:00:00Z'))
      t.evento('c')
      const ids = fila().map((e) => e.properties.$session_id as string)
      vi.useRealTimers()
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(ids[1]).toBe(ids[0])
      expect(ids[2]).not.toBe(ids[0])
      expect(ids[2] > ids[0]).toBe(true)
    })

    it('primeira abertura só em aparelho novo, com origem e contexto', async () => {
      vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), addEventListener: () => {} })
      vi.stubGlobal('document', { addEventListener: () => {} })
      const t = await import('./telemetria')
      t.iniciarTelemetria({ plataforma: 'ios', tela: 'pequena' }, 'link')
      expect(fila().map((e) => [e.event, e.properties.origem, e.properties.plataforma])).toEqual([
        ['primeira_abertura', 'link', 'ios'],
        ['app_aberto', 'link', 'ios'],
      ])
      t.iniciarTelemetria({ plataforma: 'ios', tela: 'pequena' })
      expect(fila().filter((e) => e.event === 'primeira_abertura')).toHaveLength(1)
    })

    it('aparelho que já mandava estatísticas não conta como novo', async () => {
      armazenamento.set('tatino-tel-id', 'antigo')
      vi.stubGlobal('window', { matchMedia: () => ({ matches: true }), addEventListener: () => {} })
      vi.stubGlobal('document', { addEventListener: () => {} })
      const t = await import('./telemetria')
      t.iniciarTelemetria({ plataforma: 'android', tela: 'pequena' })
      expect(fila().map((e) => e.event)).toEqual(['app_aberto'])
      expect(fila()[0].properties).toMatchObject({ origem: 'direto', instalado: true })
    })

    it('erro vai só com lugar e tipo, no máximo 10', async () => {
      const t = await import('./telemetria')
      t.registrarErro('backup_restaurar', new TypeError('dados da pessoa aqui'))
      t.registrarErro('promessa', 'texto solto')
      for (let i = 0; i < 20; i++) t.registrarErro('global', new Error('x'))
      const erros = fila().filter((e) => e.event === 'erro')
      expect(erros).toHaveLength(10)
      expect(erros[0].properties).toMatchObject({ onde: 'backup_restaurar', tipo: 'TypeError' })
      expect(erros[1].properties).toMatchObject({ onde: 'promessa', tipo: 'string' })
      expect(JSON.stringify(erros)).not.toContain('dados da pessoa')
    })
  })
})
