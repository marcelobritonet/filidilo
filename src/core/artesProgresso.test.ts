import { describe, expect, it } from 'vitest'
import { pecaAcertos, pecaDominio, pecaMetaSemana, pecaOfensiva, pecaRitmo, pecaTemas, type Contexto } from './artesProgresso'
import type { Painel } from './painel'

const URL = 'https://app.example/filidilo/'
const ctx = (x: Partial<Contexto> = {}): Contexto => ({ periodo: '7', baralho: '', comNome: true, urlApp: URL, ...x })
const painel: Painel = {
  vazio: false,
  ritmo: { dias: 4, respostas: 120, minutos: 75, barras: [{ rotulo: 'S', titulo: 'seg.', respostas: 30, minutos: 20, atual: true }] },
  acertos: { taxa: 0.82, chutes: 3, erros: 10, respostas: 120, diferenca: 6 },
  temas: [{ baralho: 'b1', tema: 't1', nome: 'Derivadas', respostas: 80, acertos: 60, taxa: 0.75 }],
  fracos: [],
  dominio: [
    { id: 'b1', titulo: 'Cálculo', dominados: 20, total: 40, ganho: 5 },
    { id: 'b2', titulo: 'Inglês', dominados: 10, total: 10, ganho: null },
  ],
  metas: { batidas: 2, total: 3 },
  medindoDesde: '2026-11-01',
  ofensiva: { maior: 9, diasCobertos: 5 },
}

describe('artes do painel Seu progresso', () => {
  it('meta da semana batida comemora', () => {
    const p = pecaMetaSemana({ meta: { tipo: 'dias', n: 3 }, feito: 3, batida: true, semana: '2026-11-22' }, ctx())
    expect(p.arte).toMatchObject({ selo: 'Meta da semana batida!', destaque: '3 de 3', fracao: 1, confete: true })
    expect(p.texto).toContain(URL)
  })

  it('ritmo usa respostas ou minutos nas barras', () => {
    expect(pecaRitmo(painel, 'respostas', ctx()).arte.barras![0].valor).toBe(30)
    expect(pecaRitmo(painel, 'tempo', ctx()).arte.barras![0].valor).toBe(20)
    expect(pecaRitmo(painel, 'tempo', ctx()).arte.legenda).toBe('dias estudando nos últimos 7 dias')
  })

  it('nome do baralho do filtro só quando a pessoa deixa', () => {
    expect(pecaAcertos(painel, ctx({ baralho: 'Cálculo' })).arte.titulo).toBe('Cálculo')
    const sem = pecaAcertos(painel, ctx({ baralho: 'Cálculo', comNome: false }))
    expect(sem.arte.titulo).toBeUndefined()
    expect(sem.texto).not.toContain('Cálculo')
  })

  it('acertos que subiram comemoram', () => {
    const p = pecaAcertos(painel, ctx())
    expect(p.arte).toMatchObject({ selo: 'Estou melhorando!', destaque: '82%', confete: true })
  })

  it('dominados sem nome não lista os baralhos', () => {
    const com = pecaDominio(painel, ctx())
    expect(com.arte.destaque).toBe('30')
    expect(com.arte.itens?.map((i) => i.nome)).toEqual(['Cálculo', 'Inglês'])
    const sem = pecaDominio(painel, ctx({ comNome: false }))
    expect(sem.arte.itens).toBeUndefined()
    expect(JSON.stringify(sem)).not.toContain('Cálculo')
    expect(sem.arte.linhas).toEqual(['+5 nos últimos 7 dias'])
  })

  it('temas e ofensiva', () => {
    expect(pecaTemas(painel, ctx()).arte.itens).toEqual([{ nome: 'Derivadas', valor: '80 · 75%', fracao: 1 }])
    const o = pecaOfensiva({ atual: 8, maior: 9, conquistas: 2 }, ctx({ periodo: 'tudo' }))
    expect(o.arte).toMatchObject({ destaque: '8', confete: true })
    expect(o.texto).toContain('8 dias seguidos')
  })
})
