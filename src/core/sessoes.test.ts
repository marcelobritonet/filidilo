import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { db } from './db'
import { Cronometro, filtrarSessoes, gravarSessao, juntarDominio, lerDominio, mesclarSessoes, PAUSA_MAX_MS } from './sessoes'
import { andamento, inicioDaSemana, lerMetaSemana } from './metaSemana'
import { vazia } from './ofensiva'

describe('cronômetro', () => {
  it('soma o tempo entre toques', () => {
    const c = new Cronometro(0)
    c.tocar(30000)
    c.tocar(50000)
    expect(c.ativoMs).toBe(50000)
  })
  it('cada trecho conta no máximo 2 min', () => {
    const c = new Cronometro(0)
    c.tocar(10 * 60000)
    expect(c.ativoMs).toBe(PAUSA_MAX_MS)
  })
  it('com a tela escondida, não conta', () => {
    const c = new Cronometro(0)
    c.pausar(20000)
    c.tocar(500000) // escondida: não soma
    c.retomar(600000)
    c.tocar(610000)
    expect(c.ativoMs).toBe(20000 + 10000)
  })
})

describe('gravar sessão', () => {
  const base = { baralho: 'b1', inicio: 1, fim: 2, ativoMs: 1000, acertos: 1, por: 'acertos' as const, meta: 10, bateuMeta: false, concluida: true }
  it('sem resposta não grava', async () => {
    expect(await gravarSessao({ ...base, respostas: 0 })).toBeUndefined()
  })
  it('grava e mescla uma vez só', async () => {
    await db.sessoes.clear()
    const s = await gravarSessao({ ...base, respostas: 3 })
    expect(s).toBeDefined()
    expect(await mesclarSessoes([s!, { ...s!, id: 'outra' }])).toBe(1)
    expect(await db.sessoes.count()).toBe(2)
  })
  it('filtra o formato e o baralho', () => {
    const ok = { ...base, id: 'x', respostas: 2, aparelho: 'a' }
    expect(filtrarSessoes([ok, { id: 1 }, null, { ...ok, id: 'y', baralho: 'b2' }], 'b1')).toEqual([ok])
  })
})

describe('domínio por dia', () => {
  it('um por baralho por dia, o último vence', () => {
    const l = juntarDominio([{ dia: '2026-11-20', baralho: 'b', dominados: 3, total: 10 }], [{ dia: '2026-11-20', baralho: 'b', dominados: 5, total: 10 }], '2026-11-24')
    expect(l).toEqual([{ dia: '2026-11-20', baralho: 'b', dominados: 5, total: 10 }])
  })
  it('descarta o registro estragado', () => {
    expect(lerDominio('[{"dia":"x"}]')).toEqual([])
    expect(lerDominio('nada')).toEqual([])
  })
})

describe('meta da semana', () => {
  it('semana começa no domingo', () => {
    expect(inicioDaSemana('2026-11-24')).toBe('2026-11-22') // terça → domingo
    expect(inicioDaSemana('2026-11-22')).toBe('2026-11-22')
  })
  it('dias: conta sessões concluídas da semana, folga não', () => {
    const o = { ...vazia(), concluidos: ['2026-11-21', '2026-11-22', '2026-11-23'], salvos: ['2026-11-24'] }
    expect(andamento({ tipo: 'dias', n: 3 }, o, [], '2026-11-24')).toMatchObject({ feito: 2, batida: false })
  })
  it('minutos: soma o tempo das sessões da semana', () => {
    const t = new Date(2026, 10, 23, 10).getTime()
    const r = andamento({ tipo: 'minutos', n: 30 }, vazia(), [{ inicio: t, ativoMs: 20 * 60000 }, { inicio: t, ativoMs: 11 * 60000 }, { inicio: t - 3 * 86400000, ativoMs: 60 * 60000 }], '2026-11-24')
    expect(r).toMatchObject({ feito: 31, batida: true })
  })
  it('lê só meta válida', () => {
    expect(lerMetaSemana('{"tipo":"dias","n":5}')).toEqual({ tipo: 'dias', n: 5 })
    expect(lerMetaSemana('{"tipo":"dias","n":9}')).toBeNull()
    expect(lerMetaSemana('{"tipo":"x"}')).toBeNull()
  })
})
