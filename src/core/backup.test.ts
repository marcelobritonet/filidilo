import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { exportar, importar } from './backup'
import { db } from './db'
import { gravarDominio, lerDominioGravado } from './sessoes'
import { gravarMetaSemana, lerMetaGravada } from './metaSemana'

describe('backup do painel', () => {
  it('leva sessões, domínio e meta da semana, e volta igual', async () => {
    await db.sessoes.put({ id: 's1', baralho: 'b', inicio: 1, fim: 2, ativoMs: 60000, respostas: 5, acertos: 4, por: 'acertos', meta: 4, bateuMeta: true, concluida: true, aparelho: 'a' })
    await gravarDominio([{ dia: '2026-11-24', baralho: 'b', dominados: 3, total: 9 }], new Date(2026, 10, 24).getTime())
    await gravarMetaSemana({ tipo: 'minutos', n: 60 })
    const texto = await (await exportar()).text()
    await Promise.all([db.sessoes.clear(), db.meta.clear()])
    await importar(texto)
    expect((await db.sessoes.toArray()).map((s) => s.id)).toEqual(['s1'])
    expect(await lerDominioGravado()).toEqual([{ dia: '2026-11-24', baralho: 'b', dominados: 3, total: 9 }])
    expect(await lerMetaGravada()).toEqual({ tipo: 'minutos', n: 60 })
    // Restaurar de novo não duplica.
    await importar(texto)
    expect(await db.sessoes.count()).toBe(1)
  })
  it('backup antigo, sem os campos novos, continua valendo', async () => {
    await expect(importar(JSON.stringify({ app: 'tatino', formato: 1, data: '', estados: [], revisoes: [], reportes: [], marcas: [] }))).resolves.toBeDefined()
  })
})
