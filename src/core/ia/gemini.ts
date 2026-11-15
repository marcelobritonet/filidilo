// Cliente mínimo da API do Gemini, chamado direto do navegador.
// A chave é da estudante (Google AI Studio, plano gratuito) e fica só neste aparelho:
// localStorage, fora do backup, nunca no repositório nem em logs.

const API = 'https://generativelanguage.googleapis.com/v1beta'
const CHAVE_LOCAL = 'tatino-gemini'
/** Apelido estável que o Google mantém apontando para o Flash mais recente. */
export const MODELO_PADRAO = 'gemini-flash-latest'
/** Limite do envio "inline" (o pedido inteiro tem de caber em ~20 MB; base64 aumenta ~33%). */
export const LIMITE_PDF_BYTES = 14 * 1024 * 1024

export interface ConfigGemini {
  chave: string
  modelo: string
}

export type TipoErroGemini = 'chave' | 'cota' | 'rede' | 'tamanho' | 'bloqueado' | 'outro'

export class ErroGemini extends Error {
  constructor(
    public tipo: TipoErroGemini,
    mensagem: string,
  ) {
    super(mensagem)
  }
}

export function lerConfig(): ConfigGemini | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? 'null') as ConfigGemini | null
    return c?.chave ? { chave: c.chave, modelo: c.modelo || MODELO_PADRAO } : null
  } catch {
    return null
  }
}

export function salvarConfig(c: ConfigGemini) {
  localStorage.setItem(CHAVE_LOCAL, JSON.stringify(c))
}

export function removerConfig() {
  localStorage.removeItem(CHAVE_LOCAL)
}

/** "AIza…abcd" para mostrar na tela sem expor a chave inteira. */
export const mascarar = (chave: string) => (chave.length > 10 ? `${chave.slice(0, 4)}…${chave.slice(-4)}` : '••••')

async function chamar(url: string, chave: string, init?: RequestInit): Promise<unknown> {
  let r: Response
  try {
    r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', 'x-goog-api-key': chave, ...(init?.headers ?? {}) } })
  } catch {
    throw new ErroGemini('rede', 'Sem conexão com o Gemini. Confira a internet e tente de novo.')
  }
  const corpo = (await r.json().catch(() => ({}))) as { error?: { message?: string; status?: string } }
  if (r.ok) return corpo
  const msg = corpo.error?.message ?? ''
  if (r.status === 429 || corpo.error?.status === 'RESOURCE_EXHAUSTED')
    throw new ErroGemini('cota', 'A cota gratuita do Gemini acabou por agora. Tente mais tarde ou use o modo copiar e colar.')
  if (r.status === 400 && /api key|API_KEY/i.test(msg)) throw new ErroGemini('chave', 'A chave do Gemini não é válida. Confira em Configurar Gemini.')
  if (r.status === 401 || r.status === 403) throw new ErroGemini('chave', 'A chave do Gemini foi recusada. Confira em Configurar Gemini.')
  if (r.status === 413 || /too large|exceeds/i.test(msg)) throw new ErroGemini('tamanho', 'O PDF é grande demais para enviar direto. Escolha menos páginas ou use o modo copiar e colar.')
  throw new ErroGemini('outro', `O Gemini respondeu com erro (${r.status}). ${msg}`.trim())
}

interface Modelo {
  name: string
  supportedGenerationMethods?: string[]
}

/** Escolhe o melhor modelo "Flash" disponível para a chave (rápido e no plano gratuito). */
export function escolherModelo(nomes: string[]): string {
  const limpos = nomes.map((n) => n.replace(/^models\//, ''))
  if (limpos.includes(MODELO_PADRAO)) return MODELO_PADRAO
  const flash = limpos
    .filter((n) => /^gemini-[\d.]+-flash$/.test(n) || /^gemini-[\d.]+-flash-\d{3}$/.test(n))
    .sort((a, z) => parseFloat(z.split('-')[1]) - parseFloat(a.split('-')[1]))
  return flash[0] ?? limpos.find((n) => n.includes('flash')) ?? MODELO_PADRAO
}

/** Confere a chave listando os modelos; devolve o modelo escolhido. */
export async function testarChave(chave: string): Promise<string> {
  const d = (await chamar(`${API}/models?pageSize=200`, chave)) as { models?: Modelo[] }
  const nomes = (d.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name)
  if (!nomes.length) throw new ErroGemini('chave', 'A chave funciona, mas não tem acesso a modelos de texto do Gemini.')
  return escolherModelo(nomes)
}

export interface Parte {
  text?: string
  inline_data?: { mime_type: string; data: string }
}
export interface Mensagem {
  role: 'user' | 'model'
  parts: Parte[]
}

/** Uma chamada ao Gemini; devolve o texto da resposta. */
export async function gerar(cfg: ConfigGemini, conversa: Mensagem[]): Promise<string> {
  const d = (await chamar(`${API}/models/${encodeURIComponent(cfg.modelo)}:generateContent`, cfg.chave, {
    method: 'POST',
    body: JSON.stringify({ contents: conversa, generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } }),
  })) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } }
  if (d.promptFeedback?.blockReason) throw new ErroGemini('bloqueado', 'O Gemini recusou o pedido. Tente com outro material.')
  const c = d.candidates?.[0]
  const texto = (c?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  if (!texto.trim()) {
    if (c?.finishReason === 'MAX_TOKENS') throw new ErroGemini('outro', 'A resposta ficou longa demais. Peça menos cartões.')
    throw new ErroGemini('outro', 'O Gemini não devolveu cartões. Tente de novo.')
  }
  return texto
}
