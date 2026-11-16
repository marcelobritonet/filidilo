import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})
