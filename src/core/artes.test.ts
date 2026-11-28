import { describe, expect, it } from 'vitest'
import { LAYOUTS_FIM, pecaFimSessao, pecaResultado, pecaSemana, quebrar, textoSimples } from './artes'

const URL = 'https://app.example/filidilo/'

describe('artes', () => {
  it('resultado: porcentagem, sequência e nome só quando pode', () => {
    const p = pecaResultado({ certos: 8, errados: 2, chutes: 0, baralho: 'Derivadas', comNome: true, sequencia: 4, urlApp: URL, bateuMeta: true })
    expect(p.arte).toMatchObject({ selo: 'Meta atingida!', destaque: '80%', titulo: 'Derivadas', confete: true })
    expect(p.texto).toBe(`Fiz 8 acertos (80%) em “Derivadas” no Filidilo. 4 dias seguidos. Aprenda qualquer coisa: ${URL}`)
    const sem = pecaResultado({ certos: 1, errados: 3, chutes: 0, baralho: 'Derivadas', comNome: false, sequencia: 1, urlApp: URL })
    expect(sem.arte.titulo).toBeUndefined()
    expect(sem.texto).not.toContain('Derivadas')
    expect(sem.texto).not.toContain('dias seguidos')
    expect(sem.arte.confete).toBe(false)
  })

  it('fim de sessão: três layouts claros com placar, ofensiva e conquista', () => {
    expect(LAYOUTS_FIM.map((l) => l.layout)).toEqual(['tela', 'conquista', 'painel'])
    const marco = { id: 'dominado:m', tipo: 'dominado' as const, destaque: '42', legenda: 'cartões dominados', frase: 'Dominei todos os 42 cartões de “Motivação”' }
    const d = { certos: 15, errados: 4, chutes: 0, baralho: 'Motivação', comNome: false, sequencia: 1, urlApp: URL, marco }
    for (const { layout } of LAYOUTS_FIM) {
      const p = pecaFimSessao(d, layout)
      expect(p.arte.fim).toMatchObject({ layout, titulo: 'Sessão concluída', placar: '15 acertos, 4 erros em 19 respostas', pct: 79, dias: 1, conquista: { destaque: '42', legenda: 'cartões dominados' } })
      expect(p.arte.fim?.baralho).toBeUndefined()
      expect(p.arte.confete).toBe(true)
      expect(p.texto).toBe(`Dominei todos os 42 cartões de um baralho no Filidilo. Aprenda qualquer coisa: ${URL}`)
    }
    const sem = pecaFimSessao({ ...d, marco: undefined, comNome: true, chutes: 1, bateuMeta: true }, 'painel')
    expect(sem.arte.fim).toMatchObject({ titulo: 'Meta atingida!', baralho: 'Motivação', placar: '15 acertos, 4 erros e 1 chute em 20 respostas' })
    expect(sem.arte.fim?.conquista).toBeUndefined()
    expect(sem.texto).toContain('“Motivação”')
  })

  it('semana', () => {
    const p = pecaSemana({ dias: [], diasEstudados: 5, respostas: 40, acertos: 30, baralhos: ['a', 'b'] }, { urlApp: URL, sequencia: 3 })
    expect(p.arte.destaque).toBe('5 de 7')
    expect(p.texto).toContain('estudei 5 dias de 7 e respondi 40 cartões (75% de acerto)')
  })

  it('texto simples tira LaTeX e Markdown', () => {
    expect(textoSimples('**Qual** é $\\frac{a}{b}$?')).toBe('Qual é (a)/(b)?')
    expect(textoSimples('Derivada de $\\sin x$ e $\\sqrt{\\pi}$')).toBe('Derivada de sin x e √π')
    expect(textoSimples('A Terra gira em torno do ____.')).toBe('A Terra gira em torno do ____.')
  })

  it('quebra linhas pela largura e corta com reticências', () => {
    const medir = (s: string) => s.length
    expect(quebrar('um dois tres quatro', 8, medir)).toEqual(['um dois', 'tres', 'quatro'])
    expect(quebrar('um dois tres quatro', 8, medir, 2)).toEqual(['um dois', 'tres…'])
  })
})
