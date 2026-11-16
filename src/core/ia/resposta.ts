// Lê a resposta da IA: extrai o JSON, ajusta temas e ids e valida cartão a cartão.
import { problemasDoCartao, novoIdCartao } from '../cartoes'
import type { Baralho, Cartao, Tema } from '../types'

export interface CartaoLido {
  cartao: Cartao
  /** Id que a IA deu (para o pedido de correção). */
  idIA: string
  erros: string[]
}

export interface RespostaLida {
  temasNovos: Tema[]
  cartoes: CartaoLido[]
}

/** Acha o JSON na resposta: dentro de ```json … ```, ou do primeiro { ao último }. */
export function extrairJson(texto: string): unknown {
  const t = texto.trim()
  if (!t) throw new Error('A resposta está vazia. Cole a resposta inteira do Gemini.')
  const blocos = [...t.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1].trim())
  const candidatos = blocos.length ? blocos : [t]
  for (const c of candidatos) {
    const ini = c.search(/[[{]/)
    const fim = Math.max(c.lastIndexOf('}'), c.lastIndexOf(']'))
    if (ini < 0 || fim <= ini) continue
    const bruto = c.slice(ini, fim + 1)
    for (const tentativa of [bruto, consertar(bruto)]) {
      try {
        return JSON.parse(tentativa)
      } catch {
        /* tenta a próxima */
      }
    }
  }
  throw new Error('Não encontrei um JSON válido na resposta. Copie a resposta inteira do Gemini (o bloco de código).')
}

/** Consertos comuns: vírgula sobrando, aspas tipográficas. */
function consertar(s: string): string {
  return s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'geral'

/**
 * Converte o JSON da IA em cartões do baralho de destino:
 * - temas: reaproveita os existentes (por id ou nome) e cria os novos;
 * - ids novos e únicos; `origem: "ia"`; fonte padrão quando faltar;
 * - cada cartão validado separadamente (um cartão ruim não derruba os outros).
 */
export function lerResposta(dados: unknown, destino: Pick<Baralho, 'id' | 'titulo' | 'versao' | 'temas'>, fontePadrao?: string): RespostaLida {
  const d = dados as { temas?: unknown; cartoes?: unknown; cards?: unknown } | unknown[]
  const lista = (Array.isArray(d) ? d : (d.cartoes ?? d.cards)) as unknown
  if (!Array.isArray(lista) || !lista.length) throw new Error('A resposta não tem uma lista "cartoes".')
  const temasIA = (!Array.isArray(d) && Array.isArray(d.temas) ? d.temas : []) as Partial<Tema>[]

  // Mapa de tema da IA → id final.
  const temas = [...destino.temas]
  const temasNovos: Tema[] = []
  const porChave = new Map<string, string>()
  for (const t of temas) {
    porChave.set(t.id, t.id)
    porChave.set(slug(t.nome), t.id)
  }
  const resolverTema = (id: string | undefined, nome?: string): string => {
    const chaves = [id, id && slug(id), nome && slug(nome)].filter(Boolean) as string[]
    for (const k of chaves) if (porChave.has(k)) return porChave.get(k)!
    const novo: Tema = { id: slug(id || nome || 'geral'), nome: (nome || id || 'Geral').trim() }
    let n = 2
    while (temas.some((t) => t.id === novo.id)) novo.id = `${slug(id || nome || 'geral')}-${n++}`
    temas.push(novo)
    temasNovos.push(novo)
    for (const k of chaves) porChave.set(k, novo.id)
    return novo.id
  }
  for (const t of temasIA) if (t?.id || t?.nome) resolverTema(t.id, t.nome)

  const baralhoTeste: Baralho = { ...destino, temas, cartoes: [] }
  const cartoes: CartaoLido[] = (lista as Record<string, unknown>[]).map((bruto, i) => {
    const idIA = String(bruto?.id ?? `#${i + 1}`)
    const tema = resolverTema(typeof bruto?.tema === 'string' ? bruto.tema : undefined)
    const c = {
      ...bruto,
      id: novoIdCartao('ia'),
      tema,
      origem: 'ia',
      fonte: bruto?.fonte ?? (fontePadrao ? { apostila: fontePadrao } : undefined),
    } as Cartao
    if (c.tipo === 'vf' && typeof c.resposta === 'string') c.resposta = (c.resposta as string).toLowerCase() === 'true'
    baralhoTeste.temas = temas
    return { cartao: c, idIA, erros: problemasDoCartao(baralhoTeste, c) }
  })
  return { temasNovos, cartoes }
}
