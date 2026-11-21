import { describe, expect, it } from 'vitest'
import { diaLocal, diasSeguidos, marcoNovo, marcosAtingidos, resumoSemana } from './conquistas'

const em = (s: string) => new Date(s).getTime()
const AGORA = em('2026-11-21T10:00:00')

describe('dias seguidos', () => {
  it('conta hoje e os dias anteriores sem falha', () => {
    expect(diasSeguidos([em('2026-11-21T08:00'), em('2026-11-20T22:00'), em('2026-11-19T07:00')], AGORA)).toBe(3)
  })
  it('sem estudo hoje, a sequência de ontem continua', () => {
    expect(diasSeguidos([em('2026-11-20T23:59'), em('2026-11-19T00:01')], AGORA)).toBe(2)
  })
  it('um dia inteiro sem estudo quebra', () => {
    expect(diasSeguidos([em('2026-11-19T12:00'), em('2026-11-18T12:00')], AGORA)).toBe(0)
    expect(diasSeguidos([em('2026-11-21T09:00'), em('2026-11-19T12:00')], AGORA)).toBe(1)
  })
  it('atravessa a meia-noite pelo dia local, não por 24 horas', () => {
    expect(diasSeguidos([em('2026-11-20T23:58'), em('2026-11-21T00:02')], em('2026-11-21T00:05'))).toBe(2)
  })
  it('vazio é zero', () => expect(diasSeguidos([], AGORA)).toBe(0))
  it('dia local no formato AAAA-MM-DD', () => expect(diaLocal(em('2026-01-05T15:00'))).toBe('2026-01-05'))
})

describe('semana', () => {
  it('últimos 7 dias, do mais antigo a hoje', () => {
    const r = resumoSemana(
      [
        { data: em('2026-11-21T08:00'), nota: 3, cartao: 'a/1' },
        { data: em('2026-11-21T08:01'), nota: 1, cartao: 'a/2' },
        { data: em('2026-11-16T08:00'), nota: 4, cartao: 'b/1' },
        { data: em('2026-11-10T08:00'), nota: 4, cartao: 'c/1' }, // fora da semana
      ],
      AGORA,
    )
    expect(r.dias).toHaveLength(7)
    expect(r.dias[6]).toEqual({ rotulo: 'S', estudou: true }) // 21/11/2026 é sábado
    expect(r.dias[1].estudou).toBe(true) // 16/11
    expect(r.diasEstudados).toBe(2)
    expect(r.respostas).toBe(3)
    expect(r.acertos).toBe(2)
    expect(r.baralhos.sort()).toEqual(['a', 'b'])
  })
})

describe('marcos', () => {
  const base = { sequencia: 0, respostas: 0, bateuMeta: false, dominados: [] }
  it('mostra só o mais importante e marca todos os novos', () => {
    const atingidos = marcosAtingidos({ ...base, sequencia: 8, respostas: 120 })
    const r = marcoNovo(atingidos, new Set())
    expect(r.mostrar?.id).toBe('sequencia:7')
    expect(r.marcar).toEqual(['sequencia:7', 'sequencia:3', 'respostas:100', 'primeira_sessao'])
  })
  it('cada marco comemora uma vez', () => {
    const atingidos = marcosAtingidos({ ...base, sequencia: 3, respostas: 20 })
    const ja = new Set(marcoNovo(atingidos, new Set()).marcar)
    expect(marcoNovo(atingidos, ja)).toEqual({ mostrar: undefined, marcar: [] })
  })
  it('baralho dominado vem antes de tudo', () => {
    const atingidos = marcosAtingidos({ ...base, respostas: 30, sequencia: 3, dominados: [{ id: 'x', titulo: 'Derivadas', cartoes: 12 }] })
    expect(atingidos[0]).toMatchObject({ id: 'dominado:x', destaque: '12' })
  })
  it('primeira sessão só depois de responder', () => {
    expect(marcosAtingidos(base)).toEqual([])
    expect(marcoNovo(marcosAtingidos({ ...base, respostas: 5 }), new Set()).mostrar?.tipo).toBe('primeira_sessao')
  })
})
