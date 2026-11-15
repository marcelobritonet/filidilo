import { afterEach, describe, expect, it, vi } from 'vitest'
import { gerarDireto } from './direto'
import { ErroGemini, escolherModelo, gerar, mascarar, testarChave } from './gemini'

const cfg = { chave: 'AIzaTESTE1234', modelo: 'gemini-flash-latest' }
const destino = { id: 'fis', titulo: 'Física', versao: 1, temas: [{ id: 'g', nome: 'Geral' }] }

/** Simula o fetch com uma fila de respostas. */
function simular(respostas: { status?: number; corpo: unknown }[]) {
  const chamadas: { url: string; init?: RequestInit }[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init })
    const r = respostas.shift()!
    return new Response(JSON.stringify(r.corpo), { status: r.status ?? 200 })
  })
  return chamadas
}
const resposta = (obj: unknown) => ({ corpo: { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: 'STOP' }] } })

afterEach(() => vi.unstubAllGlobals())

describe('cliente do Gemini', () => {
  it('escolhe o modelo Flash', () => {
    expect(escolherModelo(['models/gemini-flash-latest', 'models/gemini-2.5-pro'])).toBe('gemini-flash-latest')
    expect(escolherModelo(['models/gemini-2.0-flash', 'models/gemini-2.5-flash', 'models/gemini-2.5-flash-lite', 'models/gemini-2.5-pro'])).toBe('gemini-2.5-flash')
    expect(escolherModelo([])).toBe('gemini-flash-latest')
  })
  it('mascara a chave', () => {
    expect(mascarar('AIzaSyABCDEFGH1234')).toBe('AIza…1234')
  })
  it('testa a chave listando modelos e manda a chave no cabeçalho, não na URL', async () => {
    const ch = simular([{ corpo: { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } }])
    expect(await testarChave(cfg.chave)).toBe('gemini-2.5-flash')
    expect(ch[0].url).not.toContain(cfg.chave)
    expect((ch[0].init!.headers as Record<string, string>)['x-goog-api-key']).toBe(cfg.chave)
  })
  it('traduz erros: chave inválida, cota, rede', async () => {
    simular([{ status: 400, corpo: { error: { message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } } }])
    await expect(gerar(cfg, [])).rejects.toMatchObject({ tipo: 'chave' })
    simular([{ status: 429, corpo: { error: { status: 'RESOURCE_EXHAUSTED' } } }])
    await expect(gerar(cfg, [])).rejects.toMatchObject({ tipo: 'cota' })
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('offline')
    })
    await expect(gerar(cfg, [])).rejects.toBeInstanceOf(ErroGemini)
  })
})

describe('gerar direto', () => {
  const bom = { id: 'c1', tipo: 'conceito', tema: 'g', frente: 'O que é força?', verso: 'Interação.' }
  const ruim = { id: 'c2', tipo: 'associacao', tema: 'g', frente: 'Unidade de força?', opcoes: ['N', 'J'], correta: 7 }

  it('envia instrução e PDF; sem erros, uma chamada só', async () => {
    const ch = simular([resposta({ cartoes: [bom] })])
    const r = await gerarDireto(cfg, { instrucao: 'faça', pdf: { base64: 'JVBERi0=', mime: 'application/pdf' }, destino, fontePadrao: 'Aula.pdf' })
    expect(ch).toHaveLength(1)
    const corpo = JSON.parse(String(ch[0].init!.body))
    expect(corpo.contents[0].parts[1].inline_data).toEqual({ mime_type: 'application/pdf', data: 'JVBERi0=' })
    expect(corpo.generationConfig.responseMimeType).toBe('application/json')
    expect(r.cartoes).toHaveLength(1)
    expect(r.corrigidos).toBe(0)
  })

  it('com erro, pede correção uma vez mantendo a conversa e junta os corrigidos', async () => {
    const ch = simular([resposta({ cartoes: [bom, ruim] }), resposta({ cartoes: [{ ...ruim, correta: 0 }] })])
    const etapas: string[] = []
    const r = await gerarDireto(cfg, { instrucao: 'faça', destino, andamento: (e) => etapas.push(e) })
    expect(ch).toHaveLength(2)
    const conversa = JSON.parse(String(ch[1].init!.body)).contents
    expect(conversa.map((m: { role: string }) => m.role)).toEqual(['user', 'model', 'user'])
    expect(conversa[2].parts[0].text).toContain('Cartão "c2"')
    expect(r.cartoes.map((c) => c.erros.length)).toEqual([0, 0])
    expect(r.corrigidos).toBe(1)
    expect(etapas).toEqual(['gerando', 'corrigindo'])
  })

  it('se a correção falhar, fica com os bons da primeira resposta', async () => {
    simular([resposta({ cartoes: [bom, ruim] }), { status: 429, corpo: {} }])
    const r = await gerarDireto(cfg, { instrucao: 'faça', destino })
    expect(r.cartoes.filter((c) => !c.erros.length)).toHaveLength(1)
  })
})
