import { describe, expect, it } from 'vitest'
import { calcularPainel, inicioPeriodo, maiorSequencia, type Entrada } from './painel'
import { vazia } from './ofensiva'
import type { Baralho } from './types'
import type { SessaoGravada } from './db'

const AGORA = new Date(2026, 10, 24, 15).getTime() // terça, 24/11
const dia = (d: number, h = 10) => new Date(2026, 10, d, h).getTime()
const baralho: Baralho = {
  id: 'b',
  titulo: 'Física',
  versao: 1,
  temas: [{ id: 't1', nome: 'Ondas' }, { id: 't2', nome: 'Óptica' }],
  cartoes: [
    { id: 'c1', tipo: 'vf', tema: 't1', frente: 'a', resposta: true },
    { id: 'c2', tipo: 'vf', tema: 't2', frente: 'b', resposta: true },
  ],
}
const base = (p: Partial<Entrada> = {}): Entrada => ({ baralhos: [baralho], revisoes: [], sessoes: [], estados: [], ofensiva: vazia(), dominio: [], periodo: '7', agora: AGORA, ...p })
const sessao = (p: Partial<SessaoGravada>): SessaoGravada => ({ id: Math.random().toString(), baralho: 'b', inicio: dia(24), fim: dia(24), ativoMs: 600000, respostas: 5, acertos: 4, por: 'acertos', meta: 4, bateuMeta: true, concluida: true, aparelho: 'a', ...p })

describe('painel', () => {
  it('sem respostas, vazio', () => {
    expect(calcularPainel(base()).vazio).toBe(true)
  })
  it('período: 7 dias terminam hoje', () => {
    expect(inicioPeriodo('7', '2026-11-24')).toBe('2026-11-18')
    expect(inicioPeriodo('tudo', '2026-11-24', '2026-01-03')).toBe('2026-01-03')
  })
  it('ritmo e acertos do período; fora dele não conta', () => {
    const revisoes = [
      { cartao: 'b/c1', nota: 3 as const, data: dia(24) },
      { cartao: 'b/c1', nota: 1 as const, data: dia(23) },
      { cartao: 'b/c2', nota: 2 as const, data: dia(23) },
      { cartao: 'b/c2', nota: 3 as const, data: dia(1) }, // fora dos 7 dias
    ]
    const p = calcularPainel(base({ revisoes }))
    expect(p.ritmo).toMatchObject({ dias: 2, respostas: 3, minutos: null })
    expect(p.ritmo.barras).toHaveLength(7)
    expect(p.ritmo.barras[6]).toMatchObject({ respostas: 1, atual: true })
    expect(p.acertos).toMatchObject({ chutes: 1, erros: 1, respostas: 3 })
    expect(p.temas.map((t) => t.nome)).toEqual(['Óptica', 'Ondas'].sort((a, b) => a.localeCompare(b)))
  })
  it('onde mais erra: só abaixo da média', () => {
    const l = (cartao: string, certos: number) => Array.from({ length: 10 }, (_, i) => ({ cartao, nota: (i < certos ? 3 : 1) as 1 | 3, data: dia(24) }))
    expect(calcularPainel(base({ revisoes: [...l('b/c1', 4), ...l('b/c2', 7)] })).fracos.map((f) => f.nome)).toEqual(['Ondas'])
  })
  it('onde mais erra: só com 10 respostas ou mais', () => {
    const revisoes = Array.from({ length: 10 }, (_, i) => ({ cartao: 'b/c1', nota: (i < 4 ? 3 : 1) as 1 | 3, data: dia(24) }))
    const nove = Array.from({ length: 9 }, () => ({ cartao: 'b/c2', nota: 1 as const, data: dia(24) }))
    const p = calcularPainel(base({ revisoes: [...revisoes, ...nove] }))
    expect(p.fracos.map((f) => f.nome)).not.toContain('Óptica')
  })
  it('tempo e metas só com sessões gravadas; o Livre não conta como meta', () => {
    const p = calcularPainel(base({ revisoes: [{ cartao: 'b/c1', nota: 3, data: dia(24) }], sessoes: [sessao({}), sessao({ bateuMeta: false }), sessao({ por: 'livre', meta: undefined, bateuMeta: false })] }))
    expect(p.ritmo.minutos).toBe(30)
    expect(p.metas).toEqual({ batidas: 1, total: 2 })
    expect(p.medindoDesde).toBe('2026-11-24')
  })
  it('domínio e ganho desde o começo do período', () => {
    const estados = [{ id: 'b/c1', ultimaNota: 3 }, { id: 'b/c2', ultimaNota: 1 }] as never
    const p = calcularPainel(base({ revisoes: [{ cartao: 'b/c1', nota: 3, data: dia(24) }], estados, dominio: [{ dia: '2026-11-10', baralho: 'b', dominados: 0, total: 2 }] }))
    expect(p.dominio).toEqual([{ id: 'b', titulo: 'Física', dominados: 1, total: 2, ganho: 1 }])
  })
  it('filtro de baralho', () => {
    const p = calcularPainel(base({ baralho: 'outro', revisoes: [{ cartao: 'b/c1', nota: 3, data: dia(24) }] }))
    expect(p.vazio).toBe(true)
  })
  it('barras de 30 dias por semana e de tudo por mês', () => {
    const revisoes = [{ cartao: 'b/c1', nota: 3 as const, data: new Date(2026, 8, 5).getTime() }]
    expect(calcularPainel(base({ periodo: '30', revisoes })).ritmo.barras).toHaveLength(5)
    expect(calcularPainel(base({ periodo: 'tudo', revisoes })).ritmo.barras.map((b) => b.rotulo)).toEqual(['set', 'out', 'nov'])
  })
  it('maior sequência', () => {
    expect(maiorSequencia({ ...vazia(), concluidos: ['2026-11-01', '2026-11-02', '2026-11-05'], salvos: ['2026-11-03'] })).toBe(3)
  })
})
