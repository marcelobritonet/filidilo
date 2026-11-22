import { describe, expect, it } from 'vitest'
import { pecaDesafio, pecaResultado, pecaSemana, podeDesafiar, quebrar, textoSimples } from './artes'

const URL = 'https://app.example/tatino/'

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

  it('desafio mostra a pergunta e nunca a resposta', () => {
    const p = pecaDesafio({ id: 'a', tipo: 'conceito', tema: 'g', frente: 'Derivada de $x^2$?', verso: '$2x$' }, { baralho: 'Cálculo', comNome: false, url: 'https://x/?b=1' })
    expect(p.arte.texto).toBe('Derivada de x^2?')
    expect(JSON.stringify(p)).not.toContain('2x')
    expect(p.arte.qr).toBe('https://x/?b=1')
    expect(p.texto).toContain('https://x/?b=1')
  })

  it('cálculo não vira desafio', () => {
    expect(podeDesafiar({ id: 'c', tipo: 'calculo', tema: 'g', titulo: 'T', enunciado: '', parametros: {}, etapas: [] })).toBe(false)
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
