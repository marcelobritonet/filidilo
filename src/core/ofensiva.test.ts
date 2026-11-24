import { describe, expect, it } from 'vitest'
import { atualizar, concluir, deveAbrirSelo, lerVistoSelo, vistoDoPainel, fracaoRestante, ganhar, juntar, lerRegistro, semana, sequencia, somarDias, urgente, vazia, type Ofensiva } from './ofensiva'

const HOJE = '2026-11-21'
const com = (o: Partial<Ofensiva>): Ofensiva => ({ ...vazia(), ...o })

describe('dias', () => {
  it('anda no calendário atravessando mês e ano', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('sequência', () => {
  it('conta hoje e os dias anteriores', () => {
    expect(sequencia(com({ concluidos: ['2026-11-19', '2026-11-20', HOJE] }), HOJE)).toBe(3)
  })
  it('sem sessão hoje, a de ontem continua valendo', () => {
    expect(sequencia(com({ concluidos: ['2026-11-19', '2026-11-20'] }), HOJE)).toBe(2)
  })
  it('um dia inteiro sem sessão quebra', () => {
    expect(sequencia(com({ concluidos: ['2026-11-18', '2026-11-19'] }), HOJE)).toBe(0)
  })
  it('dias salvos por folga contam', () => {
    expect(sequencia(com({ concluidos: ['2026-11-18', HOJE], salvos: ['2026-11-19', '2026-11-20'] }), HOJE)).toBe(4)
  })
})

describe('folgas', () => {
  it('um dia sem sessão gasta uma folga e a ofensiva continua', () => {
    const a = atualizar(com({ concluidos: ['2026-11-18', '2026-11-19'], folgas: 1 }), HOJE)
    expect(a.usadas).toBe(1)
    expect(a.ofensiva.folgas).toBe(0)
    expect(sequencia(a.ofensiva, HOJE)).toBe(3)
  })
  it('dois dias sem sessão com uma folga: cai e a folga fica guardada', () => {
    const a = atualizar(com({ concluidos: ['2026-11-17', '2026-11-18'], folgas: 1 }), HOJE)
    expect(a.perdida).toBe(2)
    expect(a.ofensiva.folgas).toBe(1)
    expect(sequencia(a.ofensiva, HOJE)).toBe(0)
    // Na próxima abertura, não perde de novo.
    expect(atualizar(a.ofensiva, HOJE).perdida).toBe(0)
  })
  it('duas folgas cobrem dois dias', () => {
    const a = atualizar(com({ concluidos: ['2026-11-18'], folgas: 2 }), HOJE)
    expect(a.usadas).toBe(2)
    expect(sequencia(a.ofensiva, HOJE)).toBe(3)
  })
  it('sem nada estudado, não gasta', () => expect(atualizar(com({ folgas: 2 }), HOJE).usadas).toBe(0))
  it('no máximo 2 guardadas', () => {
    let o = com({ folgas: 1 })
    o = ganhar(o, 'baralho', HOJE).ofensiva
    expect(o.folgas).toBe(2)
    expect(ganhar(o, 'ia', HOJE).ganhou).toBe(false)
  })
  it('uma por motivo por dia', () => {
    const o = ganhar(vazia(), 'baralho', HOJE).ofensiva
    expect(ganhar(o, 'baralho', HOJE).ganhou).toBe(false)
    expect(ganhar(o, 'ia', HOJE).ganhou).toBe(true)
    expect(ganhar(o, 'baralho', '2026-11-22').ganhou).toBe(true)
  })
})

describe('concluir', () => {
  it('a primeira sessão do dia garante o dia; a segunda não conta de novo', () => {
    const r = concluir(com({ concluidos: ['2026-11-20'] }), HOJE)
    expect(r.primeiraHoje).toBe(true)
    expect(r.sequencia).toBe(2)
    expect(concluir(r.ofensiva, HOJE).primeiraHoje).toBe(false)
  })
  it('gasta a folga antes de marcar hoje', () => {
    const r = concluir(com({ concluidos: ['2026-11-19'], folgas: 1 }), HOJE)
    expect(r.usadas).toBe(1)
    expect(r.sequencia).toBe(3)
  })
  it('7 dias seguidos dão uma folga', () => {
    const seis = Array.from({ length: 6 }, (_, i) => somarDias(HOJE, i - 6))
    const r = concluir(com({ concluidos: seis }), HOJE)
    expect(r.sequencia).toBe(7)
    expect(r.folgaGanha).toBe(true)
    expect(r.ofensiva.folgas).toBe(1)
  })
})

describe('semana e relógio', () => {
  it('7 dias com o estado de cada um', () => {
    const s = semana(com({ concluidos: ['2026-11-19'], salvos: ['2026-11-20'] }), HOJE)
    expect(s).toHaveLength(7)
    expect(s.slice(-3).map((d) => d.estado)).toEqual(['sessao', 'folga', 'hoje'])
    expect(s[6].rotulo).toBe('S') // 21/11/2026 é sábado
  })
  it('fio do dia e urgência', () => {
    expect(fracaoRestante(new Date('2026-11-21T12:00').getTime())).toBeCloseTo(0.5)
    expect(urgente(new Date('2026-11-21T20:59').getTime())).toBe(false)
    expect(urgente(new Date('2026-11-21T21:00').getTime())).toBe(true)
  })
})

describe('registro', () => {
  it('descarta lixo e limita as folgas', () => {
    expect(lerRegistro(JSON.stringify({ concluidos: ['2026-11-20', 3, 'x'], folgas: 9 }))).toMatchObject({ concluidos: ['2026-11-20'], folgas: 2 })
    expect(lerRegistro(undefined)).toBeNull()
  })
  it('juntar soma os dias e fica com mais folgas', () => {
    const j = juntar(com({ concluidos: ['2026-11-20'], folgas: 0 }), com({ concluidos: ['2026-11-19'], salvos: ['2026-11-20'], folgas: 2 }))
    expect(j.concluidos).toEqual(['2026-11-19', '2026-11-20'])
    expect(j.salvos).toEqual([])
    expect(j.folgas).toBe(2)
  })
})

describe('selo de Meus baralhos', () => {
  const p = { sequencia: 4, hojeFeito: false, folgas: 1 }
  const visto = vistoDoPainel(p, HOJE)
  it('abre na primeira vez', () => expect(deveAbrirSelo(null, p, HOJE)).toBe(true))
  it('fica fechado no mesmo dia sem mudança', () => expect(deveAbrirSelo(visto, p, HOJE)).toBe(false))
  it('abre no dia seguinte', () => expect(deveAbrirSelo(visto, p, somarDias(HOJE, 1))).toBe(true))
  it('abre ao garantir o dia', () => expect(deveAbrirSelo(visto, { ...p, sequencia: 5, hojeFeito: true }, HOJE)).toBe(true))
  it('abre ao ganhar ou usar folga', () => {
    expect(deveAbrirSelo(visto, { ...p, folgas: 2 }, HOJE)).toBe(true)
    expect(deveAbrirSelo(visto, { ...p, folgas: 0 }, HOJE)).toBe(true)
  })
  it('abre ao perder a sequência', () => expect(deveAbrirSelo(visto, { ...p, sequencia: 0 }, HOJE)).toBe(true))
  it('lê só o formato certo', () => {
    expect(lerVistoSelo(JSON.stringify(visto))).toEqual(visto)
    expect(lerVistoSelo('{"dia":1}')).toBeNull()
    expect(lerVistoSelo('lixo')).toBeNull()
    expect(lerVistoSelo(null)).toBeNull()
  })
})
