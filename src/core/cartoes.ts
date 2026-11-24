import { salvar } from './baralhos'
import { db } from './db'
import type { Baralho, Cartao, CartaoConceito, Tema } from './types'
import { validar } from './validar'

export const novoIdCartao = (prefixo = 'm') => `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Problemas de um cartão isolado, em português (vazio = ok). */
export function problemasDoCartao(b: Baralho, c: Cartao): string[] {
  return validar({ ...b, cartoes: [c] }, 20).map((m) => m.replace(/^[^:]+: /, ''))
}

/**
 * Lê a versão gravada do baralho e aplica a mudança nela, numa transação. As telas guardam uma
 * cópia do baralho que pode estar velha (ex.: corrigiu um cartão na sessão e foi criar mais com IA);
 * gravar a partir dessa cópia desfaria as edições feitas no meio do caminho.
 */
async function mudarCartoes(b: Baralho, mudar: (atual: Baralho) => Baralho): Promise<Baralho> {
  return db.transaction('rw', db.baralhos, async () => {
    const atual = (await db.baralhos.get(b.id)) ?? b
    return salvar(mudar(atual))
  })
}

/**
 * Insere ou substitui um cartão. Um cartão existente é marcado como `editado`,
 * para que atualizações importadas não apaguem a edição dela.
 */
export async function gravarCartao(b: Baralho, c: Cartao): Promise<Baralho> {
  const agora = Date.now()
  return mudarCartoes(b, (atual) => {
    const i = atual.cartoes.findIndex((x) => x.id === c.id)
    const cartoes = [...atual.cartoes]
    // Arquivar não é conteúdo: editar um cartão arquivado o mantém arquivado.
    const arquivadoEm = i >= 0 ? atual.cartoes[i].arquivadoEm : undefined
    if (i >= 0) cartoes[i] = { ...c, editado: true, atualizadoEm: agora, ...(arquivadoEm && { arquivadoEm }) }
    else cartoes.push({ ...c, origem: c.origem ?? 'manual', atualizadoEm: agora })
    return { ...atual, cartoes }
  })
}

/** Acrescenta cartões (e os temas que ainda não existem) à versão gravada do baralho. */
export async function adicionarCartoes(b: Baralho, novos: Cartao[], temasNovos: Tema[] = []): Promise<Baralho> {
  const agora = Date.now()
  return mudarCartoes(b, (atual) => {
    const ids = new Set(atual.cartoes.map((c) => c.id))
    const temas = [...atual.temas, ...temasNovos.filter((t) => !atual.temas.some((x) => x.id === t.id))]
    const cartoes = [...atual.cartoes, ...novos.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, atualizadoEm: agora }))]
    return { ...atual, temas, cartoes }
  })
}

/** Remove um cartão; devolve o baralho novo e a posição, para permitir desfazer. */
export async function excluirCartao(b: Baralho, id: string): Promise<{ baralho: Baralho; cartao?: Cartao; pos: number }> {
  let pos = -1
  let cartao: Cartao | undefined
  const baralho = await mudarCartoes(b, (atual) => {
    pos = atual.cartoes.findIndex((c) => c.id === id)
    cartao = atual.cartoes[pos]
    return { ...atual, cartoes: atual.cartoes.filter((c) => c.id !== id) }
  })
  return { baralho, cartao, pos }
}

/** Cartões que entram no estudo e nas contagens (os arquivados ficam de fora). */
export const ativos = (b: Baralho): Cartao[] => b.cartoes.filter((c) => !c.arquivadoEm)

export const arquivados = (b: Baralho): Cartao[] => b.cartoes.filter((c) => c.arquivadoEm)

/** Arquiva ou desarquiva um cartão. Não conta como edição: atualizações importadas continuam valendo. */
async function marcarArquivado(b: Baralho, id: string, arquivadoEm: number | undefined): Promise<Baralho> {
  return mudarCartoes(b, (atual) => ({ ...atual, cartoes: atual.cartoes.map((c) => (c.id === id ? { ...c, arquivadoEm } : c)) }))
}

export const arquivarCartao = (b: Baralho, id: string) => marcarArquivado(b, id, Date.now())

export const desarquivarCartao = (b: Baralho, id: string) => marcarArquivado(b, id, undefined)

export async function reinserirCartao(b: Baralho, c: Cartao, pos: number): Promise<Baralho> {
  return mudarCartoes(b, (atual) => {
    const cartoes = atual.cartoes.filter((x) => x.id !== c.id)
    cartoes.splice(pos < 0 ? cartoes.length : Math.min(pos, cartoes.length), 0, c)
    return { ...atual, cartoes }
  })
}

// ---------- Colar lista ----------

export interface LinhaLida {
  linha: number
  texto: string
  cartao?: CartaoConceito
  erro?: string
}

// Ordem de preferência: tab, travessão, meia-risca, ponto e vírgula, hífen com espaços.
const SEPARADORES = ['\t', ' — ', '—', ' – ', ';', ' - ']

/** Lê "Pergunta — Resposta" (uma por linha) e devolve cartões de conceito. */
export function lerLista(texto: string, tema: string): LinhaLida[] {
  const out: LinhaLida[] = []
  texto.split(/\r?\n/).forEach((bruta, i) => {
    const t = bruta.trim().replace(/^[-•*]\s+|^\d+[.)]\s+/, '') // tira marcadores de lista
    if (!t) return
    const sep = SEPARADORES.find((s) => t.includes(s))
    if (!sep) {
      out.push({ linha: i + 1, texto: t, erro: 'Falta separar pergunta e resposta (use — ou ; ou tab)' })
      return
    }
    const k = t.indexOf(sep)
    const frente = t.slice(0, k).trim()
    const verso = t.slice(k + sep.length).trim()
    if (!frente || !verso) {
      out.push({ linha: i + 1, texto: t, erro: frente ? 'Resposta vazia' : 'Pergunta vazia' })
      return
    }
    out.push({ linha: i + 1, texto: t, cartao: { id: novoIdCartao('l'), tipo: 'conceito', tema, frente, verso, origem: 'manual' } })
  })
  return out
}
