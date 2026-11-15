import { salvar } from './baralhos'
import type { Baralho, Cartao, CartaoConceito } from './types'
import { validar } from './validar'

export const novoIdCartao = (prefixo = 'm') => `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Problemas de um cartão isolado, em português (vazio = ok). */
export function problemasDoCartao(b: Baralho, c: Cartao): string[] {
  return validar({ ...b, cartoes: [c] }, 20).map((m) => m.replace(/^[^:]+: /, ''))
}

/**
 * Insere ou substitui um cartão. Um cartão existente é marcado como `editado`,
 * para que atualizações importadas não apaguem a edição dela.
 */
export async function gravarCartao(b: Baralho, c: Cartao): Promise<Baralho> {
  const agora = Date.now()
  const i = b.cartoes.findIndex((x) => x.id === c.id)
  const cartoes = [...b.cartoes]
  if (i >= 0) cartoes[i] = { ...c, editado: true, atualizadoEm: agora }
  else cartoes.push({ ...c, origem: c.origem ?? 'manual', atualizadoEm: agora })
  return salvar({ ...b, cartoes })
}

export async function adicionarCartoes(b: Baralho, novos: Cartao[]): Promise<Baralho> {
  const agora = Date.now()
  return salvar({ ...b, cartoes: [...b.cartoes, ...novos.map((c) => ({ ...c, atualizadoEm: agora }))] })
}

/** Remove um cartão; devolve o baralho novo e a posição, para permitir desfazer. */
export async function excluirCartao(b: Baralho, id: string): Promise<{ baralho: Baralho; cartao?: Cartao; pos: number }> {
  const pos = b.cartoes.findIndex((c) => c.id === id)
  const cartao = b.cartoes[pos]
  const baralho = await salvar({ ...b, cartoes: b.cartoes.filter((c) => c.id !== id) })
  return { baralho, cartao, pos }
}

export async function reinserirCartao(b: Baralho, c: Cartao, pos: number): Promise<Baralho> {
  const cartoes = [...b.cartoes]
  cartoes.splice(Math.min(pos, cartoes.length), 0, c)
  return salvar({ ...b, cartoes })
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
