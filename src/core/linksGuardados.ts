// Um link por baralho (ou cartão, ou desafio): o aparelho guarda o link que já criou e o reaproveita,
// em vez de criar um novo a cada vez que a folha Enviar abre. Mudou o conteúdo: atualiza o mesmo link.
// Perto de vencer: renova. Venceu ou o worker não o conhece: cria outro. Baralho apagado: apaga no worker.
import { apagarLink, atualizarLink, criarLink, urlDoApp, type Validade } from './link'

const CHAVE = 'tatino-links-enviados'
const DIA = 24 * 60 * 60 * 1000
/** Renova quando faltam menos que isto para vencer. */
export const RENOVAR_ANTES = 15 * DIA

export interface Guardado {
  codigo: string
  chave: string
  /** SHA-256 do conteúdo enviado. */
  hash: string
  /** Vencimento, em ms. */
  vence: number
  /** Baralho de onde o link saiu (para apagar quando o baralho some). */
  baralho: string
}

/** Como o link saiu: vai no evento `enviar`. */
export type ComoLink = 'novo' | 'reaproveitado' | 'atualizado' | 'renovado'

function ler(): Record<string, Guardado> {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as unknown
    return d && typeof d === 'object' ? (d as Record<string, Guardado>) : {}
  } catch {
    return {}
  }
}

function gravar(m: Record<string, Guardado>): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(m))
  } catch {
    /* sem espaço: só perde o reaproveitamento */
  }
}

export async function hashDoTexto(texto: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * O link para este conteúdo. `id` diz qual é a variante (baralho, baralho com progresso, cartão, desafio);
 * `baralho` é o id do baralho de onde ela sai.
 */
export async function linkPara(id: string, baralho: string, texto: string, validade: Validade = '30d', f: typeof fetch = fetch, agora = Date.now()): Promise<{ url: string; codigo: string; como: ComoLink }> {
  const hash = await hashDoTexto(texto)
  const g = ler()[id]
  const salvar = (codigo: string, chave: string, vence: number) => gravar({ ...ler(), [id]: { codigo, chave, hash, vence, baralho } })
  if (g && g.vence > agora + 60_000) {
    if (g.hash === hash && g.vence - agora > RENOVAR_ANTES) return { url: urlDoApp(g.codigo), codigo: g.codigo, como: 'reaproveitado' }
    const vence = await atualizarLink(g.codigo, g.chave, g.hash === hash ? '' : texto, f, validade)
    if (vence) {
      salvar(g.codigo, g.chave, vence.getTime())
      return { url: urlDoApp(g.codigo), codigo: g.codigo, como: g.hash === hash ? 'renovado' : 'atualizado' }
    }
  }
  const l = await criarLink(texto, f, validade)
  salvar(l.codigo, l.chave, l.expiraEm.getTime())
  return { url: l.url, codigo: l.codigo, como: 'novo' }
}

/**
 * Apaga no worker os links de baralhos que não existem mais (e os já vencidos, só daqui).
 * Roda ao abrir o app, e não na hora de excluir, para o "Desfazer" da exclusão continuar valendo.
 */
export async function limparLinks(baralhosQueExistem: Iterable<string>, f: typeof fetch = fetch, agora = Date.now()): Promise<number> {
  const existem = new Set(baralhosQueExistem)
  const m = ler()
  const fora = Object.entries(m).filter(([, g]) => !existem.has(g.baralho) || g.vence <= agora)
  if (!fora.length) return 0
  for (const [id] of fora) delete m[id]
  gravar(m)
  await Promise.all(fora.filter(([, g]) => g.vence > agora).map(([, g]) => apagarLink(g.codigo, g.chave, f)))
  return fora.length
}
